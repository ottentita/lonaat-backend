import express from 'express'
import prisma from '../prisma'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { validateEvent } from '../services/eventStandardization';

const router = express.Router()

const SECRETS_FILE = path.join(__dirname, '..', '..', 'data', 'postback_secrets.json')
const RESPONSES_ENV = process.env.POSTBACK_RESPONSES || undefined

function loadSecrets(): Record<string, string> {
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const raw = fs.readFileSync(SECRETS_FILE, 'utf8')
      return JSON.parse(raw || '{}')
    }
  } catch (e) {
    console.warn('Failed to load secrets file', e)
  }
  try { return process.env.POSTBACK_SECRETS ? JSON.parse(process.env.POSTBACK_SECRETS) : {} } catch (e) { return {} }
}

function loadResponses(): Record<string, string> {
  try { return RESPONSES_ENV ? JSON.parse(RESPONSES_ENV) : {} } catch (e) { return {} }
}

// Generic postback receiver for CPA networks
// - Accepts POST (or GET via query) with either clickToken or clickId or offerId
// - Optional network signature validation using HMAC-SHA256 with secret stored in data/postback_secrets.json or POSTBACK_SECRETS env var
// - Idempotent: if a matching conversion already exists (same clickId and amount and status) it will not create a duplicate
router.post('/', async (req, res) => {
  try {
    const params: any = { ...(req.query || {}), ...(req.body || {}) }
    const network = params.network
    const sig = params.sig || params.signature

    const secrets = loadSecrets()
    const secret = network ? secrets[network] : undefined

    if (secret && sig) {
      const base = Object.keys(params)
        .filter((k) => k !== 'sig' && k !== 'signature')
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&')
      const h = crypto.createHmac('sha256', secret).update(base).digest('hex')
      
      if (h !== String(sig)) return res.status(403).send('invalid signature')
    }

    // Resolve click by token or id when provided
    let click = null
    // If sub_id present (our format: "{userId}-{clickId}"), try to resolve click by clickId encoded in sub_id
    if (params.sub_id && !params.clickToken && !params.clickId) {
      try {
        const parts = String(params.sub_id).split('-')
        // clickId may contain dashes; everything after first dash is clickId
        const clickIdPart = parts.slice(1).join('-')
        if (clickIdPart) click = await prisma.click.findUnique({ where: { clickId: String(clickIdPart) } })
      } catch (e) { /* ignore */ }
    }
    if (!click) {
      if (params.clickToken) click = await prisma.click.findUnique({ where: { clickToken: String(params.clickToken) } })
      else if (params.clickId) click = await prisma.click.findUnique({ where: { clickId: String(params.clickId) } })
    }

    const offerId = params.offerId ? Number(params.offerId) : click?.offerId
    if (!offerId) return res.status(400).send('missing offerId or clickToken')

    const clickIdVal = click?.clickId || (params.clickId ? String(params.clickId) : undefined)

    // Idempotency: check for existing conversion with same clickId and amount and status
    if (clickIdVal) {
      const whereClause: any = { clickId: clickIdVal }
      if (params.amount !== undefined) whereClause.amount = Number(params.amount)
      if (params.status !== undefined) whereClause.status = String(params.status)
      const existing = await prisma.conversion.findFirst({ where: whereClause })
      if (existing) {
        const responses = loadResponses()
        const resp = (network && responses[network]) || responses['default'] || 'OK'
        return res.status(200).send(resp)
      }
    }

    const conv = await prisma.conversion.create({
      data: {
        offerId,
        clickId: clickIdVal,
        clickToken: click?.clickToken ? String(click.clickToken) : String(params.clickToken ?? clickIdVal ?? ''),
        amount: params.amount ? Number(params.amount) : undefined,
        status: params.status ? String(params.status) : 'confirmed',
      },
    })

    // Attempt to process commission split asynchronously (do not fail the postback if this errors)
    try {
      // lazy-load to avoid circular imports when running tests
      const { processConversionSplit } = await import('../services/commissionEngine')
      await processConversionSplit(conv.id)
    } catch (e) {
      console.error('Commission split error (non-fatal):', e)
    }

    const standardizedEvent = {
      event_type: 'conversion',
      network: network,
      product_id: params.product_id,
      transaction_id: params.transaction_id,
      commission: parseFloat(params.amount),
      currency: params.currency,
      timestamp: new Date().toISOString(),
    };

    const validation = validateEvent(standardizedEvent);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      return res.status(400).json({ error: 'Invalid event payload', details: validation.errors });
    }

    const responses = loadResponses()
    const resp = (network && responses[network]) || responses['default'] || 'OK'
    res.status(200).send(resp)
  } catch (err) {
    console.error('Postback error:', err)
    res.status(500).send('error')
  }
})

// Helper to generate HMAC signature for testing (admin)
router.post('/sign', async (req, res) => {
  try {
    const { network, params } = req.body
    if (!network || !params) return res.status(400).json({ error: 'network and params required' })
    const secrets = loadSecrets()
    const secret = secrets[network]
    if (!secret) return res.status(404).json({ error: 'secret not found for network' })

    // Build base string the same way verification does: include all params (and network if present), exclude sig fields
    const combined: Record<string, any> = { ...(params || {}) }
    if (network) combined.network = network
    const base = Object.keys(combined).sort().map((k) => `${k}=${combined[k]}`).join('&')
    const sig = crypto.createHmac('sha256', secret).update(base).digest('hex')
    res.json({ signature: sig, base })
  } catch (e) {
    console.error('sign error', e)
    res.status(500).json({ error: 'failed' })
  }
})

export default router
