import { PrismaClient, RealEstateStatus, RealEstateSubmissionStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { env } from '../../config/env.js';
import { PlatformRevenueService } from '../platform-revenue/platform-revenue.service.js';

const prisma = new PrismaClient();

const DEFAULT_REAL_ESTATE_COMPOUND_CODE = 'black-horse';
const REAL_ESTATE_WHATSAPP_PHONE = '201224591618';

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

export class RealEstateService {
  // --- Public Methods ---

  createCloudinaryUploadSignature(input: { folder?: string } = {}) {
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

  async getPublicListings(filters: {
    compoundId?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
  }) {
    // Resolve compound securely server-side for public reads if none provided
    const compound = filters.compoundId 
      ? { id: filters.compoundId }
      : await this.resolvePublicRealEstateCompound();

    const where: Prisma.RealEstateListingWhereInput = {
      status: RealEstateStatus.PUBLISHED,
      compoundId: compound.id,
    };
    
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }

    if (filters.minArea || filters.maxArea) {
      where.areaSqm = {};
      if (filters.minArea) where.areaSqm.gte = filters.minArea;
      if (filters.maxArea) where.areaSqm.lte = filters.maxArea;
    }

    const listings = await prisma.realEstateListing.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return listings;
  }

  async getPublicListingBySlug(slug: string) {
    return prisma.realEstateListing.findFirst({
      where: {
        slug,
        status: RealEstateStatus.PUBLISHED,
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createOwnerSubmission(data: any) {
    const { images, ...submissionData } = data;
    
    // Phase 2: Resolve public compound securely server-side
    const compound = await this.resolvePublicRealEstateCompound();
    submissionData.compoundId = compound.id;
    
    return prisma.$transaction(async (tx) => {
      const submission = await tx.realEstateOwnerSubmission.create({
        data: {
          ...submissionData,
        },
      });

      if (images && images.length > 0) {
        await tx.realEstateSubmissionImage.createMany({
          data: images.map((img: any, index: number) => ({
            submissionId: submission.id,
            url: img.url,
            publicId: img.publicId,
            alt: img.alt,
            isCover: index === 0 || img.isCover,
            sortOrder: img.sortOrder || index,
          })),
        });
      }

      // Add Notification
      await tx.adminNotification.create({
        data: {
          audience: 'ADMIN',
          eventType: 'REAL_ESTATE_OWNER_SUBMISSION_CREATED',
          title: 'طلب إعلان عقار جديد',
          body: `يوجد طلب جديد لإعلان عقار/أرض من ${submissionData.submitterName}`,
          entityType: 'REAL_ESTATE_OWNER_SUBMISSION',
          entityId: submission.id,
          compoundId: submissionData.compoundId,
        },
      });

      return submission;
    });
  }

  async createInquiry(data: any) {
    return prisma.$transaction(async (tx) => {
      const inquiry = await tx.realEstateInquiry.create({
        data,
      });

      const listing = await tx.realEstateListing.findUnique({
        where: { id: data.listingId },
        select: {
          title: true,
          slug: true,
          price: true,
          areaSqm: true,
          bedrooms: true,
          bathrooms: true,
          compoundId: true,
          compound: {
            select: { name: true },
          },
        },
      });

      // Add Notification
      await tx.adminNotification.create({
        data: {
          audience: 'ADMIN',
          eventType: 'REAL_ESTATE_INQUIRY_CREATED',
          title: 'طلب تواصل عقاري جديد',
          body: `يوجد طلب تواصل جديد بخصوص عقار: ${listing?.title || ''}`,
          entityType: 'REAL_ESTATE_INQUIRY',
          entityId: inquiry.id,
          compoundId: listing?.compoundId,
        },
      });

      const whatsappUrl = listing
        ? this.buildRealEstateWhatsAppUrl({
            listing,
            inquiry: {
              customerName: data.customerName,
              customerPhone: data.customerPhone,
            },
          })
        : null;

      return { inquiry, whatsappUrl };
    });
  }

  // --- Admin Methods ---

  async getAdminListings(filters: any = {}) {
    return prisma.realEstateListing.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async getAdminListingById(id: string) {
    return prisma.realEstateListing.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u0621-\u064A]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-6);
  }

  async createAdminListing(data: any) {
    const { images, slug, compoundId, ...listingData } = data;
    
    // Phase 2: Resolve admin compound securely server-side
    const compound = await this.resolveAdminRealEstateCompound(compoundId);
    
    const finalSlug = slug || this.generateSlug(listingData.title);

    return prisma.$transaction(async (tx) => {
      const listing = await tx.realEstateListing.create({
        data: {
          ...listingData,
          compoundId: compound.id,
          slug: finalSlug,
          publishedAt: listingData.status === RealEstateStatus.PUBLISHED ? new Date() : null,
        },
      });

      await this.recordPublicationRevenue(tx, listing);

      if (images && images.length > 0) {
        await tx.realEstateListingImage.createMany({
          data: images.map((img: any, index: number) => ({
            listingId: listing.id,
            url: img.url,
            publicId: img.publicId,
            alt: img.alt,
            isCover: index === 0 || img.isCover,
            sortOrder: img.sortOrder || index,
          })),
        });
      }

      return listing;
    });
  }

  async updateAdminListing(id: string, data: any) {
    const { images, ...listingData } = data;
    
    if (listingData.status === RealEstateStatus.PUBLISHED && !listingData.publishedAt) {
      listingData.publishedAt = new Date();
    }

    return prisma.$transaction(async (tx) => {
      const listing = await tx.realEstateListing.update({
        where: { id },
        data: listingData,
      });

      await this.recordPublicationRevenue(tx, listing);

      if (images) {
        await tx.realEstateListingImage.deleteMany({
          where: { listingId: id },
        });
        
        if (images.length > 0) {
          await tx.realEstateListingImage.createMany({
            data: images.map((img: any, index: number) => ({
              listingId: id,
              url: img.url,
              publicId: img.publicId,
              alt: img.alt,
              isCover: index === 0 || img.isCover,
              sortOrder: img.sortOrder || index,
            })),
          });
        }
      }

      return listing;
    });
  }

  async updateListingStatus(id: string, status: RealEstateStatus) {
    const listing = await prisma.realEstateListing.update({
      where: { id },
      data: { 
        status,
        publishedAt: status === RealEstateStatus.PUBLISHED ? new Date() : undefined,
      },
    });

    await this.recordPublicationRevenue(prisma, listing);
    return listing;
  }

  async softDeleteListing(id: string) {
    // Safe delete by hiding it instead of destructive delete
    return prisma.realEstateListing.update({
      where: { id },
      data: { status: RealEstateStatus.HIDDEN },
    });
  }

  async getAdminSubmissions() {
    return prisma.realEstateOwnerSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
      },
    });
  }

  async updateSubmissionStatus(id: string, status: RealEstateSubmissionStatus, adminNotes?: string) {
    return prisma.realEstateOwnerSubmission.update({
      where: { id },
      data: { status, adminNotes },
    });
  }

  async convertSubmissionToListing(id: string) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.realEstateOwnerSubmission.findUnique({
        where: { id },
        include: { images: true },
      });

      if (!submission) throw new Error('Submission not found');
      if (submission.createdListingId) throw new Error('Already converted');

      const listing = await tx.realEstateListing.create({
        data: {
          compoundId: submission.compoundId,
          title: submission.title,
          slug: this.generateSlug(submission.title),
          status: RealEstateStatus.DRAFT,
          price: submission.price,
          areaSqm: submission.areaSqm,
          description: submission.description,
          features: submission.features as any,
          amenities: submission.amenities as any,
          
          ownerName: submission.submitterName,
          ownerPhone: submission.submitterPhone,
          ownerWhatsapp: submission.submitterWhatsapp,
          ownerEmail: submission.submitterEmail,
          internalNotes: 'تم التحويل من طلب المالك التلقائي',
          
          bedrooms: submission.bedrooms,
          bathrooms: submission.bathrooms,
          floor: submission.floor,
          balconies: submission.balconies,
          receptionRooms: submission.receptionRooms,
          buildingAge: submission.buildingAge,
          buildingNumber: submission.buildingNumber,
          apartmentNumber: submission.apartmentNumber,
          finishingType: submission.finishingType,
          finishingStatus: submission.finishingStatus,
          hasElevator: submission.hasElevator,
          hasParking: submission.hasParking,
          furnishingStatus: submission.furnishingStatus,
          phase: submission.phase,
          ownershipProofType: submission.ownershipProofType,
          areInstallmentsSettled: submission.areInstallmentsSettled,
          isDepositSettled: submission.isDepositSettled,
          hasFinalContract: submission.hasFinalContract,
          pricePerMeter: submission.pricePerMeter,
          frontage: submission.frontage,
          depth: submission.depth,
          streetWidth: submission.streetWidth,
          landUse: submission.landUse,
          utilitiesAvailable: submission.utilitiesAvailable,
          cornerPlot: submission.cornerPlot,
          isRegistered: submission.isRegistered,
        },
      });

      await this.recordPublicationRevenue(tx, listing);

      if (submission.images && submission.images.length > 0) {
        await tx.realEstateListingImage.createMany({
          data: submission.images.map((img, index) => ({
            listingId: listing.id,
            url: img.url,
            publicId: img.publicId,
            alt: img.alt,
            isCover: img.isCover,
            sortOrder: img.sortOrder,
          })),
        });
      }

      await tx.realEstateOwnerSubmission.update({
        where: { id },
        data: {
          status: RealEstateSubmissionStatus.CONVERTED,
          createdListingId: listing.id,
        },
      });

      return listing;
    });
  }

  async getAdminInquiries() {
    return prisma.realEstateInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          select: { title: true, id: true },
        },
      },
    });
  }

  async updateInquiryStatus(id: string, status: any) {
    return prisma.realEstateInquiry.update({
      where: { id },
      data: { status },
    });
  }

  // --- Context Resolvers ---
  async resolvePublicRealEstateCompound() {
    const compound = await prisma.compound.findFirst({
      where: {
        code: DEFAULT_REAL_ESTATE_COMPOUND_CODE,
        isActive: true,
      },
    });

    if (!compound || !compound.isActive) {
      throw new Error('لم يتم العثور على مجمع صالح');
    }

    return compound;
  }

  async resolveAdminRealEstateCompound(authenticatedCompoundId?: string) {
    if (!authenticatedCompoundId) {
      throw new Error('لا يوجد مجمع مرتبط بحساب الإدارة الحالي');
    }

    const compound = await prisma.compound.findUnique({
      where: { id: authenticatedCompoundId },
    });

    if (!compound || !compound.isActive) {
      throw new Error('لا يوجد مجمع مرتبط بحساب الإدارة الحالي');
    }

    return compound;
  }

  private buildRealEstateWhatsAppUrl(input: {
    listing: {
      title: string;
      slug: string;
      price: Prisma.Decimal;
      areaSqm: Prisma.Decimal;
      bedrooms: number | null;
      bathrooms: number | null;
      compound: {
        name: string;
      } | null;
    };
    inquiry: {
      customerName: string;
      customerPhone: string;
    };
  }) {
    const message = [
      'طلب عرض شقة تمليك',
      '',
      `رقم الإعلان: ${input.listing.slug}`,
      `العقار: ${input.listing.title}`,
      `الموقع: ${input.listing.compound?.name ?? 'غير متاح'}`,
      `السعر: ${this.formatCurrency(input.listing.price)}`,
      `المساحة: ${input.listing.areaSqm.toString()} م²`,
      `الغرف: ${input.listing.bedrooms != null ? input.listing.bedrooms : 'غير متاح'}`,
      `الحمامات: ${input.listing.bathrooms != null ? input.listing.bathrooms : 'غير متاح'}`,
      '',
      'بيانات العميل:',
      `الاسم: ${input.inquiry.customerName}`,
      `رقم الهاتف: ${input.inquiry.customerPhone}`,
      '',
      'أرغب في استكمال إجراءات الحجز/الدفع الخاصة بالشقة.',
    ].join('\n');

    return `https://wa.me/${REAL_ESTATE_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  }

  private async recordPublicationRevenue(
    tx: Pick<Prisma.TransactionClient, 'platformRevenueEntry'>,
    listing: {
      id: string;
      compoundId: string;
      title: string;
      slug: string;
      status: RealEstateStatus;
      publishedAt: Date | null;
    },
  ) {
    if (listing.status !== RealEstateStatus.PUBLISHED) {
      return;
    }

    const unitRateEgp = 1000;

    await PlatformRevenueService.recordRevenueEntry(tx, {
      compoundId: listing.compoundId,
      sourceType: 'REAL_ESTATE_LISTING',
      sourceId: listing.id,
      revenueCategory: 'SALE_APARTMENT_LISTING',
      amountEgp: unitRateEgp,
      unitRateEgp,
      quantity: 1,
      description: 'رسوم نشر إعلان بيع شقة',
      occurredAt: listing.publishedAt ?? new Date(),
      realEstateListingId: listing.id,
      metadata: {
        title: listing.title,
        slug: listing.slug,
      },
    });
  }

  private formatCurrency(value: Prisma.Decimal) {
    const amount = Number(value.toString());

    if (!Number.isFinite(amount)) {
      return value.toString();
    }

    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

export const realEstateService = new RealEstateService();
