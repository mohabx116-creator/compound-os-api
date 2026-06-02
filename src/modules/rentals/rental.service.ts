import {
  PaymentProvider,
  Prisma,
  RentalListingStatus,
  RentalPaymentPurpose,
  RentalPaymentStatus,
  RentalReservationStatus,
} from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import { PaymobService } from './paymob.service.js';
import {
  addDays,
  addMinutes,
  RENTAL_POLICY,
} from './rental-policy.js';
import type {
  AdminCreateListingInput,
  AdminRentalListQuery,
  AdminUpdateListingInput,
  ContactAccessQuery,
  RentalIdParams,
  RentalListQuery,
  RentalSlugParams,
  TenantPaymentRequestInput,
} from './rental.types.js';

const publicListingSelect = {
  id: true,
  compoundId: true,
  unitId: true,
  title: true,
  slug: true,
  description: true,
  listingType: true,
  furnishingStatus: true,
  bedrooms: true,
  bathrooms: true,
  areaSqm: true,
  floor: true,
  monthlyRent: true,
  depositAmount: true,
  contactUnlockFee: true,
  reservationFee: true,
  status: true,
  addressText: true,
  locationText: true,
  isFeatured: true,
  publishedAt: true,
  expiresAt: true,
  reservedUntil: true,
  createdAt: true,
  images: {
    select: {
      id: true,
      url: true,
      altText: true,
      sortOrder: true,
      isCover: true,
    },
    orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      logoUrl: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      unitType: true,
      floor: true,
      areaSqm: true,
    },
  },
} satisfies Prisma.RentalListingSelect;

const adminListingInclude = {
  owner: true,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  unit: true,
  images: {
    orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
  payments: {
    orderBy: { createdAt: 'desc' },
  },
  reservations: {
    orderBy: { createdAt: 'desc' },
  },
  inquiries: {
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.RentalListingInclude;

const activeReservationStatuses: RentalReservationStatus[] = [
  RentalReservationStatus.PAYMENT_LOCKED,
  RentalReservationStatus.PAID_PENDING_CONFIRMATION,
  RentalReservationStatus.RESERVED,
];

const nonPublishableStatuses: RentalListingStatus[] = [
  RentalListingStatus.RENTED,
  RentalListingStatus.RESERVED,
  RentalListingStatus.PAYMENT_LOCKED,
];

const confirmableReservationStatuses: RentalReservationStatus[] = [
  RentalReservationStatus.RESERVED,
  RentalReservationStatus.PAID_PENDING_CONFIRMATION,
];

export class RentalService {
  static async listPublicListings(query: RentalListQuery) {
    const now = new Date();
    const where = this.buildPublicListingWhere(query, now);

    const [totalCount, listings] = await prisma.$transaction([
      prisma.rentalListing.count({ where }),
      prisma.rentalListing.findMany({
        where,
        ...getPrismaPagination(query),
        select: publicListingSelect,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      listings,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getPublicListingBySlug(slug: RentalSlugParams['slug']) {
    const listing = await prisma.rentalListing.findFirst({
      where: {
        slug,
        status: RentalListingStatus.ACTIVE,
        isPublished: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: publicListingSelect,
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    return listing;
  }

  static async startContactUnlockPayment(
    listingId: RentalIdParams['id'],
    input: TenantPaymentRequestInput,
  ) {
    PaymobService.ensureConfigured();

    const tenantPhone = this.normalizePhone(input.tenantPhone);
    const listing = await this.getAvailableListingForPayment(listingId);

    const existingUnlock = await prisma.rentalContactUnlock.findUnique({
      where: {
        listingId_tenantPhone: {
          listingId,
          tenantPhone,
        },
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingUnlock?.status === RentalPaymentStatus.PAID) {
      return {
        alreadyUnlocked: true,
        contactUnlock: existingUnlock,
        payment: null,
        paymentUrl: null,
      };
    }

    const { unlock, payment } = await prisma.$transaction(async (tx) => {
      const contactUnlock =
        existingUnlock ??
        (await tx.rentalContactUnlock.create({
          data: {
            listingId: listing.id,
            compoundId: listing.compoundId,
            tenantName: input.tenantName,
            tenantPhone,
            tenantEmail: input.tenantEmail,
            amount: listing.contactUnlockFee,
            currency: RENTAL_POLICY.currency,
            status: RentalPaymentStatus.INITIATED,
          },
        }));

      const latestPayment = existingUnlock?.payments[0];

      if (latestPayment?.paymentUrl && latestPayment.status !== RentalPaymentStatus.FAILED) {
        return {
          unlock: contactUnlock,
          payment: latestPayment,
        };
      }

      const createdPayment = await tx.rentalPayment.create({
        data: {
          compoundId: listing.compoundId,
          listingId: listing.id,
          contactUnlockId: contactUnlock.id,
          purpose: RentalPaymentPurpose.TENANT_CONTACT_UNLOCK,
          provider: PaymentProvider.PAYMOB,
          amount: listing.contactUnlockFee,
          currency: RENTAL_POLICY.currency,
          status: RentalPaymentStatus.INITIATED,
          idempotencyKey: `contact-unlock:${listing.id}:${tenantPhone}:${Date.now()}`,
        },
      });

      await tx.rentalContactUnlock.update({
        where: { id: contactUnlock.id },
        data: {
          paymentId: createdPayment.id,
          status: RentalPaymentStatus.PENDING,
        },
      });

      return {
        unlock: contactUnlock,
        payment: createdPayment,
      };
    });

    if (payment.paymentUrl) {
      return {
        alreadyUnlocked: false,
        contactUnlock: unlock,
        payment,
        paymentUrl: payment.paymentUrl,
      };
    }

    const intent = await PaymobService.createPaymentIntent({
      paymentId: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      tenantName: input.tenantName,
      tenantPhone,
      tenantEmail: input.tenantEmail,
      description: `Contact unlock for ${listing.title}`,
    });

    const updatedPayment = await prisma.rentalPayment.update({
      where: { id: payment.id },
      data: {
        status: RentalPaymentStatus.PENDING,
        providerOrderId: intent.providerOrderId,
        paymentUrl: intent.paymentUrl,
        rawProviderPayload: intent.rawProviderPayload,
      },
    });

    return {
      alreadyUnlocked: false,
      contactUnlock: unlock,
      payment: updatedPayment,
      paymentUrl: updatedPayment.paymentUrl,
    };
  }

  static async getContactAccess(
    listingId: RentalIdParams['id'],
    query: ContactAccessQuery,
  ) {
    const tenantPhone = this.normalizePhone(query.tenantPhone);
    const listing = await prisma.rentalListing.findUnique({
      where: { id: listingId },
      include: { owner: true },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    const unlock = await prisma.rentalContactUnlock.findUnique({
      where: {
        listingId_tenantPhone: {
          listingId,
          tenantPhone,
        },
      },
    });

    if (!unlock || unlock.status !== RentalPaymentStatus.PAID) {
      return {
        unlocked: false,
        ownerContact: null,
      };
    }

    return {
      unlocked: true,
      ownerContact: {
        fullName: listing.owner.fullName,
        phone: listing.owner.phone,
        email: listing.owner.email,
      },
    };
  }

  static async startReservationPayment(
    listingId: RentalIdParams['id'],
    input: TenantPaymentRequestInput,
  ) {
    PaymobService.ensureConfigured();

    const tenantPhone = this.normalizePhone(input.tenantPhone);
    const now = new Date();
    const lockExpiresAt = addMinutes(now, RENTAL_POLICY.reservationPaymentLockMinutes);

    const { listing, reservation, payment } = await prisma.$transaction(async (tx) => {
      await this.expireListingReservationsInTransaction(tx, listingId, now);

      const listingForPayment = await tx.rentalListing.findFirst({
        where: {
          id: listingId,
          status: RentalListingStatus.ACTIVE,
          isPublished: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });

      if (!listingForPayment) {
        throw new AppError(
          'Rental listing is not available',
          409,
          ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
        );
      }

      const activeReservation = await tx.rentalReservation.findFirst({
        where: {
          listingId,
          status: { in: activeReservationStatuses },
          OR: [{ reservedUntil: null }, { reservedUntil: { gt: now } }],
        },
      });

      if (activeReservation) {
        throw new AppError(
          'Rental listing already has an active reservation',
          409,
          ErrorCodes.RENTAL_RESERVATION_CONFLICT,
        );
      }

      const lockResult = await tx.rentalListing.updateMany({
        where: {
          id: listingId,
          status: RentalListingStatus.ACTIVE,
          isPublished: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          status: RentalListingStatus.PAYMENT_LOCKED,
          reservedUntil: lockExpiresAt,
        },
      });

      if (lockResult.count !== 1) {
        throw new AppError(
          'Rental listing already has an active reservation',
          409,
          ErrorCodes.RENTAL_RESERVATION_CONFLICT,
        );
      }

      const createdReservation = await tx.rentalReservation.create({
        data: {
          listingId: listingForPayment.id,
          compoundId: listingForPayment.compoundId,
          tenantName: input.tenantName,
          tenantPhone,
          tenantEmail: input.tenantEmail,
          amount: listingForPayment.reservationFee,
          currency: RENTAL_POLICY.currency,
          status: RentalReservationStatus.PAYMENT_LOCKED,
          reservedUntil: lockExpiresAt,
        },
      });

      const createdPayment = await tx.rentalPayment.create({
        data: {
          compoundId: listingForPayment.compoundId,
          listingId: listingForPayment.id,
          reservationId: createdReservation.id,
          purpose: RentalPaymentPurpose.TENANT_RESERVATION_HOLD,
          provider: PaymentProvider.PAYMOB,
          amount: listingForPayment.reservationFee,
          currency: RENTAL_POLICY.currency,
          status: RentalPaymentStatus.INITIATED,
          idempotencyKey: `reservation-hold:${listingForPayment.id}:${createdReservation.id}`,
        },
      });

      await tx.rentalReservation.update({
        where: { id: createdReservation.id },
        data: { paymentId: createdPayment.id },
      });

      return {
        listing: listingForPayment,
        reservation: createdReservation,
        payment: createdPayment,
      };
    });

    try {
      const intent = await PaymobService.createPaymentIntent({
        paymentId: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        tenantName: input.tenantName,
        tenantPhone,
        tenantEmail: input.tenantEmail,
        description: `Reservation hold for ${listing.title}`,
      });

      const updatedPayment = await prisma.rentalPayment.update({
        where: { id: payment.id },
        data: {
          status: RentalPaymentStatus.PENDING,
          providerOrderId: intent.providerOrderId,
          paymentUrl: intent.paymentUrl,
          rawProviderPayload: intent.rawProviderPayload,
        },
      });

      return {
        reservation,
        payment: updatedPayment,
        paymentUrl: updatedPayment.paymentUrl,
      };
    } catch (error) {
      await this.releaseReservationPaymentLock(reservation.id, payment.id, listing.id);
      throw error;
    }
  }

  static async getReservationById(id: RentalIdParams['id']) {
    const reservation = await prisma.rentalReservation.findUnique({
      where: { id },
      select: {
        id: true,
        listingId: true,
        tenantName: true,
        tenantPhone: true,
        status: true,
        amount: true,
        currency: true,
        reservedUntil: true,
        confirmedAt: true,
        cancelledAt: true,
        expiredAt: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404, ErrorCodes.RESERVATION_NOT_FOUND);
    }

    return reservation;
  }

  static async listAdminListings(query: AdminRentalListQuery) {
    const where = this.buildAdminListingWhere(query);

    const [totalCount, listings] = await prisma.$transaction([
      prisma.rentalListing.count({ where }),
      prisma.rentalListing.findMany({
        where,
        ...getPrismaPagination(query),
        include: {
          owner: true,
          compound: { select: { id: true, name: true, code: true } },
          images: {
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
          _count: {
            select: {
              inquiries: true,
              reservations: true,
              contactUnlocks: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      listings,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminListingById(id: RentalIdParams['id']) {
    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      include: adminListingInclude,
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    return listing;
  }

  static async createAdminListing(input: AdminCreateListingInput) {
    await this.validateListingReferences(input.compoundId, input.ownerId, input.unitId);

    const slug = await this.createUniqueSlug(input.title);

    return prisma.rentalListing.create({
      data: {
        compoundId: input.compoundId,
        ownerId: input.ownerId,
        unitId: input.unitId,
        title: input.title,
        slug,
        description: input.description,
        listingType: input.listingType,
        furnishingStatus: input.furnishingStatus,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        areaSqm: input.areaSqm,
        floor: input.floor,
        monthlyRent: input.monthlyRent,
        depositAmount: input.depositAmount,
        contactUnlockFee: input.contactUnlockFee ?? RENTAL_POLICY.tenantContactUnlockFee,
        reservationFee: input.reservationFee ?? RENTAL_POLICY.reservationHoldFee,
        platformCommissionRate:
          input.platformCommissionRate ?? RENTAL_POLICY.platformCommissionRate,
        addressText: input.addressText,
        locationText: input.locationText,
        status: RentalListingStatus.PENDING_REVIEW,
        images: input.images?.length
          ? {
              create: input.images.map((image, index) => ({
                url: image.url,
                altText: image.altText,
                sortOrder: image.sortOrder ?? index,
                isCover: image.isCover ?? index === 0,
              })),
            }
          : undefined,
      },
      include: adminListingInclude,
    });
  }

  static async updateAdminListing(id: RentalIdParams['id'], input: AdminUpdateListingInput) {
    const existing = await this.getAdminListingById(id);

    if (input.ownerId || input.unitId !== undefined) {
      await this.validateListingReferences(
        existing.compoundId,
        input.ownerId ?? existing.ownerId,
        input.unitId ?? existing.unitId ?? undefined,
      );
    }

    return prisma.$transaction(async (tx) => {
      if (input.images) {
        await tx.rentalListingImage.deleteMany({ where: { listingId: id } });
      }

      return tx.rentalListing.update({
        where: { id },
        data: {
          ownerId: input.ownerId,
          unitId: input.unitId,
          title: input.title,
          description: input.description,
          listingType: input.listingType,
          furnishingStatus: input.furnishingStatus,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          areaSqm: input.areaSqm,
          floor: input.floor,
          monthlyRent: input.monthlyRent,
          depositAmount: input.depositAmount,
          contactUnlockFee: input.contactUnlockFee,
          reservationFee: input.reservationFee,
          platformCommissionRate: input.platformCommissionRate,
          addressText: input.addressText,
          locationText: input.locationText,
          images: input.images
            ? {
                create: input.images.map((image, index) => ({
                  url: image.url,
                  altText: image.altText,
                  sortOrder: image.sortOrder ?? index,
                  isCover: image.isCover ?? index === 0,
                })),
              }
            : undefined,
        },
        include: adminListingInclude,
      });
    });
  }

  static async publishAdminListing(id: RentalIdParams['id']) {
    const listing = await this.getAdminListingById(id);

    if (nonPublishableStatuses.includes(listing.status)) {
      throw new AppError(
        'Rental listing cannot be published in its current status',
        409,
        ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
      );
    }

    const now = new Date();

    return prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.ACTIVE,
        isPublished: true,
        publishedAt: now,
        expiresAt: addDays(now, RENTAL_POLICY.listingDurationDays),
      },
      include: adminListingInclude,
    });
  }

  static async unpublishAdminListing(id: RentalIdParams['id']) {
    await this.getAdminListingById(id);

    return prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.SUSPENDED,
        isPublished: false,
      },
      include: adminListingInclude,
    });
  }

  static async confirmReservation(id: RentalIdParams['id']) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.rentalReservation.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!reservation) {
        throw new AppError('Reservation not found', 404, ErrorCodes.RESERVATION_NOT_FOUND);
      }

      if (!confirmableReservationStatuses.includes(reservation.status)) {
        throw new AppError(
          'Reservation is not confirmable',
          409,
          ErrorCodes.RESERVATION_NOT_CONFIRMABLE,
        );
      }

      const now = new Date();
      const monthlyRent = Number(reservation.listing.monthlyRent);
      const commissionRate = Number(reservation.listing.platformCommissionRate);
      const commissionAmount = Number(((monthlyRent * commissionRate) / 100).toFixed(2));
      const ownerReceivable = Number((monthlyRent - commissionAmount).toFixed(2));

      const confirmedReservation = await tx.rentalReservation.update({
        where: { id },
        data: {
          status: RentalReservationStatus.CONFIRMED,
          confirmedAt: now,
        },
      });

      const listing = await tx.rentalListing.update({
        where: { id: reservation.listingId },
        data: {
          status: RentalListingStatus.RENTED,
          isPublished: false,
          rentedAt: now,
          reservedUntil: null,
        },
      });

      await tx.rentalPlatformLedgerEntry.createMany({
        data: [
          {
            compoundId: reservation.compoundId,
            listingId: reservation.listingId,
            reservationId: reservation.id,
            paymentId: reservation.paymentId,
            entryType: 'PLATFORM_COMMISSION',
            amount: commissionAmount,
            currency: RENTAL_POLICY.currency,
            description: 'Platform commission on confirmed rental',
          },
          {
            compoundId: reservation.compoundId,
            listingId: reservation.listingId,
            reservationId: reservation.id,
            paymentId: reservation.paymentId,
            entryType: 'OWNER_RECEIVABLE',
            amount: ownerReceivable,
            currency: RENTAL_POLICY.currency,
            description: 'Owner receivable before payout processing',
          },
        ],
      });

      return {
        reservation: confirmedReservation,
        listing,
      };
    });
  }

  static async cancelReservation(id: RentalIdParams['id']) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.rentalReservation.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!reservation) {
        throw new AppError('Reservation not found', 404, ErrorCodes.RESERVATION_NOT_FOUND);
      }

      const now = new Date();
      const cancelledReservation = await tx.rentalReservation.update({
        where: { id },
        data: {
          status: RentalReservationStatus.CANCELLED,
          cancelledAt: now,
        },
      });

      const listing =
        reservation.listing.status === RentalListingStatus.RENTED
          ? reservation.listing
          : await tx.rentalListing.update({
              where: { id: reservation.listingId },
              data: {
                status: RentalListingStatus.ACTIVE,
                reservedUntil: null,
              },
            });

      return {
        reservation: cancelledReservation,
        listing,
        refundPending: Boolean(reservation.paymentId),
      };
    });
  }

  private static buildPublicListingWhere(query: RentalListQuery, now: Date) {
    const where: Prisma.RentalListingWhereInput = {
      status: RentalListingStatus.ACTIVE,
      isPublished: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    this.applyListingFilters(where, query);

    return where;
  }

  private static buildAdminListingWhere(query: AdminRentalListQuery) {
    const where: Prisma.RentalListingWhereInput = {};

    this.applyListingFilters(where, query);

    if (query.status) {
      where.status = query.status;
    }

    if (query.ownerId) {
      where.ownerId = query.ownerId;
    }

    return where;
  }

  private static applyListingFilters(
    where: Prisma.RentalListingWhereInput,
    query: RentalListQuery,
  ) {
    if (query.search) {
      const searchFilter = [
        { title: { contains: query.search, mode: 'insensitive' as const } },
        { description: { contains: query.search, mode: 'insensitive' as const } },
        { addressText: { contains: query.search, mode: 'insensitive' as const } },
        { locationText: { contains: query.search, mode: 'insensitive' as const } },
      ];

      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: searchFilter }];
    }

    if (query.compoundId) where.compoundId = query.compoundId;
    if (query.listingType) where.listingType = query.listingType;
    if (query.bedrooms !== undefined) where.bedrooms = query.bedrooms;
    if (query.furnishingStatus) where.furnishingStatus = query.furnishingStatus;
    if (query.featured !== undefined) where.isFeatured = query.featured;

    if (query.minRent !== undefined || query.maxRent !== undefined) {
      where.monthlyRent = {
        ...(query.minRent !== undefined ? { gte: query.minRent } : {}),
        ...(query.maxRent !== undefined ? { lte: query.maxRent } : {}),
      };
    }
  }

  private static async getAvailableListingForPayment(id: string) {
    const listing = await prisma.rentalListing.findFirst({
      where: {
        id,
        status: RentalListingStatus.ACTIVE,
        isPublished: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing is not available',
        409,
        ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
      );
    }

    return listing;
  }

  private static async validateListingReferences(
    compoundId: string,
    ownerId: string,
    unitId?: string,
  ) {
    const [compound, owner, unit] = await Promise.all([
      prisma.compound.findUnique({ where: { id: compoundId } }),
      prisma.rentalOwner.findUnique({ where: { id: ownerId } }),
      unitId ? prisma.unit.findUnique({ where: { id: unitId } }) : Promise.resolve(null),
    ]);

    if (!compound) {
      throw new AppError('Compound not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (!owner || owner.compoundId !== compoundId) {
      throw new AppError('Rental owner not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (unitId && (!unit || unit.compoundId !== compoundId)) {
      throw new AppError('Unit not found for this compound', 404, ErrorCodes.NOT_FOUND);
    }
  }

  private static async createUniqueSlug(title: string) {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let suffix = 2;

    while (await prisma.rentalListing.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private static slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || `rental-listing-${Date.now()}`;
  }

  private static normalizePhone(phone: string) {
    return phone.trim();
  }

  private static async expireListingReservationsInTransaction(
    tx: Prisma.TransactionClient,
    listingId: string,
    now: Date,
  ) {
    await tx.rentalReservation.updateMany({
      where: {
        listingId,
        status: { in: activeReservationStatuses },
        reservedUntil: { lt: now },
      },
      data: {
        status: RentalReservationStatus.EXPIRED,
        expiredAt: now,
      },
    });

    await tx.rentalListing.updateMany({
      where: {
        id: listingId,
        status: { in: [RentalListingStatus.PAYMENT_LOCKED, RentalListingStatus.RESERVED] },
        reservedUntil: { lt: now },
      },
      data: {
        status: RentalListingStatus.ACTIVE,
        reservedUntil: null,
      },
    });
  }

  private static async releaseReservationPaymentLock(
    reservationId: string,
    paymentId: string,
    listingId: string,
  ) {
    await prisma.$transaction([
      prisma.rentalPayment.update({
        where: { id: paymentId },
        data: {
          status: RentalPaymentStatus.FAILED,
          failedAt: new Date(),
        },
      }),
      prisma.rentalReservation.update({
        where: { id: reservationId },
        data: {
          status: RentalReservationStatus.EXPIRED,
          expiredAt: new Date(),
        },
      }),
      prisma.rentalListing.updateMany({
        where: {
          id: listingId,
          status: RentalListingStatus.PAYMENT_LOCKED,
        },
        data: {
          status: RentalListingStatus.ACTIVE,
          reservedUntil: null,
        },
      }),
    ]);
  }
}
