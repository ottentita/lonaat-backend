import express from 'express'
import prisma from '../prisma'
import crypto from 'crypto'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { createCharge, verifySignature } from '../services/coinbase.service'

const router = express.Router()
import { handlePaymentWebhook } from '../modules/payments/webhook.controller'
import { validate } from '../middleware/validation'
import { webhookSchema } from '../schemas/requestSchemas'

// POST /api/payments/skrill/create
// Body: { userId, amount, currency, returnUrl, cancelUrl }
router.post('/skrill/create', async (req, res) => {
  try {
    const { userId, amount, currency = 'USD', returnUrl, cancelUrl } = req.body
    if (!userId || !amount || !returnUrl) return res.status(400).json({ error: 'userId, amount, and returnUrl required' })

    const transactionId = `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: Number(amount),
        currency: String(currency),
        provider: 'skrill',
        transactionId,
        status: 'pending',
      },
    })

    // Build a hosted payment URL for Skrill - in production use Skrill APIs. For dev we redirect to a configurable URL.
    const baseUrl = process.env.SKRILL_CHECKOUT_URL || 'https://pay.skrill.com/checkout'
    const params = new URLSearchParams()
    params.set('transaction_id', transactionId)
    params.set('amount', String(payment.amount))
    params.set('currency', payment.currency)
    params.set('return_url', returnUrl)
    if (cancelUrl) params.set('cancel_url', cancelUrl)

    // Optionally add merchant id
    if (process.env.SKRILL_MERCHANT_ID) params.set('merchant_id', process.env.SKRILL_MERCHANT_ID)

    const redirectUrl = `${baseUrl}?${params.toString()}`

    // Return redirect URL so frontend can redirect user
    res.json({ ok: true, payment, redirectUrl })
  } catch (err) {
    console.error('Create Skrill payment error:', err)
    res.status(500).json({ error: 'failed to create payment' })
  }
})

// POST /api/payments/skrill/webhook
// Accepts Skrill webhook/callback. Verifies signature using SKRILL_WEBHOOK_SECRET (HMAC-SHA256 of body)
router.post('/skrill/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const secret = process.env.SKRILL_WEBHOOK_SECRET
    const provided = (req.headers['x-skrill-signature'] || req.headers['x-signature'] || '') as string

    // Verify signature when secret is configured
    if (secret) {
      const computed = crypto.createHmac('sha256', secret).update(req.body).digest('hex')
      if (!provided || computed !== provided) {
        console.warn('Skrill webhook signature mismatch', { provided, computed })
        return res.status(403).send('invalid signature')
      }
    }

    // Parse body (try JSON first, fallback to urlencoded)
    let payload: any = {}
    try { payload = JSON.parse(req.body.toString()) } catch (e) {
      const s = req.body.toString()
      payload = Object.fromEntries(new URLSearchParams(s))
    }

    const tx = payload.transaction_id || payload.transactionId || payload.tx || payload.transaction
    const status = payload.status || payload.transaction_status || 'pending'
    const amount = payload.amount ? Number(payload.amount) : undefined
    const currency = payload.currency || payload.curr || undefined

    if (!tx) return res.status(400).send('missing transaction id')

    const payment = await prisma.payment.findUnique({ where: { transactionId: String(tx) } })
    if (!payment) return res.status(404).send('payment not found')

    // Optional verification: check amount and currency if provided
    if (amount !== undefined && amount !== Number(payment.amount)) {
      console.warn('Webhook amount mismatch', { expected: payment.amount, received: amount })
      // continue but mark verification issue
    }

    // Update payment status
    const newStatus = (String(status).toLowerCase().includes('success') || String(status).toLowerCase().includes('completed') || String(status).toLowerCase().includes('paid')) ? 'completed' : String(status)
    await prisma.payment.update({ where: { id: payment.id }, data: { status: newStatus } })

    // Activate user subscription (simple implementation: set role = 'subscriber')
    if (payment.userId && newStatus === 'completed') {
      await prisma.user.update({ where: { id: payment.userId }, data: { role: 'subscriber', isActive: true } })
    }

    // Respond with 200 OK to acknowledge
    res.status(200).send('OK')
  } catch (err) {
    console.error('Skrill webhook error:', err)
    res.status(500).send('error')
  }
})

// ================= Coinbase Commerce integration =================

const PACKAGES: Record<string, { price: number; tokens: number }> = {
  small: { price: 10, tokens: 100 },
  medium: { price: 25, tokens: 300 },
  large: { price: 70, tokens: 1000 }
}

// POST /api/payments/create
// Coinbase payment creation - takes custom amount
router.post('/create', async (req, res) => {
  try {
    const { amount, description, name } = req.body

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' })
    }

    const apiKey = process.env.COINBASE_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Coinbase API key not configured' })
    }

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify({
        name: name || 'Payment',
        description: description || 'Payment for services',
        pricing_type: 'fixed_price',
        local_price: {
          amount: String(amount),
          currency: 'USD'
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Coinbase API error:', error)
      return res.status(response.status).json({ error: 'Coinbase API error' })
    }

    const data = await response.json()
    return res.status(200).json(data)

  } catch (error) {
    console.error('Create payment error:', error)
    res.status(500).json({ error: 'Payment creation failed' })
  }
})

// POST /api/payments/create-charge
// Body: { package: 'small'|'medium'|'large' }
router.post('/create-charge', authMiddleware, async (req: AuthRequest, res: express.Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { package: pack } = req.body as { package: string }
    if (!pack || !PACKAGES[pack]) {
      return res.status(400).json({ error: 'Invalid package' })
    }

    const { price, tokens } = PACKAGES[pack]
    const charge = await createCharge(userId, tokens, price)

    // store pending token purchase record with charge id to prevent duplicates
    await prisma.tokenPurchase.create({
      data: {
        userId,
        amount: tokens,
        chargeId: charge.charge_id
      }
    })

    return res.json({ hosted_url: charge.hosted_url })
  } catch (error: any) {
    console.error('create-charge error', error)
    return res.status(500).json({ error: error.message || 'Failed to create charge' })
  }
})

// Exported webhook handler so it can be mounted with raw body parsing before JSON parser
export async function webhookHandler(req: express.Request, res: express.Response) {
  try {
    const signature = (req.headers['x-cc-webhook-signature'] || req.headers['X-CC-Webhook-Signature']) as string | undefined

    // req.body MUST be the raw Buffer here
    const raw = req.body as Buffer

    // Verify signature using raw body buffer. Do not JSON.parse before verifying.
    if (!verifySignature(raw, signature)) {
      return res.status(400).send('Invalid signature')
    }

    const event = JSON.parse(raw.toString())

    // Minimal debug logging (do NOT log secrets)
    // webhook event received

    if (event.type !== 'charge:confirmed') {
      return res.status(200).send('ignoring event')
    }

    const charge = event.data
    const metadata = charge.metadata || {}
    const userId = Number(metadata.userId)
    const tokens = Number(metadata.tokens)
    const chargeId = charge.id

    // charge processed

    if (!userId || !tokens || !chargeId) {
      return res.status(400).send('missing metadata')
    }

    // Idempotency protection: check tokenPurchase for existing processed charge
    const existingPurchase = await prisma.tokenPurchase.findUnique({ where: { chargeId: String(chargeId) } as any })
    if (existingPurchase && existingPurchase.amount > 0) {
      return res.status(200).send('already processed')
    }

    // Credit user tokens exactly once
    await prisma.user.update({ where: { id: Number(userId) }, data: { tokens: { increment: Number(tokens) } } })

    // Persist token purchase record if missing
    if (!existingPurchase) {
      await prisma.tokenPurchase.create({ data: { userId: Number(userId), amount: Number(tokens), chargeId: String(chargeId) } })
    }

    return res.status(200).send('processed')
  } catch (err: any) {
    console.error('coinbase webhook error', err?.message || err)
    return res.status(500).send('error')
  }
}


// POST /api/payments/webhook/coinbase
// Coinbase webhook endpoint - logs and returns OK
router.post('/webhook/coinbase', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    // raw webhook received
    res.status(200).send('OK')
  } catch (error) {
    console.error('Coinbase webhook error:', error)
    res.status(500).send('error')
  }
})

// No router-level alias: prefer the central `/api/payments/webhook` mount in index.ts
// generic payment webhook endpoint
router.post('/webhook', express.json(), validate(webhookSchema, 'body'), handlePaymentWebhook)

export default router
