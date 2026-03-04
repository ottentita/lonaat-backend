const { PrismaClient } = require('@prisma/client')
;(async function(){
  const prisma = new PrismaClient()
  try {
    const u = await prisma.user.findUnique({ where: { email: 'admin@lonaat.com' }, select: { id: true, email: true, plan: true, planId: true, tokenBalance: true, subscriptionEndsAt: true, trialEndsAt: true } })
    console.log(JSON.stringify(u, null, 2))
  } catch (e) { console.error(e) } finally { await prisma.$disconnect() }
})()
