const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

;(async function(){
  // CLI flag handling
  const args = process.argv.slice(2)
  const DRY_FLAG = args.includes('--dry')
  if (DRY_FLAG) {
    process.env.AI_DRY_RUN = 'true'
    console.log('AI smoke test running in DRY_RUN mode')
  }
  const IS_DRY = String(process.env.AI_DRY_RUN || '').toLowerCase() === 'true'

  const base = 'http://localhost:4000'
  const prisma = new PrismaClient()
  // Create ephemeral test user credentials
  const testEmail = `ai-smoke-${Date.now()}@example.com`
  const testPassword = 'TestPass123!'
  let createdUserId = null

  try {
    // 1) create user in DB with hashed password, basic plan and seeded tokens
    const hash = await bcrypt.hash(testPassword, 10)
    const newUser = await prisma.user.create({ data: { name: 'AI Smoke Test', email: testEmail, password: hash, plan: 'basic', tokenBalance: 100 } })
    createdUserId = newUser.id
    console.log('Created ephemeral test user:', testEmail, 'id=', createdUserId)

    // 2) login to obtain JWT
    const loginRes = await axios.post(base + '/api/auth/login', { email: testEmail, password: testPassword }, { timeout: 10000 })
    const token = loginRes.data && (loginRes.data.token || loginRes.data.accessToken)
    if (!token) throw new Error('No token returned from login')
    console.log('Obtained JWT token')

    // 3) read balance before
    const userBefore = await prisma.user.findUnique({ where: { id: createdUserId }, select: { id: true, email: true, tokenBalance: true, plan: true } })
    console.log('Token before:', userBefore.tokenBalance, 'plan:', userBefore.plan)

    // 4) call AI feature
    const aiReq = { action: 'TEXT_GENERATION', payload: { prompt: 'Test AI execution' } }
    const headers = { Authorization: `Bearer ${token}` }
    if (DRY_FLAG) headers['x-ai-dry-run'] = 'true'
    const res = await axios.post(base + `/api/ai/${aiReq.action}`, aiReq, { headers, timeout: 20000 })
    console.log('AI response status:', res.status)
    console.log('AI response body:', JSON.stringify(res.data))

    // 5) verify deduction (behavior differs in dry-run)
    const tokensUsed = res.data && (res.data.tokensUsed || res.data.tokens_used || 0)
    const simulated = res.data && (res.data.simulated === true)
    const userAfter = await prisma.user.findUnique({ where: { id: createdUserId }, select: { tokenBalance: true } })
    console.log('Token after:', userAfter.tokenBalance)

    const before = Number(userBefore.tokenBalance || 0)
    const after = Number(userAfter.tokenBalance || 0)
    const diff = before - after

    console.log('\n--- Verification ---')
    console.log('dry mode:', IS_DRY)
    console.log('tokensUsed (response):', tokensUsed)
    console.log('simulated flag (response):', simulated)
    console.log('balance change (before - after):', diff)

    if (IS_DRY) {
      if (!simulated) {
        console.error('Expected simulated=true in dry-run mode')
        process.exitCode = 7
        return
      }
      if (tokensUsed <= 0) {
        console.error('Dry-run: tokensUsed must be > 0')
        process.exitCode = 8
        return
      }
      if (before !== after) {
        console.error('Dry-run: expected no DB token change (before == after)')
        process.exitCode = 9
        return
      }
      console.log('Dry-run verification success: simulated and no DB change')
    } else {
      if (simulated) {
        console.error('Unexpected simulated flag in normal mode')
        process.exitCode = 10
        return
      }
      if (diff !== Number(tokensUsed)) {
        console.error('Mismatch: tokensUsed does not equal balance change')
        process.exitCode = 5
        return
      }
      if (after < 0) {
        console.error('Invalid: negative token balance after deduction')
        process.exitCode = 6
        return
      }
      console.log('Normal-mode verification success: token deduction matched and non-negative')
    }
    process.exitCode = 0
  } catch (e) {
    if (e.response) {
      console.error('HTTP error', e.response.status, e.response.data)
    } else {
      console.error('Error', e.message || e)
    }
    process.exitCode = 1
  } finally {
    try {
      if (createdUserId) {
        // delete related token ledger and token account entries if present
        await prisma.tokenLedger.deleteMany({ where: { userId: createdUserId } }).catch(()=>{})
        await prisma.tokenAccount.deleteMany({ where: { userId: createdUserId } }).catch(()=>{})
        await prisma.user.delete({ where: { id: createdUserId } }).catch(()=>{})
        console.log('Cleaned up ephemeral user id=', createdUserId)
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr)
    } finally {
      await prisma.$disconnect()
    }
  }
})()
