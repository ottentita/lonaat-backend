const { PrismaClient } = require('@prisma/client')
;(async function(){
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@lonaat.com' } })
    const yesterday = new Date(Date.now() - 24*60*60*1000)
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionEndsAt: yesterday } })
    console.log('updated', { id: user.id, subscriptionEndsAt: yesterday.toISOString() })
  } catch (e) { console.error(e) } finally { await prisma.$disconnect() }
})()
