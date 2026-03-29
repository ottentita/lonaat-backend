const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
;(async function(){
  try {
    const reference = 'CRYPTO_TEST_' + Date.now()
    const p = await prisma.payment.create({ data: { userId: 1, provider: 'CRYPTO', amount: 10, currency: 'USD', status: 'PENDING', transactionId: reference } })
    console.log('Created payment via prisma:', p)
  } catch (e) {
    console.error('prisma create error:', e)
  } finally { await prisma.$disconnect() }
})()
