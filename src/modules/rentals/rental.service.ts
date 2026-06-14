import {
  AdminNotificationEntityType,
  AdminNotificationEventType,
  Prisma,
  RentalInquiryStatus,
  RentalFurnishingStatus,
  RentalListingStatus,
  RentalOwnerStatus,
  RentalOwnerSubmissionStatus,
  RentalPaymentStatus,
  RentalReservationStatus,
  RentalTenantStatus,
  UnitStatus,
  RentalBedStatus,
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
import {
  addDays,
  RENTAL_POLICY,
} from './rental-policy.js';
import { withOptimizedRentalImages } from './rental-image-urls.js';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service.js';
import type {
  AdminCreateListingInput,
  AdminRentalListQuery,
  AdminUpdateListingInput,
  CloudinaryUploadSignatureInput,
  ContactAccessQuery,
  DeleteRentalInquiryResult,
  DeleteRentalOwnerResult,
  DeleteRentalOwnerSubmissionResult,
  DeleteRentalTenantResult,
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
  RentalTenantParams,
  RentalTenantQuery,
  RentalSlugParams,
  TenantPaymentRequestInput,
  UpdateOwnerSubmissionStatusInput,
  UpdateRentalBedStatusInput,
  UpdateRentalInquiryStatusInput,
  UpdateRentalOwnerInput,
} from './rental.types.js';

const DEFAULT_RENTAL_COMPOUND_CODE = 'black-horse';
const DEFAULT_OWNER_SUBMISSION_COMPOUND_CODE = DEFAULT_RENTAL_COMPOUND_CODE;
const ADMIN_OWNER_SUBMISSION_DETAIL_URL_PREFIX = '/rentals/owner-submissions/';

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
  isAirConditioned: true,
  basicFeatures: true,
  extraAmenitiesText: true,
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
  totalBeds: true,
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
  beds: {
    orderBy: { bedNumber: 'asc' },
  },
} satisfies Prisma.RentalListingInclude;

const adminBedSelect = {
  id: true,
  listingId: true,
  bedNumber: true,
  status: true,
  inquiryId: true,
  reservationId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RentalBedSelect;

const adminOwnerSelect = {
  id: true,
  compoundId: true,
  residentId: true,
  fullName: true,
  phone: true,
  whatsappPhone: true,
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

const adminTenantSelect = {
  id: true,
  compoundId: true,
  fullName: true,
  phone: true,
  email: true,
  nationalId: true,
  status: true,
  inquiryId: true,
  reservationId: true,
  listingId: true,
  unitId: true,
  bedId: true,
  ownerId: true,
  buildingNumber: true,
  apartmentNumber: true,
  bedNumber: true,
  startedAt: true,
  endedAt: true,
  deactivatedAt: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      monthlyRent: true,
      buildingNumber: true,
      apartmentNumber: true,
    },
  },
  owner: {
    select: {
      id: true,
      fullName: true,
      phone: true,
      whatsappPhone: true,
      status: true,
    },
  },
} satisfies Prisma.RentalTenantSelect;

const adminTenantDetailSelect = {
  ...adminTenantSelect,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      unitType: true,
      floor: true,
      areaSqm: true,
      status: true,
    },
  },
  inquiry: {
    select: {
      id: true,
      status: true,
      tenantName: true,
      tenantPhone: true,
      createdAt: true,
    },
  },
  reservation: {
    select: {
      id: true,
      status: true,
      tenantName: true,
      tenantPhone: true,
      confirmedAt: true,
      createdAt: true,
    },
  },
  bed: {
    select: {
      id: true,
      bedNumber: true,
      status: true,
      inquiryId: true,
      reservationId: true,
    },
  },
} satisfies Prisma.RentalTenantSelect;

const adminInquirySelect = {
  id: true,
  listingId: true,
  compoundId: true,
  tenantResidentId: true,
  tenantName: true,
  tenantPhone: true,
  tenantEmail: true,
  tenantNationalId: true,
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
      depositAmount: true,
      addressText: true,
      locationText: true,
      buildingNumber: true,
      apartmentNumber: true,
      totalBeds: true,
      pendingBeds: true,
      rentedBeds: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          whatsappPhone: true,
          status: true,
        },
      },
      unit: {
        select: {
          id: true,
          unitNumber: true,
          unitType: true,
          floor: true,
          areaSqm: true,
          status: true,
        },
      },
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
  totalBeds: true,
  duplicateReviewFlag: true,
  reviewReason: true,
  preferredContactMethod: true,
  listingType: true,
  title: true,
  description: true,
  addressText: true,
  locationText: true,
  buildingNumber: true,
  apartmentNumber: true,
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

const allowedBedStatusTransitions: Record<RentalBedStatus, RentalBedStatus[]> = {
  [RentalBedStatus.AVAILABLE]: [
    RentalBedStatus.RESERVED,
    RentalBedStatus.RENTED,
    RentalBedStatus.OUT_OF_SERVICE,
  ],
  [RentalBedStatus.RESERVED]: [
    RentalBedStatus.AVAILABLE,
    RentalBedStatus.RENTED,
    RentalBedStatus.OUT_OF_SERVICE,
  ],
  [RentalBedStatus.RENTED]: [
    RentalBedStatus.AVAILABLE,
    RentalBedStatus.OUT_OF_SERVICE,
  ],
  [RentalBedStatus.OUT_OF_SERVICE]: [
    RentalBedStatus.AVAILABLE,
  ],
};

type RentalPrismaClient = Prisma.TransactionClient | typeof prisma;

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
  if (normalized === 'سوبر لوكس') return RentalFurnishingStatus.FURNISHED;
  if (normalized === 'مفروشة') return RentalFurnishingStatus.FURNISHED;
  if (normalized === 'فاضية') return RentalFurnishingStatus.UNFURNISHED;
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

function buildAdminListingTitle(input: AdminCreateListingInput) {
  const condition = cleanText(input.unitCondition);
  return condition
    ? `شقة ${condition} للإيجار في كمبوند السبحي`
    : 'شقة للإيجار في كمبوند السبحي';
}

function buildAdminListingDescription(input: AdminCreateListingInput) {
  const lines = ['شقة للإيجار في كمبوند السبحي.'];

  if (input.unitCondition) lines.push(`حالة الوحدة: ${input.unitCondition.trim()}.`);
  lines.push(`المساحة: ${input.areaSqm} م².`);
  lines.push(`الدور: ${input.floor}.`);
  lines.push(`عدد الغرف: ${input.bedrooms ?? 2}.`);
  lines.push(`عدد الحمامات: ${input.bathrooms ?? 1}.`);
  lines.push(`الإيجار الشهري: ${input.monthlyRent}.`);
  lines.push(`التأمين: ${input.depositAmount}.`);
  if (input.basics) lines.push(`الأساسيات: ${input.basics.trim()}.`);
  if (input.amenities) lines.push(`الكماليات: ${input.amenities.trim()}.`);

  return lines.join('\n');
}

interface PublicListingsResponse {
  listings: any[];
  meta: ReturnType<typeof getPaginationMeta>;
}

interface PublicListingsCacheEntry {
  data: PublicListingsResponse;
  savedAt: number;
  expiresAt: number;
}

const publicListingsCache = new Map<string, PublicListingsCacheEntry>();

const RENTAL_BASIC_FEATURE_KEYS = [
  'internet',
  'basic_appliances',
  'water_motor',
  'desks',
  'window_mesh',
  'water_heater',
  'water_filter',
];

export class RentalService {
  static normalizeBasicFeatures(input: any) {
    if (input === undefined || input === null) {
      return RENTAL_BASIC_FEATURE_KEYS;
    }
    if (Array.isArray(input)) {
      if (input.length === 0) return [];
      const validKeys = input.filter((k) => typeof k === 'string' && RENTAL_BASIC_FEATURE_KEYS.includes(k));
      return Array.from(new Set(validKeys));
    }
    return RENTAL_BASIC_FEATURE_KEYS;
  }

  static calculateDeposit(monthlyRent: any) {
    const rent = Number(monthlyRent);
    if (!isNaN(rent) && rent > 0) {
      return Number((rent * 2).toFixed(2));
    }
    return 0;
  }
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

    const cleanNationalId = cleanText(input.ownerNationalId)?.trim();
    let duplicateReviewFlag = false;
    let reviewReason: string | null = null;

    if (cleanNationalId) {
      const duplicateSubmission = await prisma.rentalOwnerSubmission.findFirst({
        where: { ownerNationalId: cleanNationalId },
        select: { id: true },
      });

      const duplicateOwner = await prisma.rentalOwner.findFirst({
        where: { nationalId: cleanNationalId },
        select: { id: true },
      });

      if (duplicateSubmission || duplicateOwner) {
        duplicateReviewFlag = true;
        reviewReason = "رقم قومي مستخدم من قبل";
      }
    }

    const submission = await prisma.rentalOwnerSubmission.create({
      data: {
        compoundId: compound.id,
        ownerName: input.ownerName.trim(),
        ownerPhone: this.normalizePhone(input.ownerPhone),
        ownerWhatsapp: this.normalizePhone(input.ownerWhatsapp),
        ownerEmail: cleanText(input.ownerEmail),
        ownerNationalId: cleanNationalId,
        totalBeds: input.totalBeds ?? 4,
        duplicateReviewFlag,
        reviewReason,
        preferredContactMethod: cleanText(input.preferredContactMethod),
        listingType: 'APARTMENT',
        title,
        description,
        addressText: cleanText(input.addressText),
        locationText: cleanText(input.locationText),
        buildingNumber: cleanText(input.buildingNumber),
        apartmentNumber: cleanText(input.apartmentNumber),
        floor: input.floor ?? undefined,
        areaSqm: 63,
        bedrooms: 2,
        bathrooms: input.bathrooms ?? 1,
        isAirConditioned: input.isAirConditioned ?? false,
        basicFeatures: this.normalizeBasicFeatures(input.basicFeatures),
        extraAmenitiesText: cleanText(input.extraAmenitiesText),
        furnishingStatus,
        unitCondition,
        basics: cleanText(input.basics),
        amenities: cleanText(input.amenities),
        monthlyRent: input.monthlyRent,
        depositAmount: this.calculateDeposit(input.monthlyRent),
        policyAcceptedAt: new Date(),
        status: RentalOwnerSubmissionStatus.NEW,
        images: {
          create: images,
        },
      },
      select: publicOwnerSubmissionStatusSelect,
    });

    void this.emitAdminNotificationSafely({
      compoundId: compound.id,
      eventType: AdminNotificationEventType.RENTAL_OWNER_SUBMISSION_CREATED,
      title: 'طلب إعلان وحدة جديد',
      body: `تم استلام طلب إعلان وحدة جديد من ${input.ownerName.trim()}.`,
      entityType: AdminNotificationEntityType.RENTAL_OWNER_SUBMISSION,
      entityId: submission.id,
      targetUrl: `${ADMIN_OWNER_SUBMISSION_DETAIL_URL_PREFIX}${submission.id}`,
      metadata: {
        ownerName: input.ownerName.trim(),
        ownerPhone: this.normalizePhone(input.ownerPhone),
        submissionId: submission.id,
        buildingNumber: cleanText(input.buildingNumber) ?? null,
        apartmentNumber: cleanText(input.apartmentNumber) ?? null,
      },
      dedupeKey: `rental-owner-submission-created:${submission.id}`,
    });

    return submission;
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
    const submission = await this.getAdminOwnerSubmissionById(id);

    const currentStatus = submission.status;
    const targetStatus = input.status;

    if (currentStatus !== targetStatus) {
      if (currentStatus === RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING) {
        throw new AppError(
          'Cannot update status of a submission that has already been converted to a listing',
          400,
          ErrorCodes.BAD_REQUEST,
        );
      }
      if (currentStatus === RentalOwnerSubmissionStatus.REJECTED) {
        throw new AppError(
          'Cannot update status of a rejected submission',
          400,
          ErrorCodes.BAD_REQUEST,
        );
      }
      if (targetStatus === RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING) {
        throw new AppError(
          'Cannot manually update status to CONVERTED_TO_LISTING',
          400,
          ErrorCodes.BAD_REQUEST,
        );
      }

      if (currentStatus === RentalOwnerSubmissionStatus.NEW) {
        const allowed: RentalOwnerSubmissionStatus[] = [
          RentalOwnerSubmissionStatus.UNDER_REVIEW,
          RentalOwnerSubmissionStatus.APPROVED,
          RentalOwnerSubmissionStatus.REJECTED,
          RentalOwnerSubmissionStatus.NEEDS_CHANGES,
          RentalOwnerSubmissionStatus.CANCELLED,
        ];
        if (!allowed.includes(targetStatus)) {
          throw new AppError(
            `Invalid status transition from NEW to ${targetStatus}`,
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }
      } else if (currentStatus === RentalOwnerSubmissionStatus.UNDER_REVIEW) {
        const allowed: RentalOwnerSubmissionStatus[] = [
          RentalOwnerSubmissionStatus.APPROVED,
          RentalOwnerSubmissionStatus.REJECTED,
          RentalOwnerSubmissionStatus.NEEDS_CHANGES,
          RentalOwnerSubmissionStatus.CANCELLED,
        ];
        if (!allowed.includes(targetStatus)) {
          throw new AppError(
            `Invalid status transition from UNDER_REVIEW to ${targetStatus}`,
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }
      }
    }

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
    return this.convertOwnerSubmissionToListingClean(id);
  }

  static async approveAndConvertOwnerSubmissionToListing(id: OwnerSubmissionParams['id']) {
    return this.convertOwnerSubmissionToListingClean(id);
  }

  static async convertOwnerSubmissionToListingClean(id: OwnerSubmissionParams['id']) {
    let step = 'start';

    try {
      const result = await prisma.$transaction(async (tx) => {
        step = 'load_submission';
        const submission = await this.loadOwnerSubmissionForConversion(tx, id);

        step = 'resolve_existing_conversion';
        const existingConversion = await this.resolveExistingOwnerSubmissionConversion(tx, submission);
        if (existingConversion) {
          return existingConversion;
        }

        step = 'validate_submission';
        const conversionData = this.buildOwnerSubmissionConversionData(submission);
        this.validateListingBeds(
          RentalListingStatus.PENDING_REVIEW,
          false,
          conversionData.totalBeds,
          0,
          0,
        );

        step = 'upsert_owner';
        const owner = await tx.rentalOwner.upsert({
          where: {
            compoundId_phone: {
              compoundId: conversionData.compoundId,
              phone: conversionData.ownerPhone,
            },
          },
          create: {
            compoundId: conversionData.compoundId,
            fullName: conversionData.ownerName,
            phone: conversionData.ownerPhone,
            whatsappPhone: conversionData.ownerWhatsapp,
            email: conversionData.ownerEmail,
            nationalId: conversionData.ownerNationalId,
            status: RentalOwnerStatus.ACTIVE,
          },
          update: {
            fullName: conversionData.ownerName,
            whatsappPhone: conversionData.ownerWhatsapp,
            email: conversionData.ownerEmail,
            nationalId: conversionData.ownerNationalId,
            status: RentalOwnerStatus.ACTIVE,
          },
          select: { id: true },
        });

        step = 'create_listing';
        const slug = await this.createUniqueSlugInTransaction(tx, conversionData.title);
        const listing = await tx.rentalListing.create({
          data: {
            compoundId: conversionData.compoundId,
            ownerId: owner.id,
            title: conversionData.title,
            slug,
            description: conversionData.description,
            listingType: conversionData.listingType,
            furnishingStatus: conversionData.furnishingStatus,
            bedrooms: conversionData.bedrooms,
            bathrooms: conversionData.bathrooms,
            areaSqm: conversionData.areaSqm,
            floor: conversionData.floor,
            isAirConditioned: conversionData.isAirConditioned,
            basicFeatures: conversionData.basicFeatures,
            extraAmenitiesText: conversionData.extraAmenitiesText,
            monthlyRent: conversionData.monthlyRent,
            depositAmount: conversionData.depositAmount,
            unitCondition: conversionData.unitCondition,
            basics: conversionData.basics,
            amenities: conversionData.amenities,
            contactUnlockFee: RENTAL_POLICY.tenantContactUnlockFee,
            reservationFee: RENTAL_POLICY.reservationHoldFee,
            platformCommissionRate: RENTAL_POLICY.platformCommissionRate,
            addressText: conversionData.addressText,
            locationText: conversionData.locationText,
            buildingNumber: conversionData.buildingNumber,
            apartmentNumber: conversionData.apartmentNumber,
            status: RentalListingStatus.PENDING_REVIEW,
            isPublished: false,
            isFeatured: false,
            totalBeds: conversionData.totalBeds,
            pendingBeds: 0,
            rentedBeds: 0,
            images: conversionData.images.length
              ? {
                  create: conversionData.images.map((image) => ({
                    url: image.url,
                    altText: image.altText,
                    sortOrder: image.sortOrder,
                    isCover: image.isCover,
                  })),
                }
              : undefined,
          },
          select: {
            id: true,
            totalBeds: true,
          },
        });

        step = 'provision_beds';
        await this.ensureOwnerConversionBeds(tx, listing.id, conversionData.totalBeds);

        step = 'sync_listing_counters';
        await this.syncListingCountersForOwnerConversion(tx, listing.id);

        step = 'update_submission';
        const updateResult = await tx.rentalOwnerSubmission.updateMany({
          where: {
            id: submission.id,
            createdListingId: null,
            status: {
              in: [
                RentalOwnerSubmissionStatus.NEW,
                RentalOwnerSubmissionStatus.UNDER_REVIEW,
                RentalOwnerSubmissionStatus.APPROVED,
              ],
            },
          },
          data: {
            status: RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING,
            createdListingId: listing.id,
          },
        });

        if (updateResult.count !== 1) {
          throw new AppError(
            'Owner submission conversion state changed. Please retry.',
            409,
            ErrorCodes.CONFLICT,
          );
        }

        return {
          submissionId: submission.id,
          listingId: listing.id,
        };
      }, { timeout: 20_000 });

      publicListingsCache.clear();

      step = 'load_conversion_result';
      return this.getOwnerSubmissionConversionResult(result.submissionId, result.listingId);
    } catch (error) {
      if (!(error instanceof AppError)) {
        this.logOwnerSubmissionConversionFailure(id, step, error);
      }
      throw error;
    }
  }

  private static async loadOwnerSubmissionForConversion(
    tx: Prisma.TransactionClient,
    id: OwnerSubmissionParams['id'],
  ) {
    try {
      return await tx.rentalOwnerSubmission.update({
        where: { id },
        data: { updatedAt: new Date() },
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new AppError(
          'Owner submission not found',
          404,
          ErrorCodes.NOT_FOUND,
        );
      }

      throw error;
    }
  }

  private static async resolveExistingOwnerSubmissionConversion(
    tx: Prisma.TransactionClient,
    submission: any,
  ) {
    if (!submission.createdListingId) {
      if (submission.status === RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING) {
        throw new AppError(
          'Owner submission conversion state is incomplete',
          409,
          ErrorCodes.CONFLICT,
        );
      }

      return null;
    }

    const listing = await tx.rentalListing.findUnique({
      where: { id: submission.createdListingId },
      select: {
        id: true,
        totalBeds: true,
      },
    });

    if (!listing) {
      throw new AppError(
        'Owner submission converted listing was not found',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    await this.ensureOwnerConversionBeds(tx, listing.id, listing.totalBeds);
    await this.syncListingCountersForOwnerConversion(tx, listing.id);

    if (submission.status !== RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING) {
      await tx.rentalOwnerSubmission.update({
        where: { id: submission.id },
        data: { status: RentalOwnerSubmissionStatus.CONVERTED_TO_LISTING },
      });
    }

    return {
      submissionId: submission.id,
      listingId: listing.id,
    };
  }

  private static buildOwnerSubmissionConversionData(submission: any) {
    const ownerName = cleanText(submission.ownerName);
    const ownerPhone = cleanText(submission.ownerPhone)
      ? this.normalizePhone(submission.ownerPhone)
      : undefined;
    const title = cleanText(submission.title) ?? 'Rental listing';
    const description = cleanText(submission.description) ?? title;
    const compoundId = cleanText(submission.compoundId);
    const buildingNumber = cleanText(submission.buildingNumber);
    const apartmentNumber = cleanText(submission.apartmentNumber);
    const totalBeds = Number(submission.totalBeds);
    const monthlyRentAmount = Number(submission.monthlyRent);
    const areaSqm = submission.areaSqm ?? 63;
    const bedrooms = submission.bedrooms ?? 2;
    const bathrooms = submission.bathrooms ?? 1;
    const depositAmount = submission.depositAmount ?? this.calculateDeposit(submission.monthlyRent);
    const missingFields: string[] = [];

    if (!ownerName) missingFields.push('ownerName');
    if (!ownerPhone) missingFields.push('ownerPhone');
    if (!compoundId) missingFields.push('compoundId');
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!buildingNumber) missingFields.push('buildingNumber');
    if (!apartmentNumber) missingFields.push('apartmentNumber');
    if (!submission.listingType) missingFields.push('listingType');
    if (!submission.furnishingStatus) missingFields.push('furnishingStatus');
    if (submission.monthlyRent === null || submission.monthlyRent === undefined) {
      missingFields.push('monthlyRent');
    }

    if (missingFields.length > 0) {
      throw new AppError(
        `Owner submission is missing required fields: ${missingFields.join(', ')}`,
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    if (!Number.isInteger(totalBeds) || totalBeds <= 0) {
      throw new AppError(
        'Owner submission totalBeds must be a positive integer',
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    if (!Number.isFinite(monthlyRentAmount) || monthlyRentAmount <= 0) {
      throw new AppError(
        'Owner submission monthlyRent must be greater than zero',
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    const validStatuses: RentalOwnerSubmissionStatus[] = [
      RentalOwnerSubmissionStatus.NEW,
      RentalOwnerSubmissionStatus.UNDER_REVIEW,
      RentalOwnerSubmissionStatus.APPROVED,
    ];

    if (submission.status === RentalOwnerSubmissionStatus.REJECTED) {
      throw new AppError(
        'Cannot convert a rejected owner submission',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    if (!validStatuses.includes(submission.status)) {
      throw new AppError(
        `Owner submission status ${submission.status} cannot be converted`,
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    const images = this.normalizeSubmissionImages(
      Array.isArray(submission.images) ? submission.images : [],
    );

    return {
      ownerName: ownerName!,
      ownerPhone: ownerPhone!,
      ownerWhatsapp: cleanText(submission.ownerWhatsapp),
      ownerEmail: cleanText(submission.ownerEmail),
      ownerNationalId: cleanText(submission.ownerNationalId),
      compoundId: compoundId!,
      title,
      description,
      listingType: submission.listingType,
      furnishingStatus: submission.furnishingStatus,
      unitCondition: cleanText(submission.unitCondition),
      basics: cleanText(submission.basics),
      amenities: cleanText(submission.amenities),
      isAirConditioned: submission.isAirConditioned ?? false,
      basicFeatures: submission.basicFeatures ?? undefined,
      extraAmenitiesText: cleanText(submission.extraAmenitiesText),
      monthlyRent: submission.monthlyRent,
      depositAmount,
      addressText: cleanText(submission.addressText),
      locationText: cleanText(submission.locationText),
      buildingNumber: buildingNumber!,
      apartmentNumber: apartmentNumber!,
      floor: submission.floor ?? undefined,
      areaSqm,
      bedrooms,
      bathrooms,
      totalBeds,
      images,
    };
  }

  private static async ensureOwnerConversionBeds(
    tx: Prisma.TransactionClient,
    listingId: string,
    targetTotalBeds: number,
  ) {
    if (!Number.isInteger(targetTotalBeds) || targetTotalBeds <= 0) {
      throw new AppError(
        'Target bed count must be a positive integer',
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    const existingBeds = await tx.rentalBed.findMany({
      where: { listingId },
      select: {
        id: true,
        bedNumber: true,
        status: true,
      },
      orderBy: { bedNumber: 'asc' },
    });
    const activeBeds = existingBeds.filter(
      (bed) => bed.status !== RentalBedStatus.OUT_OF_SERVICE,
    );
    const activeBedNumbers = new Set(activeBeds.map((bed) => bed.bedNumber));
    const occupiedBedNumbers = new Set(existingBeds.map((bed) => bed.bedNumber));
    const extraActiveBeds = activeBeds.filter(
      (bed) => bed.bedNumber < 1 || bed.bedNumber > targetTotalBeds,
    );

    if (extraActiveBeds.length > 0) {
      throw new AppError(
        'Listing already has active beds outside the expected range',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    for (let bedNumber = 1; bedNumber <= targetTotalBeds; bedNumber += 1) {
      if (activeBedNumbers.has(bedNumber)) {
        continue;
      }

      if (occupiedBedNumbers.has(bedNumber)) {
        throw new AppError(
          'Listing has inactive beds blocking required bed numbers',
          409,
          ErrorCodes.CONFLICT,
        );
      }

      await tx.rentalBed.create({
        data: {
          listingId,
          bedNumber,
          status: RentalBedStatus.AVAILABLE,
        },
      });
      activeBedNumbers.add(bedNumber);
      occupiedBedNumbers.add(bedNumber);
    }
  }

  private static async syncListingCountersForOwnerConversion(
    tx: Prisma.TransactionClient,
    listingId: string,
  ) {
    const listing = await tx.rentalListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        status: true,
        isPublished: true,
      },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    const groupedCounts = await tx.rentalBed.groupBy({
      by: ['status'],
      where: { listingId },
      _count: { _all: true },
    });
    const countByStatus = new Map<RentalBedStatus, number>(
      groupedCounts.map((item) => [item.status, item._count._all]),
    );
    const availableBeds = countByStatus.get(RentalBedStatus.AVAILABLE) ?? 0;
    const pendingBeds = countByStatus.get(RentalBedStatus.RESERVED) ?? 0;
    const rentedBeds = countByStatus.get(RentalBedStatus.RENTED) ?? 0;
    const totalBeds = availableBeds + pendingBeds + rentedBeds;
    let status = listing.status;
    let isPublished = listing.isPublished;

    if (availableBeds === 0) {
      isPublished = false;
      if (totalBeds === 0) {
        status = RentalListingStatus.SUSPENDED;
      } else if (rentedBeds === totalBeds) {
        status = RentalListingStatus.RENTED;
      } else if (pendingBeds > 0) {
        status = RentalListingStatus.RESERVED;
      }
    } else if (
      status === RentalListingStatus.RENTED ||
      status === RentalListingStatus.RESERVED
    ) {
      status = RentalListingStatus.ACTIVE;
      isPublished = true;
    }

    await tx.rentalListing.update({
      where: { id: listingId },
      data: {
        totalBeds,
        pendingBeds,
        rentedBeds,
        status,
        isPublished,
      },
      select: { id: true },
    });
  }

  private static async getOwnerSubmissionConversionResult(
    submissionId: string,
    listingId: string,
  ) {
    const [submission, listing] = await Promise.all([
      prisma.rentalOwnerSubmission.findUnique({
        where: { id: submissionId },
        select: adminOwnerSubmissionSelect,
      }),
      prisma.rentalListing.findUnique({
        where: { id: listingId },
        include: adminListingInclude,
      }),
    ]);

    if (!submission || !listing) {
      throw new AppError(
        'Owner submission conversion result was not found',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    return {
      submission,
      listing: this.addAvailableBeds(listing),
    };
  }

  private static logOwnerSubmissionConversionFailure(
    submissionId: string,
    step: string,
    error: unknown,
  ) {
    const prismaError = error instanceof Prisma.PrismaClientKnownRequestError
      ? error
      : null;

    console.error('[rentals] Owner submission conversion failed', {
      submissionId,
      step,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      prismaCode: prismaError?.code,
      prismaMeta: prismaError?.meta,
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
          whatsappPhone: data.whatsappPhone,
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
          whatsappPhone: data.whatsappPhone,
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

  static async listAdminTenants(query: RentalTenantQuery) {
    const where = this.buildAdminTenantWhere(query);

    const [totalCount, tenants] = await prisma.$transaction([
      prisma.rentalTenant.count({ where }),
      prisma.rentalTenant.findMany({
        where,
        ...getPrismaPagination(query),
        select: adminTenantSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      tenants,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminTenantById(id: RentalTenantParams['id']) {
    const tenant = await prisma.rentalTenant.findUnique({
      where: { id },
      select: adminTenantDetailSelect,
    });

    if (!tenant) {
      throw new AppError(
        'Rental tenant not found',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    return tenant;
  }

  private static addAvailableBeds<T extends { totalBeds: number; pendingBeds: number; rentedBeds: number }>(listing: T) {
    return {
      ...listing,
      availableBeds: Math.max((listing.totalBeds ?? 4) - (listing.pendingBeds ?? 0) - (listing.rentedBeds ?? 0), 0),
    };
  }

  private static addAvailableBedsToInquiry<T extends { listing: any }>(inquiry: T) {
    if (inquiry && inquiry.listing) {
      return {
        ...inquiry,
        listing: this.addAvailableBeds(inquiry.listing),
      };
    }
    return inquiry;
  }

  private static async addAdminInquiryContext<T extends { id: string; listing: any }>(inquiries: T[]) {
    if (!inquiries.length) return inquiries;

    const inquiryIds = inquiries.map((inquiry) => inquiry.id);
    const linkedBeds = await prisma.rentalBed.findMany({
      where: { inquiryId: { in: inquiryIds } },
      select: {
        id: true,
        inquiryId: true,
        bedNumber: true,
        status: true,
      },
      orderBy: [{ bedNumber: 'asc' }, { createdAt: 'asc' }],
    });

    const bedByInquiryId = new Map<string, (typeof linkedBeds)[number]>();
    for (const bed of linkedBeds) {
      if (bed.inquiryId && !bedByInquiryId.has(bed.inquiryId)) {
        bedByInquiryId.set(bed.inquiryId, bed);
      }
    }

    return inquiries.map((inquiry) => {
      const linkedBed = bedByInquiryId.get(inquiry.id);

      return {
        ...this.addAvailableBedsToInquiry(inquiry),
        linkedBed: linkedBed
          ? {
              bedId: linkedBed.id,
              bedNumber: linkedBed.bedNumber,
              bedStatus: linkedBed.status,
            }
          : null,
      };
    });
  }

  static async listPublicListings(query: RentalListQuery): Promise<PublicListingsResponse> {
    const startTime = Date.now();
    const normalized: Record<string, any> = {};
    const sortedKeys = Object.keys(query || {}).sort();
    for (const key of sortedKeys) {
      const val = (query as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        normalized[key] = val;
      }
    }
    const cacheKey = JSON.stringify(normalized);
    const nowMs = Date.now();
    const cached = publicListingsCache.get(cacheKey);

    if (cached && cached.expiresAt > nowMs) {
      const durationMs = Date.now() - startTime;
      const listingsCount = cached.data.listings.length;
      const totalCount = cached.data.meta.totalCount;
      console.info(
        `[RentalsPublicListings] cache=HIT durationMs=${durationMs} totalCount=${totalCount} items=${listingsCount} filters=${cacheKey}`
      );
      return cached.data;
    }

    const now = new Date();
    const where = this.buildPublicListingWhere(query, now);

    const [totalCount, listings] = await prisma.$transaction([
      prisma.rentalListing.count({ where }),
      prisma.rentalListing.findMany({
        where,
        ...getPrismaPagination(query),
        select: {
          ...publicListingListSelect,
          pendingBeds: true,
          rentedBeds: true,
        },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const result: PublicListingsResponse = {
      listings: listings.map((listing) => {
        const optimized = withOptimizedRentalImages(listing);
        const withBeds = this.addAvailableBeds(optimized);
        const { pendingBeds, rentedBeds, ...rest } = withBeds as any;
        return rest;
      }),
      meta: getPaginationMeta(query, totalCount),
    };

    publicListingsCache.set(cacheKey, {
      data: result,
      savedAt: Date.now(),
      expiresAt: Date.now() + 30000,
    });

    const durationMs = Date.now() - startTime;
    const listingsCount = result.listings.length;
    console.info(
      `[RentalsPublicListings] cache=MISS durationMs=${durationMs} totalCount=${totalCount} items=${listingsCount} filters=${cacheKey}`
    );

    return result;
  }

  static async getPublicListingBySlug(slug: RentalSlugParams['slug']) {
    const listing = await prisma.rentalListing.findFirst({
      where: {
        slug,
        status: RentalListingStatus.ACTIVE,
        isPublished: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        ...publicListingDetailSelect,
        pendingBeds: true,
        rentedBeds: true,
      },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    const optimized = withOptimizedRentalImages(listing);
    const withBeds = this.addAvailableBeds(optimized);
    const { pendingBeds, rentedBeds, ...rest } = withBeds as any;
    return rest;
  }

  static async createRentalInquiry(
    listingId: RentalIdParams['id'],
    input: CreateRentalInquiryInput,
  ) {
    const tenantPhone = this.normalizePhone(input.tenantPhone);
    const clientRequestId = input.clientRequestId;
    const status =
      input.inquiryType === 'VIEWING_REQUEST'
        ? RentalInquiryStatus.VIEWING_REQUESTED
        : RentalInquiryStatus.NEW;
    let adminNotificationInput: Parameters<typeof AdminNotificationService.createAdminNotification>[0] | null = null;

    try {
      const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.rentalListing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          compoundId: true,
          unitId: true,
          title: true,
          slug: true,
          monthlyRent: true,
          depositAmount: true,
          buildingNumber: true,
          apartmentNumber: true,
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

      if (clientRequestId) {
        const existingInquiry = await this.findExistingClientInquiryBedRequest(tx, clientRequestId, {
          listingId,
          tenantName: input.tenantName,
          tenantPhone,
        });

        if (existingInquiry) {
          return existingInquiry;
        }
      }

      const isExpired = listing.expiresAt !== null && listing.expiresAt <= new Date();

      if (
        listing.status !== RentalListingStatus.ACTIVE ||
        !listing.isPublished ||
        isExpired
      ) {
        if (!isExpired) {
          const availableBedCount = await tx.rentalBed.count({
            where: { listingId, status: RentalBedStatus.AVAILABLE },
          });
          if (availableBedCount === 0) {
            await this.syncListingCountersFromBeds(listingId, tx);
            throw new AppError(
              'لا توجد سراير متاحة لهذا الإعلان',
              409,
              ErrorCodes.RENTAL_INQUIRY_LISTING_UNAVAILABLE,
            );
          }
        }

        throw new AppError(
          'Rental listing is not available for inquiries',
          409,
          ErrorCodes.RENTAL_INQUIRY_LISTING_UNAVAILABLE,
        );
      }

      const availableBeds = await tx.$queryRaw<Array<{ id: string; bedNumber: number }>>`
        SELECT id
             , bed_number AS "bedNumber"
        FROM rental_beds
        WHERE listing_id = ${listingId}
          AND status = 'AVAILABLE'::"RentalBedStatus"
        ORDER BY bed_number ASC
        LIMIT 1
        FOR UPDATE
      `;
      const selectedBedId = availableBeds[0]?.id;

      if (!selectedBedId) {
        throw new AppError(
          'لا توجد سراير متاحة لهذا الإعلان',
          409,
          ErrorCodes.RENTAL_INQUIRY_LISTING_UNAVAILABLE,
        );
      }

      const inquiry = await tx.rentalInquiry.create({
        data: {
          id: clientRequestId,
          listingId: listing.id,
          compoundId: listing.compoundId,
          tenantName: input.tenantName,
          tenantPhone,
          tenantEmail: input.tenantEmail,
          tenantNationalId: cleanText(input.tenantNationalId),
          message: this.buildWhatsAppInquiryMessage(input, tenantPhone, listing),
          status,
        },
        select: {
          id: true,
          status: true,
        },
      });

      await tx.rentalBed.update({
        where: { id: selectedBedId },
        data: {
          status: RentalBedStatus.RESERVED,
          inquiryId: inquiry.id,
          reservationId: null,
        },
      });
      const syncedListing = await this.syncListingCountersFromBeds(listingId, tx);

      adminNotificationInput = {
        compoundId: listing.compoundId,
        eventType: AdminNotificationEventType.RENTAL_INQUIRY_CREATED,
        title: 'طلب إيجار جديد',
        body: `تم استلام طلب إيجار جديد من ${input.tenantName.trim()} على إعلان ${listing.title}.`,
        entityType: AdminNotificationEntityType.RENTAL_INQUIRY,
        entityId: inquiry.id,
        targetUrl: `/rentals/inquiries/${inquiry.id}`,
        metadata: {
          tenantName: input.tenantName.trim(),
          tenantPhone,
          listingId: listing.id,
          listingTitle: listing.title,
          bedId: selectedBedId,
          bedNumber: availableBeds[0].bedNumber,
          buildingNumber: listing.buildingNumber ?? null,
          apartmentNumber: listing.apartmentNumber ?? null,
        },
        dedupeKey: `rental-inquiry-created:${inquiry.id}`,
      };

      return {
        ...inquiry,
        bedNumber: availableBeds[0].bedNumber,
        remainingAvailableBeds: syncedListing.availableBeds,
      };
      });

      if (adminNotificationInput) {
        await this.emitAdminNotificationSafely(adminNotificationInput);
      }

      return result;
    } catch (error) {
      if (
        clientRequestId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return prisma.$transaction(async (tx) => {
          const existingInquiry = await this.findExistingClientInquiryBedRequest(tx, clientRequestId, {
            listingId,
            tenantName: input.tenantName,
            tenantPhone,
          });

          if (existingInquiry) return existingInquiry;
          throw error;
        });
      }

      throw error;
    }
  }

  static async startContactUnlockPayment(
    listingId: RentalIdParams['id'],
    input: TenantPaymentRequestInput,
  ) {
    void listingId;
    void input;

    throw new AppError(
      'تم إيقاف الدفع الإلكتروني لهذا النوع من الحجز. يرجى استخدام الحجز عبر واتساب.',
      410,
      ErrorCodes.BAD_REQUEST,
    );
  }

  static async getContactAccess(
    listingId: RentalIdParams['id'],
    query: ContactAccessQuery,
  ) {
    void query;

    const listing = await prisma.rentalListing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    return {
      unlocked: false,
      ownerContact: null,
    };
  }

  static async startReservationPayment(
    listingId: RentalIdParams['id'],
    input: TenantPaymentRequestInput,
  ) {
    const tenantPhone = this.normalizePhone(input.tenantPhone);
    const clientRequestId = input.clientRequestId;
    const now = new Date();

    try {
      return await prisma.$transaction(async (tx) => {
      const listingForReservation = await tx.rentalListing.findUnique({
        where: { id: listingId },
      });

      if (!listingForReservation) {
        throw new AppError(
          'Rental listing not found',
          404,
          ErrorCodes.RENTAL_LISTING_NOT_FOUND,
        );
      }

      if (clientRequestId) {
        const existingReservation = await this.findExistingClientReservationBedRequest(tx, clientRequestId, {
          listingId,
          tenantName: input.tenantName,
          tenantPhone,
        });

        if (existingReservation) {
          return existingReservation;
        }
      }

      const isExpired = listingForReservation.expiresAt !== null && listingForReservation.expiresAt <= now;

      if (
        listingForReservation.status !== RentalListingStatus.ACTIVE ||
        !listingForReservation.isPublished ||
        isExpired
      ) {
        if (!isExpired) {
          const availableBedCount = await tx.rentalBed.count({
            where: { listingId, status: RentalBedStatus.AVAILABLE },
          });
          if (availableBedCount === 0) {
            await this.syncListingCountersFromBeds(listingId, tx);
            throw new AppError(
              'لا توجد سراير متاحة لهذا الإعلان',
              409,
              ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
            );
          }
        }

        throw new AppError(
          'Rental listing is not available',
          409,
          ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
        );
      }

      const availableBeds = await tx.$queryRaw<Array<{ id: string; bedNumber: number }>>`
        SELECT id
             , bed_number AS "bedNumber"
        FROM rental_beds
        WHERE listing_id = ${listingId}
          AND status = 'AVAILABLE'::"RentalBedStatus"
        ORDER BY bed_number ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
      const selectedBed = availableBeds[0];

      if (!selectedBed) {
        await this.syncListingCountersFromBeds(listingId, tx);
        throw new AppError(
          'لا توجد سراير متاحة لهذا الإعلان',
          409,
          ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
        );
      }

      const createdReservation = await tx.rentalReservation.create({
        data: {
          id: clientRequestId,
          listingId: listingForReservation.id,
          compoundId: listingForReservation.compoundId,
          tenantName: input.tenantName,
          tenantPhone,
          tenantEmail: input.tenantEmail,
          amount: 0,
          currency: RENTAL_POLICY.currency,
          status: RentalReservationStatus.RESERVED,
          reservedUntil: null,
        },
      });

      await tx.rentalBed.update({
        where: { id: selectedBed.id },
        data: {
          status: RentalBedStatus.RESERVED,
          reservationId: createdReservation.id,
          inquiryId: null,
        },
      });

      const syncedListing = await this.syncListingCountersFromBeds(listingId, tx);

      return {
        reservation: createdReservation,
        payment: null,
        paymentUrl: null,
        bedNumber: selectedBed.bedNumber,
        remainingAvailableBeds: syncedListing.availableBeds,
      };
      });
    } catch (error) {
      if (
        clientRequestId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return prisma.$transaction(async (tx) => {
          const existingReservation = await this.findExistingClientReservationBedRequest(tx, clientRequestId, {
            listingId,
            tenantName: input.tenantName,
            tenantPhone,
          });

          if (existingReservation) return existingReservation;
          throw error;
        });
      }

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
      listings: listings.map((l) => this.addAvailableBeds(l)),
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

    return this.addAvailableBeds(listing);
  }

  static async listAdminListingBeds(listingId: string) {
    const listing = await prisma.rentalListing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    return prisma.rentalBed.findMany({
      where: { listingId },
      select: adminBedSelect,
      orderBy: { bedNumber: 'asc' },
    });
  }

  static async updateAdminBedStatus(
    bedId: string,
    input: UpdateRentalBedStatusInput,
  ) {
    if (!Object.values(RentalBedStatus).includes(input.status)) {
      throw new AppError('Invalid rental bed status', 400, ErrorCodes.BAD_REQUEST);
    }

    return prisma.$transaction(async (tx) => {
      const bed = await tx.rentalBed.findUnique({
        where: { id: bedId },
        select: adminBedSelect,
      });

      if (!bed) {
        throw new AppError('Rental bed not found', 404, ErrorCodes.NOT_FOUND);
      }

      const targetStatus = input.status;
      const isSameStatus = bed.status === targetStatus;
      if (
        !isSameStatus &&
        !allowedBedStatusTransitions[bed.status].includes(targetStatus)
      ) {
        throw new AppError(
          `Cannot transition rental bed from ${bed.status} to ${targetStatus}`,
          409,
          ErrorCodes.CONFLICT,
        );
      }

      const hasNotes = Object.prototype.hasOwnProperty.call(input, 'notes');
      const hasInquiryId = Object.prototype.hasOwnProperty.call(input, 'inquiryId');
      const hasReservationId = Object.prototype.hasOwnProperty.call(input, 'reservationId');
      const data: Prisma.RentalBedUncheckedUpdateInput = {
        status: targetStatus,
        ...(hasNotes ? { notes: input.notes ?? null } : {}),
      };

      if (
        targetStatus === RentalBedStatus.AVAILABLE ||
        targetStatus === RentalBedStatus.OUT_OF_SERVICE
      ) {
        data.inquiryId = null;
        data.reservationId = null;
      } else {
        if (hasInquiryId) data.inquiryId = input.inquiryId;
        if (hasReservationId) data.reservationId = input.reservationId;
      }

      const updatedBed = await tx.rentalBed.update({
        where: { id: bed.id },
        data,
        select: adminBedSelect,
      });

      const listing = await this.syncListingCountersFromBeds(bed.listingId, tx);

      return {
        bed: updatedBed,
        listing,
      };
    });
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
      inquiries: await this.addAdminInquiryContext(inquiries),
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

    const [enrichedInquiry] = await this.addAdminInquiryContext([inquiry]);
    return enrichedInquiry;
  }

  static async updateAdminInquiryStatus(
    id: RentalInquiryParams['id'],
    input: UpdateRentalInquiryStatusInput,
  ) {
    const inquiry = await prisma.rentalInquiry.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!inquiry) {
      throw new AppError(
        'Rental inquiry not found',
        404,
        ErrorCodes.RENTAL_INQUIRY_NOT_FOUND,
      );
    }

    const currentStatus = inquiry.status;
    const newStatus = input.status;

    if (currentStatus === newStatus) {
      return this.getAdminInquiryById(id);
    }

    const pendingStatuses: RentalInquiryStatus[] = [
      RentalInquiryStatus.NEW,
      RentalInquiryStatus.VIEWING_REQUESTED,
      RentalInquiryStatus.CONTACT_UNLOCKED,
    ];

    const isCurrentPending = pendingStatuses.includes(currentStatus);
    const isNewResolved = (
      [RentalInquiryStatus.CLOSED, RentalInquiryStatus.CANCELLED] as RentalInquiryStatus[]
    ).includes(newStatus);

    if (isNewResolved && !isCurrentPending) {
      throw new AppError(
        'Only pending inquiries can be accepted or rejected',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.rentalListing.findUnique({
        where: { id: inquiry.listingId },
      });

      if (!listing) {
        throw new AppError('Listing associated with inquiry not found', 404, ErrorCodes.RENTAL_LISTING_NOT_FOUND);
      }

      let rentedBed: { id: string; bedNumber: number } | null = null;

      if (newStatus === RentalInquiryStatus.CLOSED) {
        const linkedBed = await tx.rentalBed.findFirst({
          where: {
            inquiryId: inquiry.id,
          },
          select: adminBedSelect,
        });

        if (!linkedBed) {
          throw new AppError(
            'لا يمكن تأكيد الإيجار لأن الطلب غير مرتبط بسرير محجوز.',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        if (input.bedId && input.bedId !== linkedBed.id) {
          throw new AppError(
            'يجب أن يطابق السرير المحدد السرير المرتبط بالطلب.',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        if (linkedBed.listingId !== inquiry.listingId) {
          throw new AppError(
            'السرير المرتبط لا ينتمي إلى هذا الإعلان.',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        if (linkedBed.status !== RentalBedStatus.RESERVED) {
          throw new AppError(
            'يجب أن يظل السرير المرتبط محجوزا قبل تأكيد الإيجار.',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        if (
          linkedBed.inquiryId &&
          linkedBed.inquiryId !== inquiry.id
        ) {
          throw new AppError(
            'السرير المرتبط مرتبط بطلب آخر.',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        await tx.rentalBed.update({
          where: { id: linkedBed.id },
          data: {
            status: RentalBedStatus.RENTED,
            inquiryId: inquiry.id,
            reservationId: null,
          },
        });

        rentedBed = linkedBed;
      } else if (newStatus === RentalInquiryStatus.CANCELLED) {
        await tx.rentalBed.updateMany({
          where: {
            listingId: inquiry.listingId,
            inquiryId: inquiry.id,
            status: RentalBedStatus.RESERVED,
          },
          data: {
            status: RentalBedStatus.AVAILABLE,
            inquiryId: null,
            reservationId: null,
          },
        });
      }

      const updated = await tx.rentalInquiry.update({
        where: { id },
        data: { status: newStatus },
        select: adminInquirySelect,
      });

      if (newStatus === RentalInquiryStatus.CLOSED || newStatus === RentalInquiryStatus.CANCELLED) {
        await this.syncListingCountersFromBeds(inquiry.listingId, tx);
      }

      return {
        updated,
        listing,
        rentedBed,
      };
    });

    if (newStatus === RentalInquiryStatus.CLOSED) {
      await this.ensureRentalTenantForInquiry({
        inquiry: {
          ...inquiry,
          listing: result.listing,
        },
        bed: result.rentedBed,
        startedAt: new Date(),
      });
    }

    const [enrichedInquiry] = await this.addAdminInquiryContext([result.updated]);
    return enrichedInquiry;
  }

  static async deleteAdminInquiry(id: RentalInquiryParams['id']): Promise<DeleteRentalInquiryResult> {
    return prisma.$transaction(async (tx) => {
      const inquiry = await tx.rentalInquiry.findUnique({
        where: { id },
        include: {
          rentalTenant: {
            select: { id: true },
          },
        },
      });

      if (!inquiry) {
        throw new AppError(
          'Rental inquiry not found',
          404,
          ErrorCodes.RENTAL_INQUIRY_NOT_FOUND,
        );
      }

      if (inquiry.status === RentalInquiryStatus.CLOSED && inquiry.rentalTenant) {
        throw new AppError(
          'لا يمكن حذف طلب تم تأجيره وله مستأجر مرتبط. احذف المستأجر أولاً أو استخدم إلغاء/أرشفة.',
          409,
          ErrorCodes.CONFLICT,
        );
      }

      const linkedBed = await tx.rentalBed.findFirst({
        where: { inquiryId: inquiry.id },
        select: adminBedSelect,
      });

      let releasedBed: DeleteRentalInquiryResult['releasedBed'] = null;

      if (linkedBed?.status === RentalBedStatus.RESERVED) {
        await tx.rentalBed.update({
          where: { id: linkedBed.id },
          data: {
            status: RentalBedStatus.AVAILABLE,
            inquiryId: null,
            reservationId: null,
          },
        });

        releasedBed = {
          bedId: linkedBed.id,
          bedNumber: linkedBed.bedNumber,
        };
      } else if (linkedBed) {
        await tx.rentalBed.update({
          where: { id: linkedBed.id },
          data: {
            inquiryId: null,
          },
        });
      }

      await tx.rentalInquiry.delete({
        where: { id: inquiry.id },
      });

      if (releasedBed) {
        await this.syncListingCountersFromBeds(inquiry.listingId, tx);
      }

      return {
        id: inquiry.id,
        releasedBed,
      };
    });
  }

  static async deleteAdminOwnerSubmission(id: OwnerSubmissionParams['id']): Promise<DeleteRentalOwnerSubmissionResult> {
    const submission = await prisma.rentalOwnerSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdListingId: true,
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
        'لا يمكن حذف طلب تم تحويله لإعلان. احذف الإعلان أو افصل العلاقة أولاً.',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    await prisma.rentalOwnerSubmission.delete({
      where: { id: submission.id },
    });

    return { id: submission.id };
  }

  static async deleteAdminTenant(id: RentalTenantParams['id']): Promise<DeleteRentalTenantResult> {
    const tenant = await prisma.rentalTenant.findUnique({
      where: { id },
      select: {
        id: true,
        bedId: true,
        bedNumber: true,
        status: true,
      },
    });

    if (!tenant) {
      throw new AppError(
        'Rental tenant not found',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    await prisma.rentalTenant.delete({
      where: { id: tenant.id },
    });

    return {
      id: tenant.id,
      warning: tenant.bedId
        ? 'تم حذف بيانات المستأجر فقط ولم يتم تعديل حالة السرير أو الإعلان.'
        : null,
    };
  }

  static async deleteRentalOwner(id: RentalOwnerParams['id']): Promise<DeleteRentalOwnerResult> {
    return prisma.$transaction(async (tx) => {
      const owner = await tx.rentalOwner.findUnique({
        where: { id },
        select: {
          id: true,
          compoundId: true,
          phone: true,
          whatsappPhone: true,
          nationalId: true,
        },
      });

      if (!owner) {
        throw new AppError(
          'Rental owner not found',
          404,
          ErrorCodes.RENTAL_OWNER_NOT_FOUND,
        );
      }

      const listings = await tx.rentalListing.findMany({
        where: { ownerId: owner.id },
        select: { id: true },
      });
      const listingIds = listings.map((listing) => listing.id);

      const submissionsWhere: Prisma.RentalOwnerSubmissionWhereInput = {
        compoundId: owner.compoundId,
        OR: [
          { ownerPhone: owner.phone },
          ...(owner.whatsappPhone ? [{ ownerWhatsapp: owner.whatsappPhone }] : []),
          ...(owner.nationalId ? [{ ownerNationalId: owner.nationalId }] : []),
          ...(listingIds.length > 0 ? [{ createdListingId: { in: listingIds } }] : []),
        ],
      };

      const [submissions, tenants] = await Promise.all([
        tx.rentalOwnerSubmission.findMany({
          where: submissionsWhere,
          select: { id: true },
        }),
        tx.rentalTenant.findMany({
          where: {
            OR: [
              { ownerId: owner.id },
              ...(listingIds.length > 0 ? [{ listingId: { in: listingIds } }] : []),
            ],
          },
          select: { id: true },
        }),
      ]);

      const [inquiries, beds, reservations, contactUnlocks] = listingIds.length > 0
        ? await Promise.all([
            tx.rentalInquiry.findMany({
              where: { listingId: { in: listingIds } },
              select: { id: true },
            }),
            tx.rentalBed.findMany({
              where: { listingId: { in: listingIds } },
              select: { id: true },
            }),
            tx.rentalReservation.findMany({
              where: { listingId: { in: listingIds } },
              select: { id: true },
            }),
            tx.rentalContactUnlock.findMany({
              where: { listingId: { in: listingIds } },
              select: { id: true },
            }),
          ])
        : [[], [], [], []];

      const notificationEntityIds = [
        ...listingIds,
        ...submissions.map((submission) => submission.id),
        ...tenants.map((tenant) => tenant.id),
        ...inquiries.map((inquiry) => inquiry.id),
      ];

      const deletedNotifications = notificationEntityIds.length > 0
        ? (await tx.adminNotification.deleteMany({
            where: {
              entityType: {
                in: [
                  AdminNotificationEntityType.RENTAL_LISTING,
                  AdminNotificationEntityType.RENTAL_OWNER_SUBMISSION,
                  AdminNotificationEntityType.RENTAL_INQUIRY,
                  AdminNotificationEntityType.RENTAL_TENANT,
                ],
              },
              entityId: { in: notificationEntityIds },
            },
          })).count
        : 0;

      const deletedTenants = (await tx.rentalTenant.deleteMany({
        where: {
          OR: [
            { ownerId: owner.id },
            ...(listingIds.length > 0 ? [{ listingId: { in: listingIds } }] : []),
          ],
        },
      })).count;

      const deletedInquiries = listingIds.length > 0
        ? (await tx.rentalInquiry.deleteMany({
            where: { listingId: { in: listingIds } },
          })).count
        : 0;

      const deletedReservations = listingIds.length > 0
        ? (await tx.rentalReservation.deleteMany({
            where: { listingId: { in: listingIds } },
          })).count
        : 0;

      const deletedContactUnlocks = listingIds.length > 0
        ? (await tx.rentalContactUnlock.deleteMany({
            where: { listingId: { in: listingIds } },
          })).count
        : 0;

      const deletedBeds = listingIds.length > 0
        ? (await tx.rentalBed.deleteMany({
            where: { listingId: { in: listingIds } },
          })).count
        : 0;

      const deletedOwnerSubmissions = (await tx.rentalOwnerSubmission.deleteMany({
        where: submissionsWhere,
      })).count;

      const deletedListings = (await tx.rentalListing.deleteMany({
        where: { ownerId: owner.id },
      })).count;

      await tx.rentalOwner.delete({
        where: { id: owner.id },
      });

      return {
        deletedOwnerId: owner.id,
        deletedListings,
        deletedBeds,
        deletedInquiries,
        deletedTenants,
        deletedOwnerSubmissions,
        deletedReservations,
        deletedContactUnlocks,
        deletedNotifications,
      };
    });
  }

  static async createAdminListing(input: AdminCreateListingInput) {
    const compound = await this.resolveAdminListingCompound(input.compoundId);
    const ownerPhone = this.normalizePhone(input.ownerPhone);
    const ownerWhatsapp = this.normalizePhone(input.ownerWhatsapp);
    const title = cleanText(input.title) ?? buildAdminListingTitle(input);
    const description = cleanText(input.description) ?? buildAdminListingDescription(input);
    const furnishingStatus = deriveFurnishingStatus(input.unitCondition, input.furnishingStatus);

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
      slug = await this.createUniqueSlug(title);
    }

    this.validateListingBeds(
      RentalListingStatus.PENDING_REVIEW,
      false,
      input.totalBeds ?? 4,
      0,
      0
    );

    return prisma.$transaction(async (tx) => {
      const owner = await this.resolveAdminListingOwner(tx, {
        compoundId: compound.id,
        ownerId: input.ownerId,
        ownerName: input.ownerName,
        ownerPhone,
        ownerWhatsapp,
      });

      const unitId = input.unitId
        ? await this.resolveAdminListingUnit(tx, compound.id, input.unitId)
        : await this.createAdminListingUnit(tx, {
            compoundId: compound.id,
            areaSqm: 63,
            floor: input.floor ?? 0,
          });

      const listing = await tx.rentalListing.create({
        data: {
          compoundId: compound.id,
          ownerId: owner.id,
          unitId,
          title,
          slug,
          description,
          listingType: 'APARTMENT',
          furnishingStatus,
          unitCondition: cleanText(input.unitCondition),
          basics: cleanText(input.basics),
          amenities: cleanText(input.amenities),
          bedrooms: 2,
          bathrooms: 1,
          areaSqm: 63,
          floor: input.floor,
          isAirConditioned: input.isAirConditioned ?? false,
          basicFeatures: RentalService.normalizeBasicFeatures(input.basicFeatures),
          extraAmenitiesText: cleanText(input.extraAmenitiesText),
          monthlyRent: input.monthlyRent,
          depositAmount: input.depositAmount !== undefined ? input.depositAmount : RentalService.calculateDeposit(input.monthlyRent),
          contactUnlockFee: input.contactUnlockFee ?? RENTAL_POLICY.tenantContactUnlockFee,
          reservationFee: input.reservationFee ?? RENTAL_POLICY.reservationHoldFee,
          platformCommissionRate:
            input.platformCommissionRate ?? RENTAL_POLICY.platformCommissionRate,
          addressText: cleanText(input.addressText),
          locationText: cleanText(input.locationText),
          buildingNumber: cleanText(input.buildingNumber),
          apartmentNumber: cleanText(input.apartmentNumber),
          status: RentalListingStatus.PENDING_REVIEW,
          isFeatured: input.isFeatured ?? false,
          totalBeds: input.totalBeds ?? 4,
          pendingBeds: 0,
          rentedBeds: 0,
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
      await RentalService.syncListingBeds(tx, listing.id, listing.totalBeds);
      return RentalService.syncListingCountersFromBeds(listing.id, tx);
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

    const targetTotalBeds = input.totalBeds !== undefined ? input.totalBeds : existing.totalBeds;
    const targetPendingBeds = existing.pendingBeds;
    const targetRentedBeds = existing.rentedBeds;
    const targetStatus = existing.status;
    const targetIsPublished = existing.isPublished;

    this.validateListingBeds(
      targetStatus,
      targetIsPublished,
      targetTotalBeds,
      targetPendingBeds,
      targetRentedBeds
    );

    return prisma.$transaction(async (tx) => {
      if (input.images) {
        await tx.rentalListingImage.deleteMany({ where: { listingId: id } });
      }

      const owner = input.ownerName && input.ownerPhone && input.ownerWhatsapp
        ? await this.resolveAdminListingOwner(tx, {
            compoundId: existing.compoundId,
            ownerId: input.ownerId,
            ownerName: input.ownerName,
            ownerPhone: this.normalizePhone(input.ownerPhone),
            ownerWhatsapp: this.normalizePhone(input.ownerWhatsapp),
          })
        : undefined;

      const listing = await tx.rentalListing.update({
        where: { id },
        data: {
          ownerId: owner?.id ?? input.ownerId,
          unitId: input.unitId,
          title: input.title,
          slug,
          isFeatured: input.isFeatured,
          description: input.description,
          listingType: input.listingType,
          furnishingStatus: input.furnishingStatus,
          unitCondition: input.unitCondition,
          basics: input.basics,
          amenities: input.amenities,
          bedrooms: 2,
          bathrooms: input.bathrooms,
          areaSqm: 63,
          floor: input.floor,
          isAirConditioned: input.isAirConditioned,
          basicFeatures: input.basicFeatures !== undefined ? RentalService.normalizeBasicFeatures(input.basicFeatures) : undefined,
          extraAmenitiesText: input.extraAmenitiesText !== undefined ? cleanText(input.extraAmenitiesText) : undefined,
          monthlyRent: input.monthlyRent,
          depositAmount: input.depositAmount !== undefined ? input.depositAmount : (input.monthlyRent !== undefined ? RentalService.calculateDeposit(input.monthlyRent) : undefined),
          contactUnlockFee: input.contactUnlockFee,
          reservationFee: input.reservationFee,
          platformCommissionRate: input.platformCommissionRate,
          addressText: input.addressText,
          locationText: input.locationText,
          buildingNumber: input.buildingNumber !== undefined ? cleanText(input.buildingNumber) : undefined,
          apartmentNumber: input.apartmentNumber !== undefined ? cleanText(input.apartmentNumber) : undefined,
          totalBeds: input.totalBeds,
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
      await RentalService.syncListingBeds(tx, listing.id, listing.totalBeds);
      return RentalService.syncListingCountersFromBeds(listing.id, tx);
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

    this.validateListingBeds(
      RentalListingStatus.ACTIVE,
      true,
      listing.totalBeds,
      listing.pendingBeds,
      listing.rentedBeds
    );

    const now = new Date();

    const updated = await prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.ACTIVE,
        isPublished: true,
        publishedAt: now,
        expiresAt: addDays(now, RENTAL_POLICY.listingDurationDays),
      },
      include: adminListingInclude,
    });
    return this.addAvailableBeds(updated);
  }

  static async deleteAdminListing(id: RentalIdParams['id']) {
    await this.getAdminListingById(id);

    const updated = await prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.REMOVED,
        isPublished: false,
      },
      include: adminListingInclude,
    });
    return this.addAvailableBeds(updated);
  }

  static async unpublishAdminListing(id: RentalIdParams['id']) {
    await this.getAdminListingById(id);

    const updated = await prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.SUSPENDED,
        isPublished: false,
      },
      include: adminListingInclude,
    });
    return this.addAvailableBeds(updated);
  }

  static async markAdminListingAvailable(id: RentalIdParams['id']) {
    const listing = await this.getAdminListingById(id);

    const availableSourceStatuses: RentalListingStatus[] = [
      RentalListingStatus.RESERVED,
      RentalListingStatus.RENTED,
      RentalListingStatus.SUSPENDED,
      RentalListingStatus.PAYMENT_LOCKED,
    ];

    if (!availableSourceStatuses.includes(listing.status)) {
      throw new AppError(
        'Rental listing cannot be marked available in its current status',
        409,
        ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
      );
    }

    this.validateListingBeds(
      RentalListingStatus.ACTIVE,
      true,
      listing.totalBeds,
      listing.pendingBeds,
      listing.rentedBeds
    );

    const updated = await prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.ACTIVE,
        isPublished: true,
        reservedUntil: null,
      },
      include: adminListingInclude,
    });
    return this.addAvailableBeds(updated);
  }

  static async markAdminListingRented(id: RentalIdParams['id']) {
    const listing = await this.getAdminListingById(id);

    const rentableSourceStatuses: RentalListingStatus[] = [
      RentalListingStatus.RESERVED,
      RentalListingStatus.ACTIVE,
    ];

    if (!rentableSourceStatuses.includes(listing.status)) {
      throw new AppError(
        'Rental listing cannot be marked rented in its current status',
        409,
        ErrorCodes.RENTAL_LISTING_NOT_AVAILABLE,
      );
    }

    const updated = await prisma.rentalListing.update({
      where: { id },
      data: {
        status: RentalListingStatus.RENTED,
        isPublished: false,
        reservedUntil: null,
        rentedAt: new Date(),
      },
      include: adminListingInclude,
    });
    return this.addAvailableBeds(updated);
  }

  static async confirmReservation(id: RentalIdParams['id']) {
    const result = await prisma.$transaction(async (tx) => {
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

      const linkedBed = await tx.rentalBed.findFirst({
        where: { reservationId: reservation.id },
        select: {
          id: true,
          bedNumber: true,
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
        listing: this.addAvailableBeds(listing),
        tenantSource: {
          ...reservation,
          listing: reservation.listing,
        },
        linkedBed,
        startedAt: now,
      };
    });

    await this.ensureRentalTenantForReservation({
      reservation: result.tenantSource,
      bed: result.linkedBed,
      startedAt: result.startedAt,
    });

    return {
      reservation: result.reservation,
      listing: result.listing,
    };
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

      // Release any RESERVED bed linked to this reservation back to AVAILABLE.
      // RENTED beds are not touched — they were committed by a separate admin action.
      await tx.rentalBed.updateMany({
        where: {
          listingId: reservation.listingId,
          reservationId: reservation.id,
          status: RentalBedStatus.RESERVED,
        },
        data: {
          status: RentalBedStatus.AVAILABLE,
          reservationId: null,
          inquiryId: null,
        },
      });

      if (reservation.listing.status !== RentalListingStatus.RENTED) {
        await tx.rentalListing.update({
          where: { id: reservation.listingId },
          data: {
            status: RentalListingStatus.ACTIVE,
            reservedUntil: null,
          },
        });
      }

      // Sync counters from beds after releasing the reserved bed
      const syncedListing = await this.syncListingCountersFromBeds(reservation.listingId, tx);

      return {
        reservation: cancelledReservation,
        listing: this.addAvailableBeds(syncedListing),
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

  private static buildAdminTenantWhere(query: RentalTenantQuery) {
    const where: Prisma.RentalTenantWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { nationalId: { contains: query.search, mode: 'insensitive' } },
        { buildingNumber: { contains: query.search, mode: 'insensitive' } },
        { apartmentNumber: { contains: query.search, mode: 'insensitive' } },
        { listing: { title: { contains: query.search, mode: 'insensitive' } } },
        { owner: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.compoundId) where.compoundId = query.compoundId;
    if (query.listingId) where.listingId = query.listingId;
    if (query.ownerId) where.ownerId = query.ownerId;
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

  private static buildWhatsAppInquiryMessage(
    input: CreateRentalInquiryInput,
    tenantPhone: string,
    listing: {
      id: string;
      title: string;
      slug: string;
      unitId: string | null;
      monthlyRent: Prisma.Decimal;
      depositAmount: Prisma.Decimal | null;
    },
  ) {
    const lines = [
      'طلب تواصل واتساب للإيجار',
      `اسم العميل: ${input.tenantName.trim()}`,
      `رقم الموبايل: ${tenantPhone}`,
    ];

    if (input.tenantNationalId) {
      lines.push(`الرقم القومي: ${input.tenantNationalId}`);
    }

    lines.push(
      `عنوان الإعلان: ${listing.title}`,
      `معرف الإعلان: ${listing.id}`,
      `رابط الإعلان: ${listing.slug}`,
    );

    if (listing.unitId) {
      lines.push(`معرف الوحدة: ${listing.unitId}`);
    }

    lines.push(`الإيجار الشهري: ${listing.monthlyRent.toString()}`);

    if (listing.depositAmount !== null) {
      lines.push(`مبلغ التأمين: ${listing.depositAmount.toString()}`);
    }

    if (input.message) {
      lines.push('', 'رسالة العميل:', input.message.trim());
    }

    return lines.join('\n');
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
      whatsappPhone: input.whatsappPhone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      nationalId: input.nationalId?.trim() || undefined,
      residentId: input.residentId || undefined,
    };
  }

  private static async resolveAdminListingCompound(compoundId?: string) {
    const compound = compoundId
      ? await prisma.compound.findUnique({ where: { id: compoundId } })
      : await prisma.compound.findFirst({
          where: {
            code: DEFAULT_RENTAL_COMPOUND_CODE,
            isActive: true,
          },
        });

    if (!compound || !compound.isActive) {
      throw new AppError('Active compound not found', 404, ErrorCodes.NOT_FOUND);
    }

    return compound;
  }

  private static async resolveAdminListingOwner(
    tx: Prisma.TransactionClient,
    input: {
      compoundId: string;
      ownerId?: string;
      ownerName: string;
      ownerPhone: string;
      ownerWhatsapp: string;
    },
  ) {
    if (input.ownerId) {
      const owner = await tx.rentalOwner.findUnique({ where: { id: input.ownerId } });
      if (!owner || owner.compoundId !== input.compoundId) {
        throw new AppError('Rental owner not found', 404, ErrorCodes.NOT_FOUND);
      }

      return tx.rentalOwner.update({
        where: { id: owner.id },
        data: {
          fullName: owner.fullName || input.ownerName.trim(),
          phone: owner.phone || input.ownerPhone,
          whatsappPhone: owner.whatsappPhone || input.ownerWhatsapp,
          status: RentalOwnerStatus.ACTIVE,
        },
      });
    }

    const owner = await tx.rentalOwner.findFirst({
      where: {
        compoundId: input.compoundId,
        OR: [
          { phone: input.ownerPhone },
          { phone: input.ownerWhatsapp },
          { whatsappPhone: input.ownerPhone },
          { whatsappPhone: input.ownerWhatsapp },
        ],
      },
    });

    if (owner) {
      return tx.rentalOwner.update({
        where: { id: owner.id },
        data: {
          fullName: owner.fullName || input.ownerName.trim(),
          whatsappPhone: owner.whatsappPhone || input.ownerWhatsapp,
          status: RentalOwnerStatus.ACTIVE,
        },
      });
    }

    return tx.rentalOwner.create({
      data: {
        compoundId: input.compoundId,
        fullName: input.ownerName.trim(),
        phone: input.ownerPhone,
        whatsappPhone: input.ownerWhatsapp,
        status: RentalOwnerStatus.ACTIVE,
      },
    });
  }

  private static async resolveAdminListingUnit(
    tx: Prisma.TransactionClient,
    compoundId: string,
    unitId: string,
  ) {
    const unit = await tx.unit.findUnique({ where: { id: unitId } });
    if (!unit || unit.compoundId !== compoundId) {
      throw new AppError('Unit not found for this compound', 404, ErrorCodes.NOT_FOUND);
    }

    return unit.id;
  }

  private static async createAdminListingUnit(
    tx: Prisma.TransactionClient,
    input: {
      compoundId: string;
      areaSqm: number;
      floor: number;
    },
  ) {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const unit = await tx.unit.create({
      data: {
        compoundId: input.compoundId,
        unitNumber: `rental-${suffix}`,
        unitType: 'APARTMENT',
        floor: input.floor,
        areaSqm: input.areaSqm,
        status: UnitStatus.VACANT,
      },
    });

    return unit.id;
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

  private static warnTenantCreationSkipped(reason: string, context: Record<string, unknown>) {
    console.warn(`[rentals] Skipped rental tenant creation: ${reason}`, context);
  }

  private static async emitAdminNotificationSafely(
    input: Parameters<typeof AdminNotificationService.createAdminNotification>[0],
  ) {
    try {
      await AdminNotificationService.createAdminNotification(input);
    } catch (error) {
      console.warn('[rentals] Failed to emit admin notification', {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        dedupeKey: input.dedupeKey,
        error,
      });
    }
  }

  private static isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private static buildRentalTenantData(input: {
    compoundId?: string | null;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    nationalId?: string | null;
    inquiryId?: string | null;
    reservationId?: string | null;
    listingId?: string | null;
    unitId?: string | null;
    bedId?: string | null;
    ownerId?: string | null;
    buildingNumber?: string | null;
    apartmentNumber?: string | null;
    bedNumber?: number | null;
    startedAt: Date;
  }) {
    const fullName = cleanText(input.fullName);
    const phone = cleanText(input.phone);

    if (!fullName || !phone || !input.compoundId || !input.listingId) {
      this.warnTenantCreationSkipped('missing required tenant identity or listing data', {
        inquiryId: input.inquiryId,
        reservationId: input.reservationId,
        listingId: input.listingId,
        hasFullName: Boolean(fullName),
        hasPhone: Boolean(phone),
        hasCompoundId: Boolean(input.compoundId),
      });
      return null;
    }

    return {
      compoundId: input.compoundId,
      fullName,
      phone,
      email: cleanText(input.email) ?? null,
      nationalId: cleanText(input.nationalId) ?? null,
      status: RentalTenantStatus.ACTIVE,
      inquiryId: input.inquiryId ?? null,
      reservationId: input.reservationId ?? null,
      listingId: input.listingId,
      unitId: input.unitId ?? null,
      bedId: input.bedId ?? null,
      ownerId: input.ownerId ?? null,
      buildingNumber: cleanText(input.buildingNumber) ?? null,
      apartmentNumber: cleanText(input.apartmentNumber) ?? null,
      bedNumber: input.bedNumber ?? null,
      startedAt: input.startedAt,
    } satisfies Prisma.RentalTenantUncheckedCreateInput;
  }

  private static async ensureRentalTenantForInquiry(input: {
    inquiry: {
      id: string;
      listingId: string;
      compoundId: string;
      tenantName: string;
      tenantPhone: string;
      tenantEmail?: string | null;
      listing: {
        id: string;
        compoundId: string;
        unitId?: string | null;
        ownerId: string;
        buildingNumber?: string | null;
        apartmentNumber?: string | null;
      };
      tenantNationalId?: string | null;
    };
    bed?: {
      id: string;
      bedNumber: number;
    } | null;
    startedAt: Date;
  }) {
    const existing = await prisma.rentalTenant.findUnique({
      where: { inquiryId: input.inquiry.id },
      select: { id: true },
    });

    if (existing) return existing;

    const data = this.buildRentalTenantData({
      compoundId: input.inquiry.compoundId || input.inquiry.listing.compoundId,
      fullName: input.inquiry.tenantName,
      phone: input.inquiry.tenantPhone,
      email: input.inquiry.tenantEmail,
      nationalId: input.inquiry.tenantNationalId,
      inquiryId: input.inquiry.id,
      listingId: input.inquiry.listingId || input.inquiry.listing.id,
      unitId: input.inquiry.listing.unitId,
      bedId: input.bed?.id,
      ownerId: input.inquiry.listing.ownerId,
      buildingNumber: input.inquiry.listing.buildingNumber,
      apartmentNumber: input.inquiry.listing.apartmentNumber,
      bedNumber: input.bed?.bedNumber,
      startedAt: input.startedAt,
    });

    if (!data) return null;

    try {
      return await prisma.rentalTenant.create({
        data,
        select: { id: true },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return prisma.rentalTenant.findUnique({
          where: { inquiryId: input.inquiry.id },
          select: { id: true },
        });
      }
      throw error;
    }
  }

  private static async ensureRentalTenantForReservation(input: {
    reservation: {
      id: string;
      listingId: string;
      compoundId: string;
      tenantName: string;
      tenantPhone: string;
      tenantEmail?: string | null;
      nationalId?: string | null;
      listing: {
        id: string;
        compoundId: string;
        unitId?: string | null;
        ownerId: string;
        buildingNumber?: string | null;
        apartmentNumber?: string | null;
      };
    };
    bed?: {
      id: string;
      bedNumber: number;
    } | null;
    startedAt: Date;
  }) {
    const existing = await prisma.rentalTenant.findUnique({
      where: { reservationId: input.reservation.id },
      select: { id: true },
    });

    if (existing) return existing;

    const data = this.buildRentalTenantData({
      compoundId: input.reservation.compoundId || input.reservation.listing.compoundId,
      fullName: input.reservation.tenantName,
      phone: input.reservation.tenantPhone,
      email: input.reservation.tenantEmail,
      reservationId: input.reservation.id,
      listingId: input.reservation.listingId || input.reservation.listing.id,
      unitId: input.reservation.listing.unitId,
      bedId: input.bed?.id,
      ownerId: input.reservation.listing.ownerId,
      buildingNumber: input.reservation.listing.buildingNumber,
      apartmentNumber: input.reservation.listing.apartmentNumber,
      bedNumber: input.bed?.bedNumber,
      startedAt: input.startedAt,
    });

    if (!data) return null;

    try {
      return await prisma.rentalTenant.create({
        data,
        select: { id: true },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return prisma.rentalTenant.findUnique({
          where: { reservationId: input.reservation.id },
          select: { id: true },
        });
      }
      throw error;
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

  private static assertClientRequestMatches(
    existing: {
      listingId: string;
      tenantName: string;
      tenantPhone: string;
    },
    input: {
      listingId: string;
      tenantName: string;
      tenantPhone: string;
    },
  ) {
    const sameListing = existing.listingId === input.listingId;
    const samePhone = this.normalizePhone(existing.tenantPhone) === input.tenantPhone;
    const sameName = existing.tenantName.trim() === input.tenantName.trim();

    if (!sameListing || !samePhone || !sameName) {
      throw new AppError(
        'Client request id is already used for another rental request',
        409,
        ErrorCodes.RENTAL_REQUEST_ALREADY_RESERVED_BED,
      );
    }
  }

  private static async findExistingClientInquiryBedRequest(
    tx: Prisma.TransactionClient,
    clientRequestId: string,
    input: {
      listingId: string;
      tenantName: string;
      tenantPhone: string;
    },
  ) {
    const existingInquiry = await tx.rentalInquiry.findUnique({
      where: { id: clientRequestId },
      select: {
        id: true,
        listingId: true,
        tenantName: true,
        tenantPhone: true,
        status: true,
      },
    });

    if (!existingInquiry) return null;
    this.assertClientRequestMatches(existingInquiry, input);

    const reservedBed = await tx.rentalBed.findFirst({
      where: {
        listingId: input.listingId,
        inquiryId: existingInquiry.id,
      },
      select: {
        bedNumber: true,
      },
    });

    const remainingAvailableBeds = await tx.rentalBed.count({
      where: {
        listingId: input.listingId,
        status: RentalBedStatus.AVAILABLE,
      },
    });

    return {
      ...existingInquiry,
      bedNumber: reservedBed?.bedNumber ?? null,
      remainingAvailableBeds,
    };
  }

  private static async findExistingClientReservationBedRequest(
    tx: Prisma.TransactionClient,
    clientRequestId: string,
    input: {
      listingId: string;
      tenantName: string;
      tenantPhone: string;
    },
  ) {
    const existingReservation = await tx.rentalReservation.findUnique({
      where: { id: clientRequestId },
    });

    if (!existingReservation) return null;
    this.assertClientRequestMatches(existingReservation, input);

    const reservedBed = await tx.rentalBed.findFirst({
      where: {
        listingId: input.listingId,
        reservationId: existingReservation.id,
      },
      select: {
        bedNumber: true,
      },
    });

    const remainingAvailableBeds = await tx.rentalBed.count({
      where: {
        listingId: input.listingId,
        status: RentalBedStatus.AVAILABLE,
      },
    });

    return {
      reservation: existingReservation,
      payment: null,
      paymentUrl: null,
      bedNumber: reservedBed?.bedNumber ?? null,
      remainingAvailableBeds,
    };
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

  private static validateListingBeds(
    status: RentalListingStatus,
    isPublished: boolean,
    totalBeds: number,
    pendingBeds: number,
    rentedBeds: number
  ) {
    if (totalBeds < 0) {
      throw new AppError('Total beds cannot be negative', 400, ErrorCodes.BAD_REQUEST);
    }
    if (pendingBeds < 0) {
      throw new AppError('Pending beds cannot be negative', 400, ErrorCodes.BAD_REQUEST);
    }
    if (rentedBeds < 0) {
      throw new AppError('Rented beds cannot be negative', 400, ErrorCodes.BAD_REQUEST);
    }
    if (pendingBeds + rentedBeds > totalBeds) {
      throw new AppError(
        'Rented beds and pending beds cannot exceed total beds',
        400,
        ErrorCodes.BAD_REQUEST
      );
    }

    const isTargetPublicActivePublished =
      status === RentalListingStatus.ACTIVE && isPublished === true;

    if (isTargetPublicActivePublished) {
      const availableBeds = totalBeds - pendingBeds - rentedBeds;
      if (availableBeds <= 0) {
        throw new AppError(
          'Cannot publish or set status to active when available beds are 0 or less',
          400,
          ErrorCodes.BAD_REQUEST
        );
      }
    }
  }

  public static computeBedCountsFromBeds(beds: Array<{ status: RentalBedStatus }>) {
    let availableBeds = 0;
    let pendingBeds = 0;
    let rentedBeds = 0;
    let outOfServiceBeds = 0;

    for (const bed of beds) {
      switch (bed.status) {
        case RentalBedStatus.AVAILABLE:
          availableBeds++;
          break;
        case RentalBedStatus.RESERVED:
          pendingBeds++;
          break;
        case RentalBedStatus.RENTED:
          rentedBeds++;
          break;
        case RentalBedStatus.OUT_OF_SERVICE:
          outOfServiceBeds++;
          break;
      }
    }

    const totalBeds = availableBeds + pendingBeds + rentedBeds;

    return {
      totalBeds,
      availableBeds,
      pendingBeds,
      rentedBeds,
      outOfServiceBeds,
    };
  }

  public static async syncListingCountersFromBeds(
    listingId: string,
    tx: RentalPrismaClient = prisma,
  ) {
    const listing = await tx.rentalListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        status: true,
        isPublished: true,
      },
    });

    if (!listing) {
      throw new AppError(
        'Rental listing not found',
        404,
        ErrorCodes.RENTAL_LISTING_NOT_FOUND,
      );
    }

    const groupedCounts = await tx.rentalBed.groupBy({
      by: ['status'],
      where: { listingId },
      _count: { _all: true },
    });

    const countByStatus = new Map<RentalBedStatus, number>(
      groupedCounts.map((item) => [item.status, item._count._all]),
    );
    const availableBeds = countByStatus.get(RentalBedStatus.AVAILABLE) ?? 0;
    const pendingBeds = countByStatus.get(RentalBedStatus.RESERVED) ?? 0;
    const rentedBeds = countByStatus.get(RentalBedStatus.RENTED) ?? 0;
    const totalBeds = availableBeds + pendingBeds + rentedBeds;

    let status = listing.status;
    let isPublished = listing.isPublished;

    if (availableBeds === 0) {
      isPublished = false;
      if (totalBeds === 0) {
        status = RentalListingStatus.SUSPENDED;
      } else if (rentedBeds === totalBeds) {
        status = RentalListingStatus.RENTED;
      } else if (pendingBeds > 0) {
        status = RentalListingStatus.RESERVED;
      }
    } else if (
      status === RentalListingStatus.RENTED ||
      status === RentalListingStatus.RESERVED
    ) {
      status = RentalListingStatus.ACTIVE;
      isPublished = true;
    }

    const updatedListing = await tx.rentalListing.update({
      where: { id: listingId },
      data: {
        totalBeds,
        pendingBeds,
        rentedBeds,
        status,
        isPublished,
      },
      include: adminListingInclude,
    });

    publicListingsCache.clear();

    return this.addAvailableBeds(updatedListing);
  }

  public static async syncListingBeds(
    tx: Prisma.TransactionClient,
    listingId: string,
    targetTotalBeds: number
  ) {
    if (targetTotalBeds < 0) {
      throw new AppError('Total beds cannot be negative', 400, ErrorCodes.BAD_REQUEST);
    }

    const currentBeds = await tx.rentalBed.findMany({
      where: { listingId },
      orderBy: { bedNumber: 'asc' },
    });

    const currentActiveCount = currentBeds.filter(
      (bed) => bed.status !== RentalBedStatus.OUT_OF_SERVICE,
    ).length;
    const maxBedNumber = currentBeds.reduce(
      (max, bed) => Math.max(max, bed.bedNumber),
      0,
    );

    if (targetTotalBeds > currentActiveCount) {
      const bedsToCreate = [];
      const bedsToAdd = targetTotalBeds - currentActiveCount;
      for (let index = 1; index <= bedsToAdd; index++) {
        bedsToCreate.push({
          listingId,
          bedNumber: maxBedNumber + index,
          status: RentalBedStatus.AVAILABLE,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      if (bedsToCreate.length > 0) {
        for (const bed of bedsToCreate) {
          await tx.rentalBed.create({
            data: bed,
          });
        }
      }
    } else if (targetTotalBeds < currentActiveCount) {
      let excessCount = currentActiveCount - targetTotalBeds;
      const bedsToDelete = [];

      for (let idx = currentBeds.length - 1; idx >= 0; idx--) {
        if (excessCount <= 0) break;
        const bed = currentBeds[idx];
        if (bed.status === RentalBedStatus.AVAILABLE) {
          bedsToDelete.push(bed.id);
          excessCount--;
        }
      }

      if (bedsToDelete.length > 0) {
        await tx.rentalBed.deleteMany({
          where: {
            id: { in: bedsToDelete },
          },
        });
      }
    }
  }
}
