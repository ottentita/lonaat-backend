const { createPayment } = require('../src/services/payment.service')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

;(async function(){
  try {
    const payload = { userId: 1, provider: 'CRYPTO', amount: 10, currency: 'USD', status: 'PENDING', reference: 'CRYPTO_TEST_'+Date.now() }
    const res = await createPayment(payload)
    console.log('Created payment:', res)
  } catch (e) {
    console.error('createPayment error:', e)
  } finally { await prisma.$disconnect() }
})()
