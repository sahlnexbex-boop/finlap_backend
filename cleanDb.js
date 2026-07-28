const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    for (const user of users) {
      if (user.avatarUrl && user.avatarUrl.includes('/uploads/')) {
        const idx = user.avatarUrl.indexOf('/uploads/');
        const cleaned = user.avatarUrl.substring(idx);
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: cleaned },
        });
        console.log(`Cleaned user ${user.email} avatarUrl in PostgreSQL DB -> ${cleaned}`);
      }
    }
  } catch (e) {
    console.error('Error updating DB records:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
