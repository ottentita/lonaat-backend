import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with test data...');

  // 1. Create admin user
  const adminPassword = await bcrypt.hash('Far@el11', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'lonaat64@gmail.com' },
    update: {},
    create: {
      email: 'lonaat64@gmail.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
      plan: 'pro',
      tokenBalance: 10000,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 2. Create test users
  const testUsers = [
    { email: 'user1@test.com', name: 'Test User 1', plan: 'free', tokenBalance: 100 },
    { email: 'user2@test.com', name: 'Test User 2', plan: 'pro', tokenBalance: 500 },
    { email: 'user3@test.com', name: 'Test User 3', plan: 'free', tokenBalance: 50 },
  ];

  const users = [];
  for (const userData of testUsers) {
    const password = await bcrypt.hash('Test123!', 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password,
        name: userData.name,
        role: 'user',
        plan: userData.plan,
        tokenBalance: userData.tokenBalance,
      },
    });
    users.push(user);
    console.log('✅ Test user created:', user.email);
  }

  // 3. Create wallets for all users
  const allUsers = [admin, ...users];
  for (const user of allUsers) {
    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: Math.random() * 1000,
        currency: 'USD',
      },
    });
  }
  console.log('✅ Wallets created for all users');

  // 4. Create affiliate products
  const products = [
    { name: 'Tech Product 1', niche: 'tech', commission: '30%', link: 'https://example.com/tech1' },
    { name: 'Fitness Product 1', niche: 'fitness', commission: '25%', link: 'https://example.com/fitness1' },
    { name: 'Beauty Product 1', niche: 'beauty', commission: '35%', link: 'https://example.com/beauty1' },
    { name: 'Business Course', niche: 'business', commission: '$50/sale', link: 'https://example.com/biz1' },
    { name: 'Education Platform', niche: 'education', commission: '40% recurring', link: 'https://example.com/edu1' },
    { name: 'Tech Gadget', niche: 'tech', commission: '20%', link: 'https://example.com/tech2' },
    { name: 'Fitness Equipment', niche: 'fitness', commission: '30%', link: 'https://example.com/fitness2' },
    { name: 'Skincare Set', niche: 'beauty', commission: '45%', link: 'https://example.com/beauty2' },
  ];

  for (const product of products) {
    await prisma.affiliateProduct.create({
      data: {
        name: product.name,
        niche: product.niche,
        description: `High-quality ${product.niche} product with great conversion rates`,
        link: product.link,
        commission: product.commission,
        keywords: [product.niche, 'affiliate', 'marketing'],
        isActive: true,
      },
    });
  }
  console.log('✅ Affiliate products created:', products.length);

  // 5. Create sample content
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    await prisma.content.create({
      data: {
        userId: user.id,
        prompt: `Generate content about ${products[i % products.length].name}`,
        result: `This is AI-generated content about ${products[i % products.length].name}. It's amazing!`,
        type: ['tiktok', 'youtube', 'instagram'][i % 3],
      },
    });
  }
  console.log('✅ Sample content created');

  // 6. Create schedules
  for (let i = 0; i < 3; i++) {
    const user = users[i % users.length];
    await prisma.schedule.create({
      data: {
        userId: user.id,
        prompt: `Daily content about ${products[i].name}`,
        templateType: ['tiktok', 'youtube', 'instagram'][i],
        frequency: 'daily',
        time: `0${9 + i}:00`,
        isActive: true,
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('✅ Schedules created');

  // 7. Create affiliate clicks
  for (let i = 0; i < 20; i++) {
    await prisma.affiliateClick.create({
      data: {
        productId: `product-${(i % 8) + 1}`,
        network: ['amazon', 'clickbank', 'cj'][i % 3],
        userId: users[i % users.length].id,
        ip: `192.168.1.${i + 1}`,
        userAgent: 'Mozilla/5.0',
      },
    });
  }
  console.log('✅ Affiliate clicks created');

  // 8. Create transactions
  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length];
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: ['deposit', 'withdrawal', 'commission'][i % 3],
        amount: 10 + i * 5,
        status: i < 7 ? 'completed' : 'pending',
        method: ['crypto', 'momo', 'manual'][i % 3],
        referenceId: `ref-${Date.now()}-${i}`,
        description: `Test transaction ${i + 1}`,
      },
    });
  }
  console.log('✅ Transactions created');

  // 9. Create deposits
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    await prisma.deposit.create({
      data: {
        userId: user.id,
        amount: 50 + i * 25,
        method: ['crypto', 'momo'][i % 2],
        status: i < 3 ? 'confirmed' : 'pending',
      },
    });
  }
  console.log('✅ Deposits created');

  // 10. Create withdrawals
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    await prisma.withdrawal.create({
      data: {
        userId: user.id,
        amount: 100 + i * 50,
        method: ['MTN', 'Orange', 'Crypto'][i % 3],
        accountDetails: JSON.stringify({
          accountNumber: `ACC${1000 + i}`,
          accountName: user.name,
        }),
        status: i < 2 ? 'approved' : 'pending',
      },
    });
  }
  console.log('✅ Withdrawals created');

  // 11. Create payments
  for (let i = 0; i < 5; i++) {
    const user = users[i % users.length];
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 19.99,
        currency: 'USD',
        provider: ['coinbase', 'stripe'][i % 2],
        transactionId: `tx-${Date.now()}-${i}`,
        status: i < 3 ? 'completed' : 'pending',
        metadata: JSON.stringify({ plan: 'pro', type: 'subscription' }),
      },
    });
  }
  console.log('✅ Payments created');

  // 12. Create token purchases
  for (let i = 0; i < 3; i++) {
    const user = users[i % users.length];
    await prisma.tokenPurchase.create({
      data: {
        userId: user.id,
        amount: [100, 300, 1000][i],
        chargeId: `charge-${Date.now()}-${i}`,
      },
    });
  }
  console.log('✅ Token purchases created');

  // Summary
  const counts = {
    users: await prisma.user.count(),
    wallets: await prisma.wallet.count(),
    affiliateProducts: await prisma.affiliateProduct.count(),
    content: await prisma.content.count(),
    schedules: await prisma.schedule.count(),
    clicks: await prisma.affiliateClick.count(),
    transactions: await prisma.transaction.count(),
    deposits: await prisma.deposit.count(),
    withdrawals: await prisma.withdrawal.count(),
    payments: await prisma.payment.count(),
    tokenPurchases: await prisma.tokenPurchase.count(),
  };

  console.log('\n✅ Database seeding complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`  Users: ${counts.users}`);
  console.log(`  Wallets: ${counts.wallets}`);
  console.log(`  Affiliate Products: ${counts.affiliateProducts}`);
  console.log(`  Content: ${counts.content}`);
  console.log(`  Schedules: ${counts.schedules}`);
  console.log(`  Clicks: ${counts.clicks}`);
  console.log(`  Transactions: ${counts.transactions}`);
  console.log(`  Deposits: ${counts.deposits}`);
  console.log(`  Withdrawals: ${counts.withdrawals}`);
  console.log(`  Payments: ${counts.payments}`);
  console.log(`  Token Purchases: ${counts.tokenPurchases}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
