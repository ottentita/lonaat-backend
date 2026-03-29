const { PrismaClient } = require('@prisma/client')
;(async function(){
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@lonaat.com' } })
    const tenDays = new Date(Date.now() + 10*24*60*60*1000)
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionEndsAt: tenDays } })
    console.log('set admin subscriptionEndsAt to', tenDays.toISOString())
  } catch (e) { console.error(e) } finally { await prisma.$disconnect() }
})()
