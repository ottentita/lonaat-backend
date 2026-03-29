const axios = require('axios')
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const BASE = 'http://localhost:4000'
const axiosInstance = axios.create({ headers: { Connection: 'close' } })
const prisma = new PrismaClient()

function printResp(prefix, resp) {
  console.log('--- ' + prefix + ' RESPONSE ---')
  console.log('status:', resp.status)
  console.log('data:', JSON.stringify(resp.data, null, 2))
}

;(async function(){
  try {
    // Login using local login.json
    const loginBody = JSON.parse(fs.readFileSync('./login.json','utf8'))
    const loginResp = await axiosInstance.post(BASE + '/api/auth/login', loginBody, { headers: { 'Content-Type': 'application/json' } })
    printResp('LOGIN', loginResp)
    const token = loginResp.data.token

    // Create crypto payment
    const createBody = { amount: 10, currency: 'USD', planId: 3 }
    const createResp = await axiosInstance.post(BASE + '/api/payment/crypto', createBody, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } })
    printResp('CREATE_PAYMENT', createResp)
    const reference = createResp.data.reference

    // Confirm txHash
    const txHash = '0xdeadbeef' + Date.now()
    const confirmResp = await axiosInstance.post(BASE + '/api/payment/crypto/confirm', { reference, txHash, planId: createBody.planId }, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } })
    printResp('CONFIRM_PAYMENT', confirmResp)

    // Admin approve
    const approveResp = await axiosInstance.post(BASE + '/api/payment/crypto/admin-approve', { reference, planId: createBody.planId }, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } })
    printResp('ADMIN_APPROVE', approveResp)

    // Verify user via DB
    const user = await prisma.user.findUnique({ where: { email: loginBody.email }, select: { id: true, email: true, plan: true, planId: true, tokenBalance: true, subscriptionEndsAt: true, trialEndsAt: true } })
    console.log('--- USER AFTER ACTIVATION ---')
    console.log(JSON.stringify(user, null, 2))

    console.log('Subscription E2E completed')
  } catch (e) {
    console.error('E2E FAILED', e.response ? e.response.data : e.message)
  } finally {
    await prisma.$disconnect()
  }
})()
