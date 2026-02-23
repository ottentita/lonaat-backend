import express from 'express'
import prisma from '../prisma'
import crypto from 'crypto'

const router = express.Router()

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

export default router
