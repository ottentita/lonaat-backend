const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

;(async function main(){
  try {
    const exists = await prisma.plan.findFirst({ where: { name: 'STARTER' } })
    if (exists) {
      console.log('exists', { id: exists.id, name: exists.name, monthlyTokens: exists.monthlyTokens })
      process.exit(0)
    }
    const p = await prisma.plan.create({ data: { name: 'STARTER', price: 0, monthlyTokens: 400 } })
    console.log('created', { id: p.id, name: p.name, monthlyTokens: p.monthlyTokens })
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
})()
