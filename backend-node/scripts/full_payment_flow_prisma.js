const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async ()=>{
  try {
    // 1) create payment
    const reference = 'CRYPTO_FLOW_' + Date.now();
    const payment = await prisma.payment.create({ data: {
      userId: 1,
      provider: 'CRYPTO',
      amount: 1,
      currency: 'USDT',
      status: 'PENDING',
      transactionId: reference
    }});
    console.log('Created payment', payment.transactionId);

    // 2) user submits txHash -> set AWAITING_ADMIN_CONFIRMATION
    await prisma.payment.update({ where: { transactionId: reference }, data: { txHash: 'FAKE_HASH_FOR_TEST', status: 'AWAITING_ADMIN_CONFIRMATION' } });
    console.log('Submitted txHash for', reference);

    // 3) admin approves -> set CONFIRMED and activate plan
    await prisma.payment.update({ where: { transactionId: reference }, data: { status: 'CONFIRMED' } });
    console.log('Payment confirmed by admin');

    // activate plan for user 1, planId=1
    const plan = await prisma.plan.findUnique({ where: { id: 1 } });
    if (!plan) throw new Error('Plan 1 not found');
    await prisma.user.update({ where: { id: 1 }, data: { planId: plan.id, tokenBalance: plan.monthlyTokens } });
    console.log('Activated plan', plan.id, 'tokens', plan.monthlyTokens);

    const user = await prisma.user.findUnique({ where: { id: 1 }, select: { id: true, email: true, planId: true, tokenBalance: true } });
    console.log('User after activation:', JSON.stringify(user, null, 2));

  } catch (err) {
    console.error('ERROR', err);
  } finally { await prisma.$disconnect(); }
})();
