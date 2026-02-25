const { PrismaClient } = require('../node_modules/.prisma-test/client')
const prisma = new PrismaClient()

async function seed() {
  // minimal test data
  const user = await prisma.user.create({ data: { email: `testuser@example.com`, password: 'pass', name: 'Test User' } })
  const plan = await prisma.plan.create({ data: { name: 'Test Plan', price: 9.99, monthlyTokens: 100 } })
  await prisma.adTokenWallet.create({ data: { userId: user.id, balance: 0 } })
  return { user, plan }
}

seed()
  .then(() => { console.log('Test seed complete'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
