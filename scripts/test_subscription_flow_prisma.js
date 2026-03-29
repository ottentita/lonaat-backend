const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { activatePlan } = require('../dist/services/plan.activation.service') || require('../src/services/plan.activation.service')
const { requireTokens, addTokens } = require('../dist/services/token.service') || require('../src/services/token.service')
const { runSubscriptionCleanup } = require('../src/jobs/subscriptionCleanup')

async function main() {
  // create plan if none
  let plan = await prisma.plan.findFirst({ where: { name: 'Basic' } })
  if (!plan) {
    plan = await prisma.plan.create({ data: { name: 'Basic', price: 10, monthlyTokens: 200 } })
    console.log('Created plan', plan.id)
  }

  // create user on trial
  const user = await prisma.user.create({ data: { name: 'flow-test', email: `flow-${Date.now()}@example.com`, password: 'hashed-placeholder', plan: 'trial', tokenBalance: 0, trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } })
  console.log('Created user', user.id)

  // expire trial by setting trialEndsAt in past
  await prisma.user.update({ where: { id: user.id }, data: { trialEndsAt: new Date(Date.now() - 1000 * 60 * 60 * 24) } })
  console.log('Expired trial for user', user.id)

  // run subscription cleanup
  const cleanup = require('../src/jobs/subscriptionCleanup')
  await cleanup.runSubscriptionCleanup()
  const after = await prisma.user.findUnique({ where: { id: user.id } })
  console.log('After cleanup user.plan:', after.plan, 'tokenBalance:', after.tokenBalance)

  // create payment
  const reference = 'CRYPTO_TEST_' + Date.now()
  await prisma.payment.create({ data: { userId: user.id, provider: 'CRYPTO', amount: 10, currency: 'USDT', status: 'PENDING', transactionId: reference } })
  console.log('Payment created', reference)

  // user submits txHash
  await prisma.payment.update({ where: { transactionId: reference }, data: { txHash: '0xdeadbeef', status: 'AWAITING_ADMIN_CONFIRMATION' } })
  console.log('Payment submitted with txHash')

  // admin approves -> activate plan
  await (async () => {
    const planId = plan.id
    const service = require('../src/services/plan.activation.service')
    await service.activatePlan(user.id, planId)
    console.log('Activated plan for user')
  })()

  const updated = await prisma.user.findUnique({ where: { id: user.id } })
  console.log('User after activation:', { plan: updated.plan, tokenBalance: updated.tokenBalance, subscriptionEndsAt: updated.subscriptionEndsAt })

  // require tokens
  const tokenService = require('../src/services/token.service')
  const remaining = await tokenService.requireTokens(user.id, 10).catch(e => { console.error('Require tokens error:', e.message); return null })
  console.log('Remaining tokens after deduction:', remaining)

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
