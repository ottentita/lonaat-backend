import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    const planCount = await prisma.plan.count();
    const subsCount = await prisma.subscription.count();
    const subsSample = await prisma.subscription.findMany({ take: 5, include: { user: true, plan: true } });
    console.log('users', userCount, 'plans', planCount, 'subscriptions', subsCount);
    console.log('sample subscriptions', subsSample);
  } catch (e) {
    console.error('db check error', e);
  } finally {
    await prisma.$disconnect();
  }
})();