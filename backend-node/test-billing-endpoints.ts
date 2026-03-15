import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as jwt from 'jsonwebtoken'
import axios from 'axios'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'

async function testBillingEndpoints() {
  const { default: app } = await import('./src/index')
  const server = app.listen(4000)

  try {
    console.log('💳 Starting Billing Endpoints Test\n')

    // Setup test user
    console.log('1️⃣ Setting up test user...')
    let user = await prisma.user.findUnique({
      where: { email: 'billing-test@example.com' }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'billing-test@example.com',
          password: 'test_hash_123',
          plan: 'free',
          tokens: 10
        }
      })
      console.log(`✅ Created test user: ${user.email}\n`)
    } else {
      // Reset user for fresh test
      await prisma.user.update({
        where: { id: user.id },
        data: { tokens: 10 }
      })
      // Clear previous purchases
      await prisma.tokenPurchase.deleteMany({
        where: { userId: user.id }
      })
      // Clear previous usage
      await prisma.aiUsage.deleteMany({
        where: { userId: user.id }
      })
      console.log(`✅ Using existing user: ${user.email}\n`)
    }

    // Generate JWT token
    console.log('2️⃣ Generating JWT token...')
    const token = jwt.sign(
      { userId: user.id, id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    console.log(`✅ Token generated\n`)

    // Test 1: GET /api/billing/balance
    console.log('3️⃣ Testing GET /api/billing/balance...')
    try {
      const balanceResponse = await axios.get(
        'http://localhost:4000/api/billing/balance',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log('✅ Balance endpoint successful!')
      console.log(`   Plan: ${balanceResponse.data.plan}`)
      console.log(`   Current Tokens: ${balanceResponse.data.tokens}`)
      console.log(`   Total Used: ${balanceResponse.data.totalUsed}\n`)
    } catch (error: any) {
      console.error(`❌ Balance failed: ${error.message}`)
    }

    // Test 2: POST /api/billing/purchase-tokens (small package)
    console.log('4️⃣ Testing POST /api/billing/purchase-tokens (small: 50 tokens)...')
    try {
      const purchaseResponse = await axios.post(
        'http://localhost:4000/api/billing/purchase-tokens',
        { package: 'small' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log('✅ Purchase successful!')
      console.log(`   Package: ${purchaseResponse.data.package}`)
      console.log(`   Amount: ${purchaseResponse.data.amount} tokens`)
      console.log(`   New Balance: ${purchaseResponse.data.newBalance} tokens\n`)
    } catch (error: any) {
      console.error(`❌ Purchase failed: ${error.message}`)
    }

    // Test 3: POST /api/billing/purchase-tokens (medium package)
    console.log('5️⃣ Testing POST /api/billing/purchase-tokens (medium: 150 tokens)...')
    try {
      const purchaseResponse = await axios.post(
        'http://localhost:4000/api/billing/purchase-tokens',
        { package: 'medium' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log('✅ Purchase successful!')
      console.log(`   Package: ${purchaseResponse.data.package}`)
      console.log(`   Amount: ${purchaseResponse.data.amount} tokens`)
      console.log(`   New Balance: ${purchaseResponse.data.newBalance} tokens\n`)
    } catch (error: any) {
      console.error(`❌ Purchase failed: ${error.message}`)
    }

    // Test 4: Check updated balance
    console.log('6️⃣ Checking updated balance after purchases...')
    try {
      const balanceResponse = await axios.get(
        'http://localhost:4000/api/billing/balance',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log('✅ Updated balance:')
      console.log(`   Current Tokens: ${balanceResponse.data.tokens}`)
      console.log(`   Expected: 210 (10 + 50 + 150)\n`)
    } catch (error: any) {
      console.error(`❌ Balance check failed: ${error.message}`)
    }

    // Test 5: GET /api/billing/usage-summary
    console.log('7️⃣ Testing GET /api/billing/usage-summary...')
    try {
      const summaryResponse = await axios.get(
        'http://localhost:4000/api/billing/usage-summary',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log('✅ Usage summary successful!')
      console.log(`   Total Tokens Used: ${summaryResponse.data.totalTokensUsed}`)
      console.log(`   Total Drafts Created: ${summaryResponse.data.totalDraftsCreated}`)
      console.log(`   Estimated AI Cost: $${summaryResponse.data.estimatedAICost}`)
      console.log(`   Total Tokens Purchased: ${summaryResponse.data.totalTokensPurchased}\n`)
    } catch (error: any) {
      console.error(`❌ Usage summary failed: ${error.message}`)
    }

    // Test 6: Test invalid package
    console.log('8️⃣ Testing invalid package (should fail)...')
    try {
      await axios.post(
        'http://localhost:4000/api/billing/purchase-tokens',
        { package: 'invalid' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      console.log('❌ Should have rejected invalid package')
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log(`✅ Correctly rejected invalid package: ${error.response?.data?.error}\n`)
      } else {
        console.error(`❌ Unexpected error: ${error.message}`)
      }
    }

    // Test 7: Test unauthorized access
    console.log('9️⃣ Testing unauthorized access (no token)...')
    try {
      await axios.get('http://localhost:4000/api/billing/balance')
      console.log('❌ Should have rejected request without token')
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log(`✅ Correctly rejected unauthorized request: ${error.response?.data?.error}\n`)
      } else {
        console.error(`❌ Unexpected error: ${error.message}`)
      }
    }

    console.log('✨ Billing Endpoints Test Complete!')

    // --- Additional Coinbase Commerce tests ---
    console.log('\n🔌 Running Coinbase Commerce flow test...')
    // override createCharge to avoid network call
    const coinbase = await import('./src/services/coinbase.service')
    coinbase.createCharge = async (userId: number, tokens: number, price: number) => {
      return {
        hosted_url: 'https://commerce.coinbase.com/charges/mock',
        charge_id: 'mockcharge123'
      }
    }

    try {
      // Step: create charge
      const createResp = await axios.post(
        'http://localhost:4000/api/payments/create-charge',
        { package: 'small' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      console.log('✅ Coinbase charge created:', createResp.data)

      // verify tokenPurchase record
      const purchaseRecord = await prisma.tokenPurchase.findUnique({ where: { chargeId: 'mockcharge123' } })
      if (purchaseRecord) {
        console.log('   ✅ TokenPurchase stored, amount:', purchaseRecord.amount)
      } else {
        console.error('   ❌ TokenPurchase missing')
      }

      // simulate webhook
      process.env.COINBASE_COMMERCE_WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET || 'testsecret'
      const event = {
        type: 'charge:confirmed',
        data: {
          id: 'mockcharge123',
          metadata: { userId: user.id, tokens: 100 }
        }
      }
      const rawBody = Buffer.from(JSON.stringify(event))
      const sig = require('crypto')
        .createHmac('sha256', process.env.COINBASE_COMMERCE_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')

      const webhookResp = await axios.post(
        'http://localhost:4000/api/payments/webhook',
        rawBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CC-Webhook-Signature': sig
          }
        }
      )
      console.log('✅ Webhook responded', webhookResp.status)

      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } })
      console.log('   ✅ User tokens after webhook:', updatedUser?.tokens)
    } catch (err: any) {
      console.error('❌ Coinbase flow failed:', err.message)
    }

    console.log('🎉 All tests complete.')
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
    server.close()
  }
}

// Run the test
testBillingEndpoints()
