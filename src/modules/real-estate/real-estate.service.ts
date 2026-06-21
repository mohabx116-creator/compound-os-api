import { PrismaClient, RealEstateStatus, RealEstateSubmissionStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_REAL_ESTATE_COMPOUND_CODE = 'black-horse';

export class RealEstateService {
  // --- Public Methods ---

  async getPublicListings(filters: {
    type?: any;
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

    if (filters.type) where.type = filters.type;
    
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
        select: { title: true, compoundId: true },
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

      return inquiry;
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
    return prisma.realEstateListing.update({
      where: { id },
      data: { 
        status,
        publishedAt: status === RealEstateStatus.PUBLISHED ? new Date() : undefined,
      },
    });
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
          type: submission.type,
          title: submission.title,
          slug: this.generateSlug(submission.title),
          status: RealEstateStatus.DRAFT,
          price: submission.price,
          areaSqm: submission.areaSqm,
          description: submission.description,
          features: submission.features as any,
          
          ownerName: submission.submitterName,
          ownerPhone: submission.submitterPhone,
          ownerWhatsapp: submission.submitterWhatsapp,
          ownerEmail: submission.submitterEmail,
          internalNotes: 'تم التحويل من طلب المالك التلقائي',
          
          bedrooms: submission.bedrooms,
          bathrooms: submission.bathrooms,
          floor: submission.floor,
          buildingNumber: submission.buildingNumber,
          apartmentNumber: submission.apartmentNumber,
          finishingType: submission.finishingType,
          hasElevator: submission.hasElevator,
          hasParking: submission.hasParking,
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
          select: { title: true, id: true, type: true },
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
}

export const realEstateService = new RealEstateService();
