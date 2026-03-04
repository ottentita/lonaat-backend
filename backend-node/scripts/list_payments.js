const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async ()=>{
  try {
    const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
    console.log(JSON.stringify(payments, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  } finally { await prisma.$disconnect(); }
})();
