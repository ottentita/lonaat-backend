const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async ()=>{
  try {
    // Update by actual plan names present in this DB
    await prisma.plan.updateMany({ where: { name: 'Basic' }, data: { monthlyTokens: 200 } });
    await prisma.plan.updateMany({ where: { name: 'Pro' }, data: { monthlyTokens: 2000 } });
    console.log('Plan updates applied');
  } catch (err) {
    console.error('ERROR', err);
  } finally { await prisma.$disconnect(); }
})();
