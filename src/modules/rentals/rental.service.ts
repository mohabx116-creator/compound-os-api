import {
  Prisma,
  RentalInquiryStatus,
  RentalFurnishingStatus,
  RentalListingStatus,
  RentalOwnerStatus,
  RentalOwnerSubmissionStatus,
  RentalPaymentStatus,
  RentalReservationStatus,
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
  UpdateRentalBedStatusInput,
  UpdateRentalInquiryStatusInput,
  UpdateRentalOwnerInput,
} from './rental.types.js';

const DEFAULT_RENTAL_COMPOUND_CODE = 'black-horse';
const DEFAULT_OWNER_SUBMISSION_COMPOUND_CODE = DEFAULT_RENTAL_COMPOUND_CODE;

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
      totalBeds: true,
      pendingBeds: true,
      rentedBeds: true,
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

    return prisma.rentalOwnerSubmission.create({
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

    if (submission.status === RentalOwnerSubmissionStatus.REJECTED) {
      throw new AppError(
        'Cannot convert a rejected submission',
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

    return this.executeSubmissionConversion(submission);
  }

  static async approveAndConvertOwnerSubmissionToListing(id: OwnerSubmissionParams['id']) {
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

    if (submission.status === RentalOwnerSubmissionStatus.REJECTED) {
      throw new AppError(
        'Cannot convert a rejected submission',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    const validStatuses: RentalOwnerSubmissionStatus[] = [
      RentalOwnerSubmissionStatus.NEW,
      RentalOwnerSubmissionStatus.UNDER_REVIEW,
      RentalOwnerSubmissionStatus.APPROVED,
    ];
    if (!validStatuses.includes(submission.status)) {
      throw new AppError(
        `Submission status ${submission.status} cannot be converted`,
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    if (submission.areaSqm === null || submission.bedrooms === null) {
      throw new AppError(
        'Submission is missing required listing dimensions or room counts',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    return this.executeSubmissionConversion(submission);
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

    try {
      return await prisma.$transaction(async (tx) => {
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

      return {
        ...inquiry,
        bedNumber: availableBeds[0].bedNumber,
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
      inquiries: inquiries.map((inquiry) => this.addAvailableBedsToInquiry(inquiry)),
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

    return this.addAvailableBedsToInquiry(inquiry);
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

    if (newStatus === RentalInquiryStatus.CLOSED && !input.bedId) {
      throw new AppError(
        'A bed must be selected before accepting the inquiry',
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    const updatedInquiry = await prisma.$transaction(async (tx) => {
      // Row-level lock on the rental listing to prevent concurrent modifications
      await tx.$executeRaw`
        SELECT id FROM rental_listings WHERE id = ${inquiry.listingId} FOR UPDATE
      `;

      const listing = await tx.rentalListing.findUnique({
        where: { id: inquiry.listingId },
      });

      if (!listing) {
        throw new AppError('Listing associated with inquiry not found', 404, ErrorCodes.RENTAL_LISTING_NOT_FOUND);
      }

      if (newStatus === RentalInquiryStatus.CLOSED) {
        const selectedBed = await tx.rentalBed.findUnique({
          where: { id: input.bedId },
          select: adminBedSelect,
        });

        if (!selectedBed) {
          throw new AppError('Selected rental bed not found', 404, ErrorCodes.NOT_FOUND);
        }

        if (selectedBed.listingId !== inquiry.listingId) {
          throw new AppError(
            'Selected bed does not belong to this inquiry listing',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        if (
          selectedBed.status !== RentalBedStatus.AVAILABLE &&
          selectedBed.status !== RentalBedStatus.RESERVED
        ) {
          throw new AppError(
            'Selected bed must be available or temporarily reserved',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        if (
          selectedBed.status === RentalBedStatus.RESERVED &&
          selectedBed.inquiryId &&
          selectedBed.inquiryId !== inquiry.id
        ) {
          throw new AppError(
            'Selected reserved bed is linked to another inquiry',
            400,
            ErrorCodes.BAD_REQUEST,
          );
        }

        await tx.rentalBed.update({
          where: { id: selectedBed.id },
          data: {
            status: RentalBedStatus.RENTED,
            inquiryId: inquiry.id,
            reservationId: null,
          },
        });
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

      return updated;
    });

    return this.addAvailableBedsToInquiry(updatedInquiry);
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
        listing: this.addAvailableBeds(listing),
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

  private static async executeSubmissionConversion(submission: any) {
    this.validateListingBeds(RentalListingStatus.PENDING_REVIEW, false, submission.totalBeds ?? 4, 0, 0);

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
          bedrooms: 2,
          bathrooms: submission.bathrooms ?? 1,
          areaSqm: 63,
          floor: submission.floor,
          isAirConditioned: submission.isAirConditioned,
          basicFeatures: submission.basicFeatures ?? undefined,
          extraAmenitiesText: submission.extraAmenitiesText,
          monthlyRent: submission.monthlyRent,
          depositAmount: this.calculateDeposit(submission.monthlyRent),
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
          totalBeds: submission.totalBeds ?? 4,
          pendingBeds: 0,
          rentedBeds: 0,
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
      await RentalService.syncListingBeds(tx, listing.id, listing.totalBeds);
      const syncedListing = await RentalService.syncListingCountersFromBeds(listing.id, tx);

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
        listing: syncedListing,
      };
    });
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
        });
      }
      if (bedsToCreate.length > 0) {
        await tx.rentalBed.createMany({
          data: bedsToCreate,
        });
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
