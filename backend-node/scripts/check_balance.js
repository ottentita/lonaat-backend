const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@lonaat.com' },
      select: { id: true, email: true, tokenBalance: true }
    });
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  } finally {
    await prisma.$disconnect();
  }
})();
