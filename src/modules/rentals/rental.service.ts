import {
  PaymentProvider,
  Prisma,
  RentalInquiryStatus,
  RentalFurnishingStatus,
  RentalListingStatus,
  RentalOwnerStatus,
  RentalOwnerSubmissionStatus,
  RentalPaymentPurpose,
  RentalPaymentStatus,
  RentalReservationStatus,
} from '@prisma/client';
import crypto from 'crypto';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { PaymobService } from './paymob.service.js';
import {
  addDays,
  addMinutes,
  RENTAL_POLICY,
} from './rental-policy.js';
import { withOptimizedRentalImages } from './rental-image-urls.js';
import type {
  AdminCreateListingInput,
  AdminRentalListQuery,
  AdminUpdateListingInput,
  CloudinaryUploadSignatureInput,
  ContactAccessQuery,
  CreateRentalOwnerInput,
  CreateRentalInquiryInput,
  CreateOwnerSubmissionInput,
  RentalIdParams,
  RentalInquiryParams,
  RentalInquiryQuery,
  RentalListQuery,
  OwnerSubmissionParams,
  OwnerSubmissionQuery,
  RentalOwnerParams,
  RentalOwnerQuery,
  RentalSlugParams,
  TenantPaymentRequestInput,
  UpdateOwnerSubmissionStatusInput,
  UpdateRentalInquiryStatusInput,
  UpdateRentalOwnerInput,
} from './rental.types.js';

const DEFAULT_OWNER_SUBMISSION_COMPOUND_CODE = 'black-horse';

const publicListingBaseSelect = {
  id: true,
  compoundId: true,
  unitId: true,
  title: true,
  slug: true,
  description: true,
  listingType: true,
  furnishingStatus: true,
  unitCondition: true,
  basics: true,
  amenities: true,
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

const publicListingListSelect = {
  ...publicListingBaseSelect,
  images: {
    select: {
      id: true,
      url: true,
      altText: true,
      sortOrder: true,
      isCover: true,
    },
    orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    take: 1,
  },
} satisfies Prisma.RentalListingSelect;

const publicListingDetailSelect = {
  ...publicListingBaseSelect,
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

const adminOwnerSelect = {
  id: true,
  compoundId: true,
  residentId: true,
  fullName: true,
  phone: true,
  email: true,
  nationalId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  resident: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      status: true,
    },
  },
  _count: {
    select: {
      listings: true,
    },
  },
} satisfies Prisma.RentalOwnerSelect;

const adminOwnerDetailSelect = {
  ...adminOwnerSelect,
  listings: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isPublished: true,
      monthlyRent: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
} satisfies Prisma.RentalOwnerSelect;

const adminInquirySelect = {
  id: true,
  listingId: true,
  compoundId: true,
  tenantResidentId: true,
  tenantName: true,
  tenantPhone: true,
  tenantEmail: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isPublished: true,
      monthlyRent: true,
      addressText: true,
      locationText: true,
    },
  },
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
    },
  },
  tenantResident: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      status: true,
    },
  },
} satisfies Prisma.RentalInquirySelect;

const publicOwnerSubmissionStatusSelect = {
  id: true,
  status: true,
  title: true,
  createdListingId: true,
  createdAt: true,
  updatedAt: true,
  createdListing: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isPublished: true,
    },
  },
} satisfies Prisma.RentalOwnerSubmissionSelect;

const adminOwnerSubmissionSelect = {
  id: true,
  compoundId: true,
  ownerName: true,
  ownerPhone: true,
  ownerWhatsapp: true,
  ownerEmail: true,
  ownerNationalId: true,
  preferredContactMethod: true,
  listingType: true,
  title: true,
  description: true,
  addressText: true,
  locationText: true,
  floor: true,
  areaSqm: true,
  bedrooms: true,
  bathrooms: true,
  furnishingStatus: true,
  unitCondition: true,
  basics: true,
  amenities: true,
  monthlyRent: true,
  depositAmount: true,
  status: true,
  adminNotes: true,
  rejectionReason: true,
  createdListingId: true,
  policyAcceptedAt: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      isActive: true,
    },
  },
  createdListing: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isPublished: true,
    },
  },
  images: {
    orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.RentalOwnerSubmissionSelect;

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

function createCloudinaryUploadSignatureForFolder(folder: string) {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(
      'Cloudinary image upload is not configured',
      503,
      ErrorCodes.CLOUDINARY_NOT_CONFIGURED,
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    fields: {
      api_key: env.CLOUDINARY_API_KEY,
      folder,
      timestamp,
      signature,
    },
  };
}

function cleanText(value?: string | null) {
  return value?.trim() || undefined;
}

function deriveFurnishingStatus(
  condition?: string,
  fallback?: RentalFurnishingStatus,
): RentalFurnishingStatus {
  const normalized = condition?.trim();
  if (normalized === 'مفروشة') return RentalFurnishingStatus.FURNISHED;
  if (normalized === 'نص فرش') return RentalFurnishingStatus.SEMI_FURNISHED;
  if (normalized === 'غير مفروشة') return RentalFurnishingStatus.UNFURNISHED;
  return fallback ?? RentalFurnishingStatus.UNFURNISHED;
}

function buildOwnerSubmissionTitle(input: CreateOwnerSubmissionInput) {
  const parts = ['شقة للإيجار'];
  if (input.bedrooms !== undefined) parts.push(`${input.bedrooms} غرف`);
  if (input.areaSqm !== undefined) parts.push(`${input.areaSqm} م²`);
  return parts.join(' - ');
}

function buildOwnerSubmissionDescription(input: CreateOwnerSubmissionInput) {
  const lines = ['طلب إعلان شقة للإيجار من المالك.'];

  if (input.unitCondition) lines.push(`حالة الوحدة: ${input.unitCondition.trim()}.`);
  if (input.areaSqm !== undefined) lines.push(`المساحة: ${input.areaSqm} م².`);
  if (input.bedrooms !== undefined) lines.push(`عدد الغرف: ${input.bedrooms}.`);
  lines.push(`عدد الحمامات: ${input.bathrooms ?? 1}.`);
  lines.push(`الإيجار الشهري: ${input.monthlyRent}.`);
  lines.push(`التأمين: ${input.depositAmount}.`);
  if (input.basics) lines.push(`الأساسيات: ${input.basics.trim()}.`);
  if (input.amenities) lines.push(`المميزات: ${input.amenities.trim()}.`);

  return lines.join('\n');
}

export class RentalService {
  static createCloudinaryUploadSignature(input: CloudinaryUploadSignatureInput = {}) {
    const configuredFolder =
      env.CLOUDINARY_OWNER_SUBMISSIONS_FOLDER ||
      env.CLOUDINARY_UPLOAD_FOLDER ||
      'dalilsubhi/owner-submissions';
    const requestedFolder = input.folder?.trim();
    const folder = requestedFolder?.startsWith(configuredFolder)
      ? requestedFolder
      : configuredFolder;

    return createCloudinaryUploadSignatureForFolder(folder);
  }

  static createAdminListingCloudinaryUploadSignature() {
    return createCloudinaryUploadSignatureForFolder(
      env.CLOUDINARY_LISTINGS_FOLDER || 'dalilsubhi/listings',
    );
  }

  static async createOwnerSubmission(input: CreateOwnerSubmissionInput) {
    const compound = await prisma.compound.findFirst({
      where: {
        code: DEFAULT_OWNER_SUBMISSION_COMPOUND_CODE,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!compound) {
      throw new AppError(
        'Rental compound is not configured for public owner submissions',
        503,
        ErrorCodes.SERVICE_UNAVAILABLE,
      );
    }

    const images = this.normalizeSubmissionImages(input.images);
    const unitCondition = cleanText(input.unitCondition);
    const furnishingStatus = deriveFurnishingStatus(unitCondition, input.furnishingStatus);
    const title = cleanText(input.title) ?? buildOwnerSubmissionTitle(input);
    const description = cleanText(input.description) ?? buildOwnerSubmissionDescription(input);

    return prisma.rentalOwnerSubmission.create({
      data: {
        compoundId: compound.id,
        ownerName: input.ownerName.trim(),
        ownerPhone: this.normalizePhone(input.ownerPhone),
        ownerWhatsapp: this.normalizePhone(input.ownerWhatsapp),
        ownerEmail: cleanText(input.ownerEmail),
        ownerNationalId: cleanText(input.ownerNationalId),
        preferredContactMethod: cleanText(input.preferredContactMethod),
        listingType: 'APARTMENT',
        title,
        description,
        addressText: cleanText(input.addressText),
        locationText: cleanText(input.locationText),
        floor: input.floor ?? undefined,
        areaSqm: input.areaSqm,
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms ?? 1,
        furnishingStatus,
        unitCondition,
        basics: cleanText(input.basics),
        amenities: cleanText(input.amenities),
        monthlyRent: input.monthlyRent,
        depositAmount: input.depositAmount,
        policyAcceptedAt: new Date(),
        status: RentalOwnerSubmissionStatus.NEW,
        images: {
          create: images,
        },
      },
      select: publicOwnerSubmissionStatusSelect,
    });
  }

  static async getOwnerSubmissionStatus(id: OwnerSubmissionParams['id']) {
    const submission = await prisma.rentalOwnerSubmission.findUnique({
      where: { id },
      select: publicOwnerSubmissionStatusSelect,
    });

    if (!submission) {
      throw new AppError(
        'Owner submission not found',
        404,
        ErrorCodes.RENTAL_OWNER_SUBMISSION_NOT_FOUND,
      );
    }

    return submission;
  }

  static async listAdminOwnerSubmissions(query: OwnerSubmissionQuery) {
    const where = this.buildAdminOwnerSubmissionWhere(query);

    const [totalCount, submissions] = await prisma.$transaction([
      prisma.rentalOwnerSubmission.count({ where }),
      prisma.rentalOwnerSubmission.findMany({
        where,
        ...getPrismaPagination(query),
        select: adminOwnerSubmissionSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      submissions,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminOwnerSubmissionById(id: OwnerSubmissionParams['id']) {
    const submission = await prisma.rentalOwnerSubmission.findUnique({
      where: { id },
      select: adminOwnerSubmissionSelect,
    });

    if (!submission) {
      throw new AppError(
        'Owner submission not found',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    return submission;
  }

  static async updateAdminOwnerSubmissionStatus(
    id: OwnerSubmissionParams['id'],
    input: UpdateOwnerSubmissionStatusInput,
  ) {
    await this.getAdminOwnerSubmissionById(id);

    return prisma.rentalOwnerSubmission.update({
      where: { id },
      data: {
        status: input.status,
        adminNotes: input.adminNotes,
        rejectionReason: input.rejectionReason,
      },
      select: adminOwnerSubmissionSelect,
    });
  }

  static async convertOwnerSubmissionToListing(id: OwnerSubmissionParams['id']) {
    const submission = await prisma.rentalOwnerSubmission.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!submission) {
      throw new AppError(
        'Owner submission not found',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    if (submission.createdListingId || submission.status === RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING) {
      throw new AppError(
        'Owner submission was already converted to a listing',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    if (submission.status !== RentalOwnerSubmissionStatus.APPROVED) {
      throw new AppError(
        'Owner submission must be approved before conversion',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    if (submission.areaSqm === null || submission.bedrooms === null) {
      throw new AppError(
        'Submission is missing required listing dimensions or room counts',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    const areaSqm = submission.areaSqm;

    return prisma.$transaction(async (tx) => {
      const owner = await tx.rentalOwner.upsert({
        where: {
          compoundId_phone: {
            compoundId: submission.compoundId,
            phone: submission.ownerPhone,
          },
        },
        create: {
          compoundId: submission.compoundId,
          fullName: submission.ownerName,
          phone: submission.ownerPhone,
          email: submission.ownerEmail,
          nationalId: submission.ownerNationalId,
          status: RentalOwnerStatus.ACTIVE,
        },
        update: {
          fullName: submission.ownerName,
          email: submission.ownerEmail,
          nationalId: submission.ownerNationalId,
          status: RentalOwnerStatus.ACTIVE,
        },
      });

      const slug = await this.createUniqueSlugInTransaction(tx, submission.title);
      const preprocessedImages = this.normalizeSubmissionImages(submission.images);

      const listing = await tx.rentalListing.create({
        data: {
          compoundId: submission.compoundId,
          ownerId: owner.id,
          title: submission.title,
          slug,
          description: submission.description,
          listingType: submission.listingType,
          furnishingStatus: submission.furnishingStatus,
          bedrooms: submission.bedrooms ?? 0,
          bathrooms: submission.bathrooms ?? 1,
          areaSqm,
          floor: submission.floor,
          monthlyRent: submission.monthlyRent,
          depositAmount: submission.depositAmount,
          unitCondition: submission.unitCondition,
          basics: submission.basics,
          amenities: submission.amenities,
          contactUnlockFee: RENTAL_POLICY.tenantContactUnlockFee,
          reservationFee: RENTAL_POLICY.reservationHoldFee,
          platformCommissionRate: RENTAL_POLICY.platformCommissionRate,
          addressText: submission.addressText,
          locationText: submission.locationText,
          status: RentalListingStatus.PENDING_REVIEW,
          isPublished: false,
          isFeatured: false,
          images: preprocessedImages.length
            ? {
                create: preprocessedImages.map((image) => ({
                  url: image.url,
                  altText: image.altText,
                  sortOrder: image.sortOrder,
                  isCover: image.isCover,
                })),
              }
            : undefined,
        },
        include: adminListingInclude,
      });

      const updatedSubmission = await tx.rentalOwnerSubmission.update({
        where: { id: submission.id },
        data: {
          status: RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING,
          createdListingId: listing.id,
        },
        select: adminOwnerSubmissionSelect,
      });

      return {
        submission: updatedSubmission,
        listing,
      };
    });
  }

  static async listRentalOwners(query: RentalOwnerQuery) {
    const where = this.buildRentalOwnerWhere(query);

    const [totalCount, owners] = await prisma.$transaction([
      prisma.rentalOwner.count({ where }),
      prisma.rentalOwner.findMany({
        where,
        ...getPrismaPagination(query),
        select: adminOwnerSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      owners,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getRentalOwnerById(id: RentalOwnerParams['id']) {
    const owner = await prisma.rentalOwner.findUnique({
      where: { id },
      select: adminOwnerDetailSelect,
    });

    if (!owner) {
      throw new AppError(
        'Rental owner not found',
        404,
        ErrorCodes.RENTAL_OWNER_NOT_FOUND,
      );
    }

    return owner;
  }

  static async createRentalOwner(input: CreateRentalOwnerInput) {
    const data = this.normalizeRentalOwnerInput(input);
    await this.validateRentalOwnerReferences(data.compoundId, data.residentId);

    try {
      return await prisma.rentalOwner.create({
        data: {
          compoundId: data.compoundId,
          residentId: data.residentId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          nationalId: data.nationalId,
          status: data.status ?? RentalOwnerStatus.ACTIVE,
        },
        select: adminOwnerDetailSelect,
      });
    } catch (error) {
      this.handleRentalOwnerUniqueConstraint(error);
      throw error;
    }
  }

  static async updateRentalOwner(
    id: RentalOwnerParams['id'],
    input: UpdateRentalOwnerInput,
  ) {
    const existingOwner = await this.getRentalOwnerById(id);
    const data = this.normalizeRentalOwnerInput(input);

    if (data.residentId !== undefined) {
      await this.validateRentalOwnerReferences(existingOwner.compoundId, data.residentId);
    }

    try {
      return await prisma.rentalOwner.update({
        where: { id },
        data: {
          residentId: data.residentId,
          fullName: data.fullName,
          phone: data.phone,
          email: data.email,
          nationalId: data.nationalId,
          status: data.status,
        },
        select: adminOwnerDetailSelect,
      });
    } catch (error) {
      this.handleRentalOwnerUniqueConstraint(error);
      throw error;
    }
  }

  static async activateRentalOwner(id: RentalOwnerParams['id']) {
    await this.getRentalOwnerById(id);

    return prisma.rentalOwner.update({
      where: { id },
      data: { status: RentalOwnerStatus.ACTIVE },
      select: adminOwnerDetailSelect,
    });
  }

  static async deactivateRentalOwner(id: RentalOwnerParams['id']) {
    await this.getRentalOwnerById(id);

    return prisma.rentalOwner.update({
      where: { id },
      data: { status: RentalOwnerStatus.SUSPENDED },
      select: adminOwnerDetailSelect,
    });
  }

  static async listPublicListings(query: RentalListQuery) {
    const now = new Date();
    const where = this.buildPublicListingWhere(query, now);

    const [totalCount, listings] = await prisma.$transaction([
      prisma.rentalListing.count({ where }),
      prisma.rentalListing.findMany({
        where,
        ...getPrismaPagination(query),
        select: publicListingListSelect,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      listings: listings.map((listing) => withOptimizedRentalImages(listing)),
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
      select: publicListingDetailSelect,
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    return withOptimizedRentalImages(listing);
  }

  static async createRentalInquiry(
    listingId: RentalIdParams['id'],
    input: CreateRentalInquiryInput,
  ) {
    const listing = await this.getAvailableListingForInquiry(listingId);
    const tenantPhone = this.normalizePhone(input.tenantPhone);
    const status =
      input.inquiryType === 'VIEWING_REQUEST'
        ? RentalInquiryStatus.VIEWING_REQUESTED
        : RentalInquiryStatus.NEW;

    const inquiry = await prisma.rentalInquiry.create({
      data: {
        listingId: listing.id,
        compoundId: listing.compoundId,
        tenantName: input.tenantName,
        tenantPhone,
        tenantEmail: input.tenantEmail,
        message: input.message,
        status,
      },
      select: {
        id: true,
        status: true,
      },
    });

    return inquiry;
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
            take: 1,
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

  static async listAdminInquiries(query: RentalInquiryQuery) {
    const where = this.buildAdminInquiryWhere(query);

    const [totalCount, inquiries] = await prisma.$transaction([
      prisma.rentalInquiry.count({ where }),
      prisma.rentalInquiry.findMany({
        where,
        ...getPrismaPagination(query),
        select: adminInquirySelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      inquiries,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminInquiryById(id: RentalInquiryParams['id']) {
    const inquiry = await prisma.rentalInquiry.findUnique({
      where: { id },
      select: adminInquirySelect,
    });

    if (!inquiry) {
      throw new AppError(
        'Rental inquiry not found',
        404,
        ErrorCodes.RENTAL_INQUIRY_NOT_FOUND,
      );
    }

    return inquiry;
  }

  static async updateAdminInquiryStatus(
    id: RentalInquiryParams['id'],
    input: UpdateRentalInquiryStatusInput,
  ) {
    await this.getAdminInquiryById(id);

    return prisma.rentalInquiry.update({
      where: { id },
      data: { status: input.status },
      select: adminInquirySelect,
    });
  }

  static async createAdminListing(input: AdminCreateListingInput) {
    await this.validateListingReferences(input.compoundId, input.ownerId, input.unitId);

    let slug: string;
    if (input.slug) {
      const cleanSlug = input.slug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
        throw new AppError(
          'Invalid slug format. Slug must contain only lowercase letters, numbers, and single hyphens.',
          400,
          ErrorCodes.RENTAL_LISTING_INVALID_SLUG,
        );
      }
      const existingListing = await prisma.rentalListing.findUnique({ where: { slug: cleanSlug } });
      if (existingListing) {
        throw new AppError(
          'Rental listing slug already exists',
          409,
          ErrorCodes.RENTAL_LISTING_SLUG_CONFLICT,
        );
      }
      slug = cleanSlug;
    } else {
      slug = await this.createUniqueSlug(input.title);
    }

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
        isFeatured: input.isFeatured ?? false,
        images: input.images?.length
          ? {
              create: (() => {
                const preprocessed = [...input.images];
                let coverIndex = preprocessed.findIndex((img) => img.isCover);
                if (coverIndex === -1) {
                  coverIndex = 0;
                }
                return preprocessed.map((image, index) => ({
                  url: image.url,
                  altText: image.altText,
                  sortOrder: image.sortOrder ?? index,
                  isCover: index === coverIndex,
                }));
              })(),
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

    let slug: string | undefined;
    if (input.slug !== undefined) {
      const cleanSlug = input.slug.trim().toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
        throw new AppError(
          'Invalid slug format. Slug must contain only lowercase letters, numbers, and single hyphens.',
          400,
          ErrorCodes.RENTAL_LISTING_INVALID_SLUG,
        );
      }
      if (cleanSlug !== existing.slug) {
        const existingListing = await prisma.rentalListing.findUnique({ where: { slug: cleanSlug } });
        if (existingListing) {
          throw new AppError(
            'Rental listing slug already exists',
            409,
            ErrorCodes.RENTAL_LISTING_SLUG_CONFLICT,
          );
        }
      }
      slug = cleanSlug;
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
          slug,
          isFeatured: input.isFeatured,
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
                create: (() => {
                  const preprocessed = [...input.images];
                  let coverIndex = preprocessed.findIndex((img) => img.isCover);
                  if (coverIndex === -1 && preprocessed.length > 0) {
                    coverIndex = 0;
                  }
                  return preprocessed.map((image, index) => ({
                    url: image.url,
                    altText: image.altText,
                    sortOrder: image.sortOrder ?? index,
                    isCover: index === coverIndex,
                  }));
                })(),
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

  private static buildAdminInquiryWhere(query: RentalInquiryQuery) {
    const where: Prisma.RentalInquiryWhereInput = {};

    if (query.search) {
      where.OR = [
        { tenantName: { contains: query.search, mode: 'insensitive' } },
        { tenantPhone: { contains: query.search, mode: 'insensitive' } },
        { tenantEmail: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
        { listing: { title: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.listingId) where.listingId = query.listingId;
    if (query.compoundId) where.compoundId = query.compoundId;
    if (query.status) where.status = query.status;

    return where;
  }

  private static buildAdminOwnerSubmissionWhere(query: OwnerSubmissionQuery) {
    const where: Prisma.RentalOwnerSubmissionWhereInput = {};

    if (query.search) {
      where.OR = [
        { ownerName: { contains: query.search, mode: 'insensitive' } },
        { ownerPhone: { contains: query.search, mode: 'insensitive' } },
        { ownerWhatsapp: { contains: query.search, mode: 'insensitive' } },
        { ownerEmail: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { addressText: { contains: query.search, mode: 'insensitive' } },
        { locationText: { contains: query.search, mode: 'insensitive' } },
        { unitCondition: { contains: query.search, mode: 'insensitive' } },
        { basics: { contains: query.search, mode: 'insensitive' } },
        { amenities: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.compoundId) where.compoundId = query.compoundId;
    if (query.status) where.status = query.status;

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

  private static async getAvailableListingForInquiry(id: string) {
    const listing = await prisma.rentalListing.findUnique({
      where: { id },
      select: {
        id: true,
        compoundId: true,
        status: true,
        isPublished: true,
        expiresAt: true,
      },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    const isExpired = listing.expiresAt !== null && listing.expiresAt <= new Date();

    if (
      listing.status !== RentalListingStatus.ACTIVE ||
      !listing.isPublished ||
      isExpired
    ) {
      throw new AppError(
        'Rental listing is not available for inquiries',
        409,
        ErrorCodes.RENTAL_INQUIRY_LISTING_UNAVAILABLE,
      );
    }

    return listing;
  }

  private static buildRentalOwnerWhere(query: RentalOwnerQuery) {
    const where: Prisma.RentalOwnerWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { nationalId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.compoundId) {
      where.compoundId = query.compoundId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return where;
  }

  private static normalizeRentalOwnerInput<T extends CreateRentalOwnerInput | UpdateRentalOwnerInput>(
    input: T,
  ): T {
    return {
      ...input,
      fullName: input.fullName?.trim(),
      phone: input.phone?.trim(),
      email: input.email?.trim() || undefined,
      nationalId: input.nationalId?.trim() || undefined,
      residentId: input.residentId || undefined,
    };
  }

  private static async validateRentalOwnerReferences(
    compoundId: string,
    residentId?: string,
  ) {
    const [compound, resident] = await Promise.all([
      prisma.compound.findUnique({ where: { id: compoundId } }),
      residentId ? prisma.resident.findUnique({ where: { id: residentId } }) : Promise.resolve(null),
    ]);

    if (!compound || !compound.isActive) {
      throw new AppError('Active compound not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (residentId && (!resident || resident.compoundId !== compoundId)) {
      throw new AppError(
        'Resident must belong to the same compound',
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }

  private static handleRentalOwnerUniqueConstraint(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

      if (target.includes('compound_id') || target.includes('phone')) {
        throw new AppError(
          'Rental owner phone already exists in this compound',
          409,
          ErrorCodes.CONFLICT,
        );
      }
    }
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

  private static async createUniqueSlugInTransaction(
    tx: Prisma.TransactionClient,
    title: string,
  ) {
    const baseSlug = this.slugify(title);
    let slug = baseSlug;
    let suffix = 2;

    while (await tx.rentalListing.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private static normalizeSubmissionImages(
    images: Array<{
      url: string;
      publicId?: string | null;
      storagePath?: string | null;
      altText?: string | null;
      sortOrder?: number | null;
      isCover?: boolean | null;
    }>,
  ) {
    const preprocessed = [...images];
    let coverIndex = preprocessed.findIndex((image) => image.isCover);
    if (coverIndex === -1) {
      coverIndex = 0;
    }

    return preprocessed.map((image, index) => ({
      url: image.url,
      publicId: image.publicId || undefined,
      storagePath: image.storagePath || undefined,
      altText: image.altText || undefined,
      sortOrder: image.sortOrder ?? index,
      isCover: index === coverIndex,
    }));
  }

  private static slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || `sebahi-rental-${Date.now()}`;
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
