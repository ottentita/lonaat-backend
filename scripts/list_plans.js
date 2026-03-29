const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async ()=>{
  try {
    const plans = await prisma.plan.findMany({ select: { id: true, name: true, monthlyTokens: true } });
    console.log(JSON.stringify(plans, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  } finally { await prisma.$disconnect(); }
})();
