const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const counts = {};
    const tables = [
      'real_estate_listings',
      'real_estate_listing_images',
      'real_estate_owner_submissions',
      'real_estate_submission_images',
      'real_estate_inquiries'
    ];
    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table}`);
        counts[table] = result[0].count.toString();
      } catch(err) {
        counts[table] = 'Table does not exist';
      }
    }
    console.log(counts);
  } finally {
    await prisma.$disconnect();
  }
}
main();
