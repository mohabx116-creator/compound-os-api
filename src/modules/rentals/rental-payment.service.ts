import {
  PaymentProvider,
  Prisma,
  RentalListingStatus,
  RentalPaymentStatus,
  RentalReservationStatus,
} from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { prisma } from '../../config/prisma.js';
import { addHours, RENTAL_POLICY } from './rental-policy.js';
import { PaymobService } from './paymob.service.js';
import type { PaymobWebhookInput } from './rental.types.js';

const activeReservationStatuses = [
  RentalReservationStatus.PAYMENT_LOCKED,
  RentalReservationStatus.PAID_PENDING_CONFIRMATION,
  RentalReservationStatus.RESERVED,
];

export class RentalPaymentService {
  static async handlePaymobWebhook(input: PaymobWebhookInput) {
    const isVerified = PaymobService.verifyWebhookSignature({
      payload: input.body,
      query: input.query,
      rawBody: input.rawBody,
    });

    if (!isVerified) {
      throw new AppError(
        'Invalid payment webhook signature',
        400,
        ErrorCodes.PAYMENT_WEBHOOK_INVALID,
      );
    }

    const normalized = PaymobService.normalizeWebhookPayload(input.body);

    if (!normalized.providerOrderId && !normalized.providerTransactionId) {
      throw new AppError(
        'Payment webhook is missing provider identifiers',
        400,
        ErrorCodes.PAYMENT_WEBHOOK_INVALID,
      );
    }

    return prisma.$transaction(async (tx) => {
      const identifierClauses: Prisma.RentalPaymentWhereInput[] = [];

      if (normalized.providerTransactionId) {
        identifierClauses.push({ providerTransactionId: normalized.providerTransactionId });
      }

      if (normalized.providerOrderId) {
        identifierClauses.push({ providerOrderId: normalized.providerOrderId });
      }

      const payment = await tx.rentalPayment.findFirst({
        where: {
          provider: PaymentProvider.PAYMOB,
          OR: identifierClauses,
        },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404, ErrorCodes.PAYMENT_NOT_FOUND);
      }

      if (payment.status === RentalPaymentStatus.PAID) {
        return {
          payment,
          idempotent: true,
        };
      }

      if (normalized.success) {
        const paidPayment = await tx.rentalPayment.update({
          where: { id: payment.id },
          data: {
            status: RentalPaymentStatus.PAID,
            providerOrderId: normalized.providerOrderId ?? payment.providerOrderId,
            providerTransactionId:
              normalized.providerTransactionId ?? payment.providerTransactionId,
            rawProviderPayload: normalized.raw,
            paidAt: new Date(),
          },
        });

        await this.applySuccessfulPaymentSideEffects(tx, paidPayment.id);

        return {
          payment: paidPayment,
          idempotent: false,
        };
      }

      if (normalized.failed) {
        const failedPayment = await tx.rentalPayment.update({
          where: { id: payment.id },
          data: {
            status: RentalPaymentStatus.FAILED,
            providerOrderId: normalized.providerOrderId ?? payment.providerOrderId,
            providerTransactionId:
              normalized.providerTransactionId ?? payment.providerTransactionId,
            rawProviderPayload: normalized.raw,
            failedAt: new Date(),
          },
        });

        await this.applyFailedPaymentSideEffects(tx, failedPayment.id);

        return {
          payment: failedPayment,
          idempotent: false,
        };
      }

      const pendingPayment = await tx.rentalPayment.update({
        where: { id: payment.id },
        data: {
          status: RentalPaymentStatus.PENDING,
          providerOrderId: normalized.providerOrderId ?? payment.providerOrderId,
          providerTransactionId:
            normalized.providerTransactionId ?? payment.providerTransactionId,
          rawProviderPayload: normalized.raw,
        },
      });

      return {
        payment: pendingPayment,
        idempotent: false,
      };
    });
  }

  static async expireStaleReservationLocks(now = new Date()) {
    return prisma.$transaction(async (tx) => {
      const staleReservations = await tx.rentalReservation.findMany({
        where: {
          status: { in: activeReservationStatuses },
          reservedUntil: { lt: now },
        },
        select: {
          id: true,
          listingId: true,
        },
      });

      if (staleReservations.length === 0) {
        return { expiredReservations: 0, releasedListings: 0 };
      }

      const reservationIds = staleReservations.map((reservation) => reservation.id);
      const listingIds = [...new Set(staleReservations.map((reservation) => reservation.listingId))];

      const expiredReservations = await tx.rentalReservation.updateMany({
        where: { id: { in: reservationIds } },
        data: {
          status: RentalReservationStatus.EXPIRED,
          expiredAt: now,
        },
      });

      const releasedListings = await tx.rentalListing.updateMany({
        where: {
          id: { in: listingIds },
          status: { in: [RentalListingStatus.PAYMENT_LOCKED, RentalListingStatus.RESERVED] },
        },
        data: {
          status: RentalListingStatus.ACTIVE,
          reservedUntil: null,
        },
      });

      return {
        expiredReservations: expiredReservations.count,
        releasedListings: releasedListings.count,
      };
    });
  }

  private static async applySuccessfulPaymentSideEffects(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ) {
    const payment = await tx.rentalPayment.findUniqueOrThrow({
      where: { id: paymentId },
    });

    if (payment.contactUnlockId) {
      await tx.rentalContactUnlock.update({
        where: { id: payment.contactUnlockId },
        data: {
          paymentId: payment.id,
          status: RentalPaymentStatus.PAID,
          unlockedAt: new Date(),
        },
      });
    }

    if (payment.reservationId && payment.listingId) {
      const reservedUntil = addHours(new Date(), RENTAL_POLICY.reservationHoldHours);

      await tx.rentalReservation.update({
        where: { id: payment.reservationId },
        data: {
          paymentId: payment.id,
          status: RentalReservationStatus.RESERVED,
          reservedUntil,
        },
      });

      await tx.rentalListing.update({
        where: { id: payment.listingId },
        data: {
          status: RentalListingStatus.RESERVED,
          reservedUntil,
        },
      });
    }
  }

  private static async applyFailedPaymentSideEffects(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ) {
    const payment = await tx.rentalPayment.findUniqueOrThrow({
      where: { id: paymentId },
    });

    if (payment.contactUnlockId) {
      await tx.rentalContactUnlock.update({
        where: { id: payment.contactUnlockId },
        data: {
          paymentId: payment.id,
          status: RentalPaymentStatus.FAILED,
        },
      });
    }

    if (payment.reservationId && payment.listingId) {
      await tx.rentalReservation.update({
        where: { id: payment.reservationId },
        data: {
          paymentId: payment.id,
          status: RentalReservationStatus.EXPIRED,
          expiredAt: new Date(),
        },
      });

      await tx.rentalListing.updateMany({
        where: {
          id: payment.listingId,
          status: RentalListingStatus.PAYMENT_LOCKED,
        },
        data: {
          status: RentalListingStatus.ACTIVE,
          reservedUntil: null,
        },
      });
    }
  }
}
