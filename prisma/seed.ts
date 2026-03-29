import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // PRODUCTION GUARD - Never run seed in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('❌ SEED FILE CANNOT RUN IN PRODUCTION - This creates fake test data');
  }
  
  console.log('🌱 Running Prisma deterministic seed (DEV/TEST ONLY)...');

  // Seed token packs
  const tokenPacks = [
    { name: 'Starter', tokenAmount: 1000, priceUSD: 5 },
    { name: 'Growth', tokenAmount: 5000, priceUSD: 20 },
    { name: 'Pro', tokenAmount: 15000, priceUSD: 50 },
  ];

  for (const p of tokenPacks) {
    await prisma.tokenPack.deleteMany({ where: { name: p.name } as any });
    await prisma.tokenPack.create({ data: { name: p.name, tokenAmount: p.tokenAmount, priceUSD: p.priceUSD } as any });
    console.log('Seeded token pack', p.name);
  }

  // Seed default subscription plans by clearing existing and recreating
  try {
    await prisma.plan.deleteMany({});
    await prisma.plan.create({
      data: { name: 'Basic', price: 0, monthlyTokens: 0 }
    });
    await prisma.plan.create({
      data: { name: 'Pro', price: 29, monthlyTokens: 0 }
    });
  } catch (e: any) {
    console.warn('Skipping plan reset due to existing references:', e && e.message ? e.message : e)
  }

  // 1) Users: 1 admin + 4 affiliates
  const usersSpec = [
    { name: 'Admin User', email: 'admin@lonaat.com', password: 'Admin123!', role: 'ADMIN', is_admin: true, balance: '0' },
    { name: 'Affiliate A', email: 'aff1@lonaat.com', password: 'AffPass1!', role: 'USER', is_admin: false, balance: '100' },
    { name: 'Affiliate B', email: 'aff2@lonaat.com', password: 'AffPass2!', role: 'USER', is_admin: false, balance: '200' },
    { name: 'Affiliate C', email: 'aff3@lonaat.com', password: 'AffPass3!', role: 'USER', is_admin: false, balance: '300' },
    { name: 'Affiliate D', email: 'aff4@lonaat.com', password: 'AffPass4!', role: 'USER', is_admin: false, balance: '400' },
  ];

  const createdUsers: any[] = [];

  for (const [i, u] of usersSpec.entries()) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    const existing = await prisma.user.findUnique({ where: { email: u.email } as any });
    if (existing) {
      createdUsers.push(existing);
      console.log(`⚠️  User ${u.email} exists - reusing`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: passwordHash,
        role: u.role,
        balance: u.balance,
        isActive: true,
      },
    });

    createdUsers.push(user);
    console.log(`✅ Created user ${u.email}`);
  }

  // Map affiliates (exclude admin)
  const affiliates = createdUsers.filter((x) => x.role !== 'ADMIN');

  // 2) Offers: 10 offers
  const offers: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const externalOfferId = `seed_offer_${i}`;
    const seller = affiliates[(i - 1) % Math.max(affiliates.length, 1)];

    const existing = await prisma.offer.findFirst({ where: { externalOfferId } as any });
    if (existing) {
      offers.push(existing);
      continue;
    }

    const offer = await prisma.offer.create({
      data: {
        title: `Offer ${i}`,
        name: `Offer ${i}`,
        slug: `offer-${i}`,
        description: `Deterministic seeded offer ${i}`,
        url: `https://offers.example.com/${i}`,
        network: 'seed-net',
        externalOfferId,
        trackingUrl: `https://track.example.com/${i}`,
        isActive: true,
        payout: `${5 + i}`,
        sellerId: seller ? seller.id : undefined,
      },
    });

    offers.push(offer);
  }

  // 3) Clicks: 50 clicks across offers
  const totalClicks = 50;
  const clicks: any[] = [];
  for (let i = 0; i < totalClicks; i++) {
    const offer = offers[i % offers.length];
    const user = i % 5 !== 0 ? affiliates[i % affiliates.length] : null; // some anonymous
    const clickId = `seed_click_${i + 1}`;
    const clickToken = `seed_token_${i + 1}`;

    const existing = await prisma.click.findFirst({ where: { clickId } as any });
    if (existing) {
      clicks.push(existing);
      continue;
    }

    const timeBucket = Math.floor(Date.now() / 5000);
    const click = await prisma.click.create({
      data: {
        offerId: offer.id,
        adId: offer.id,
        userId: user ? user.id : i,
        timeBucket: timeBucket + i,
        clickId,
        clickToken,
        ip: `192.0.2.${(i % 250) + 1}`,
        userAgent: 'SeedAgent/1.0',
        user_id: user ? user.id : undefined,
      },
    });

    clicks.push(click);
  }

  // 4) Conversions: 12 conversions
  const conversions: any[] = [];
  for (let i = 0; i < 12; i++) {
    const offer = offers[i % offers.length];
    const click = clicks[i % clicks.length];
    const amount = (10 + i).toFixed(2);
    const existing = await prisma.conversion.findFirst({ where: { offerId: offer.id, amount: amount as any } as any });
    if (existing) {
      conversions.push(existing);
      continue;
    }

    const conv = await prisma.conversion.create({
      data: {
        offerId: offer.id,
        clickId: click.clickId,
        amount: amount as any,
        status: i < 8 ? 'completed' : 'pending',
      },
    });

    conversions.push(conv);
  }

  // 5) Commissions: 12 commissions, make 8 approved/paid-like
  const commissions: any[] = [];
  for (let i = 0; i < 12; i++) {
    const offer = offers[i % offers.length];
    const owner = offer.sellerId ? await prisma.user.findUnique({ where: { id: offer.sellerId } as any }) : affiliates[0];
    const click = clicks[i % clicks.length];
    const amount = (5 + i).toFixed(2);
    const external_ref = `seed_comm_${i + 1}`;

    const existing = await prisma.commission.findFirst({ where: { external_ref } as any });
    if (existing) {
      commissions.push(existing);
      continue;
    }

    const status = i < 8 ? 'paid' : 'pending';

    const c = await prisma.commission.create({
      data: {
        user_id: owner.id,
        click_id: click.id,
        network: 'seed-net',
        product_id: offer.id,
        amount: amount as any,
        status,
        external_ref,
      },
    });

    commissions.push(c);
  }

  // 6) Payouts: 3 completed payments (as payouts)
  const payoutAmounts = ['50.00', '75.25', '100.00'];
  for (let i = 0; i < payoutAmounts.length; i++) {
    const user = affiliates[i % affiliates.length];
    const transactionId = `seed_payout_${i + 1}`;

    const existing = await prisma.payment.findFirst({ where: { transactionId } as any });
    if (existing) {
      console.log(`⚠️  Payout ${transactionId} exists - skipping`);
      continue;
    }

    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: payoutAmounts[i] as any,
        currency: 'USD',
        status: 'completed',
        provider: 'payout',
        transactionId,
      },
    });
  }

  // Summary
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.offer.count(),
    prisma.click.count(),
    prisma.conversion.count(),
    prisma.commission.count(),
    prisma.payment.count(),
  ]);

  console.log('\n✅ Prisma seed complete');
  console.log(`- Users: ${counts[0]}`);
  console.log(`- Offers: ${counts[1]}`);
  console.log(`- Clicks: ${counts[2]}`);
  console.log(`- Conversions: ${counts[3]}`);
  console.log(`- Commissions: ${counts[4]}`);
  console.log(`- Payments: ${counts[5]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
