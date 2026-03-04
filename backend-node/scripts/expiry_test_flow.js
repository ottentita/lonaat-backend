const axios = require('axios')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const BASE = 'http://localhost:4000'

;(async function(){
  try {
    const email = 'expiretest@example.com'
    const password = 'Password123!'
    const login = await axios.post(BASE + '/api/auth/login', { email, password }, { headers: { 'Content-Type': 'application/json', Connection: 'close' } })
    const token = login.data.token
    console.log('got token len', token.length)

    // expire subscription
    const user = await prisma.user.findUnique({ where: { email } })
    const yesterday = new Date(Date.now() - 24*60*60*1000)
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionEndsAt: yesterday } })
    console.log('set subscriptionEndsAt to yesterday')

    try {
      const resp = await axios.post(BASE + '/api/ai/generate-ai-content-test', {}, { headers: { Authorization: 'Bearer ' + token, Connection: 'close', 'Content-Type': 'application/json' } })
      console.log('Protected AI route response:', resp.status, resp.data)
    } catch (e) {
      console.log('Protected AI route expected error:', e.response ? e.response.status : e.message, e.response ? e.response.data : '')
    }
  } catch (e) {
    console.error(e.response ? e.response.data : e.message)
  } finally { await prisma.$disconnect() }
})()
