const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const listings = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM real_estate_listings`);
    console.log('Listings:', listings[0].count.toString());
    const submissions = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM real_estate_owner_submissions`);
    console.log('Submissions:', submissions[0].count.toString());
    const inquiries = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM real_estate_inquiries`);
    console.log('Inquiries:', inquiries[0].count.toString());
  } finally {
    await prisma.$disconnect();
  }
}
main();
