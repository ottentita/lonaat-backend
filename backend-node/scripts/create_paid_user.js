const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

;(async function(){
  const prisma = new PrismaClient()
  try {
    const email = 'paidtest@example.com'
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      console.log('user exists', existing.id)
      process.exit(0)
    }
    const hash = await bcrypt.hash('PaidPass123!', 10)
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24*60*60*1000)
    const user = await prisma.user.create({ data: { name: 'paidtest', email, password: hash, plan: 'STARTER', planId: 3, tokenBalance: 0, subscriptionEndsAt: yesterday } })
    console.log('created paid user', { id: user.id, email: user.email })
  } catch (e) { console.error(e) } finally { await prisma.$disconnect() }
})()
