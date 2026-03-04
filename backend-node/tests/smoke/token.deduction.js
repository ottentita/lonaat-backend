const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async function(){
  try {
    // create test user
    const email = `deducttest+${Date.now()}@example.com`
    const user = await prisma.user.create({ data: { name: 'deducttest', email, password: 'x', plan: 'starter', tokenBalance: 50 } })
    console.log('Created user', user.id, 'balance', user.tokenBalance)

    // requireTokens-like transaction
    const amount = 10
    const remaining = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: user.id } })
      if (!u) throw new Error('User not found')
      const balance = (u.tokenBalance ?? u.tokens ?? 0)
      if (balance < amount) throw new Error('Insufficient tokens')
      const updated = await tx.user.update({ where: { id: user.id }, data: { tokenBalance: { decrement: amount } } })
      return updated.tokenBalance
    })

    console.log('Remaining after deduction:', remaining)
  } catch (e) {
    console.error('verify deduction failed:', e)
  } finally { await prisma.$disconnect() }
})()
