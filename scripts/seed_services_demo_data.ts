import dotenv from 'dotenv';
import { PrismaClient, ServiceItemStatus } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const DEMO_COMPOUND_CODE = 'black-horse';

type SeedAction = 'created' | 'updated';

interface CategorySeedDefinition {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface ItemSeedDefinition {
  title: string;
  slug: string;
  categorySlug: string;
  description?: string | null;
  imageUrl?: string | null;
  locationText?: string | null;
  workingHours?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  acceptsRequests: boolean;
  status: ServiceItemStatus;
  sortOrder: number;
}

const categories: CategorySeedDefinition[] = [
  {
    name: 'مرافق',
    slug: 'facilities',
    description: null,
    icon: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'خدمات فنية',
    slug: 'technical-services',
    description: null,
    icon: null,
    sortOrder: 2,
    isActive: true,
  },
];

const items: ItemSeedDefinition[] = [
  {
    title: 'الجيم',
    slug: 'gym',
    categorySlug: 'facilities',
    description: 'صالة رياضية داخل الكمبوند',
    imageUrl: null,
    locationText: 'مبنى الخدمات',
    workingHours: 'يوميا من 8 صباحا إلى 11 مساء',
    phone: null,
    whatsapp: null,
    isPublic: true,
    isFeatured: true,
    acceptsRequests: false,
    status: ServiceItemStatus.ACTIVE,
    sortOrder: 1,
  },
  {
    title: 'سباك',
    slug: 'plumber',
    categorySlug: 'technical-services',
    description: 'طلب سباك لأعمال الصيانة الطارئة والعادية',
    imageUrl: null,
    locationText: null,
    workingHours: null,
    phone: null,
    whatsapp: null,
    isPublic: true,
    isFeatured: true,
    acceptsRequests: true,
    status: ServiceItemStatus.ACTIVE,
    sortOrder: 1,
  },
];

function isKnownRecordError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error;
}

async function resolveCompound() {
  const compound = await prisma.compound.findFirst({
    where: {
      code: DEMO_COMPOUND_CODE,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!compound) {
    throw new Error(`Active compound not found for code "${DEMO_COMPOUND_CODE}"`);
  }

  return compound;
}

async function seedCategory(
  compoundId: string,
  definition: CategorySeedDefinition,
): Promise<SeedAction> {
  const existing = await prisma.serviceCategory.findUnique({
    where: {
      compoundId_slug: {
        compoundId,
        slug: definition.slug,
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.serviceCategory.upsert({
    where: {
      compoundId_slug: {
        compoundId,
        slug: definition.slug,
      },
    },
    create: {
      compoundId,
      name: definition.name,
      slug: definition.slug,
      description: definition.description ?? null,
      icon: definition.icon ?? null,
      sortOrder: definition.sortOrder,
      isActive: definition.isActive,
    },
    update: {
      name: definition.name,
      description: definition.description ?? null,
      icon: definition.icon ?? null,
      sortOrder: definition.sortOrder,
      isActive: definition.isActive,
    },
  });

  return existing ? 'updated' : 'created';
}

async function seedItem(
  compoundId: string,
  categoryId: string,
  definition: ItemSeedDefinition,
): Promise<SeedAction> {
  const existing = await prisma.serviceItem.findUnique({
    where: {
      compoundId_slug: {
        compoundId,
        slug: definition.slug,
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.serviceItem.upsert({
    where: {
      compoundId_slug: {
        compoundId,
        slug: definition.slug,
      },
    },
    create: {
      compoundId,
      categoryId,
      title: definition.title,
      slug: definition.slug,
      description: definition.description ?? null,
      imageUrl: definition.imageUrl ?? null,
      locationText: definition.locationText ?? null,
      workingHours: definition.workingHours ?? null,
      phone: definition.phone ?? null,
      whatsapp: definition.whatsapp ?? null,
      isPublic: definition.isPublic,
      isFeatured: definition.isFeatured,
      acceptsRequests: definition.acceptsRequests,
      status: definition.status,
      sortOrder: definition.sortOrder,
    },
    update: {
      categoryId,
      title: definition.title,
      description: definition.description ?? null,
      imageUrl: definition.imageUrl ?? null,
      locationText: definition.locationText ?? null,
      workingHours: definition.workingHours ?? null,
      phone: definition.phone ?? null,
      whatsapp: definition.whatsapp ?? null,
      isPublic: definition.isPublic,
      isFeatured: definition.isFeatured,
      acceptsRequests: definition.acceptsRequests,
      status: definition.status,
      sortOrder: definition.sortOrder,
    },
  });

  return existing ? 'updated' : 'created';
}

async function main() {
  const compound = await resolveCompound();

  const categoryBySlug = new Map<string, { id: string; action: SeedAction }>();
  const categoryResults: Array<{ slug: string; action: SeedAction }> = [];
  const itemResults: Array<{ slug: string; action: SeedAction }> = [];

  for (const definition of categories) {
    const action = await seedCategory(compound.id, definition);
    const category = await prisma.serviceCategory.findUnique({
      where: {
        compoundId_slug: {
          compoundId: compound.id,
          slug: definition.slug,
        },
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new Error(`Unable to resolve seeded category "${definition.slug}"`);
    }

    categoryBySlug.set(definition.slug, { id: category.id, action });
    categoryResults.push({ slug: definition.slug, action });
  }

  for (const definition of items) {
    const category = categoryBySlug.get(definition.categorySlug);
    if (!category) {
      throw new Error(`Missing category "${definition.categorySlug}" for item "${definition.slug}"`);
    }

    const action = await seedItem(compound.id, category.id, definition);
    itemResults.push({ slug: definition.slug, action });
  }

  console.log('Services demo seed completed successfully.');
  console.log(`Compound: ${compound.name} (${compound.code ?? DEMO_COMPOUND_CODE})`);
  console.log(
    `Categories: ${categoryResults.map((entry) => `${entry.slug}:${entry.action}`).join(', ')}`,
  );
  console.log(`Items: ${itemResults.map((entry) => `${entry.slug}:${entry.action}`).join(', ')}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Services demo seed failed.');
    console.error(message);
    if (isKnownRecordError(error)) {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
