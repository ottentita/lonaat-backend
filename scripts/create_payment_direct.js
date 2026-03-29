const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async ()=>{
  try {
    const reference = 'CRYPTO_DIRECT_' + Date.now();
    const p = await prisma.payment.create({ data: {
      userId: 1,
      provider: 'CRYPTO',
      amount: 1,
      currency: 'USDT',
      status: 'PENDING',
      transactionId: reference
    }});
    console.log('Created', p);
  } catch (err) {
    console.error('ERROR', err);
  } finally { await prisma.$disconnect(); }
})();
