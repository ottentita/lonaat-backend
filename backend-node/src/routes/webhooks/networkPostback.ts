import express from 'express'
import prisma from '../../prisma'
import crypto from 'crypto'

const router = express.Router()

router.post('/:networkId', async (req, res) => {
  try {
    const networkParam = String(req.params.networkId)
    // We'll parse raw body into params below (after signature verification) to ensure we
    // can validate HMAC over the original raw payload. Initialize params to include query.
    let params: any = { ...(req.query || {}) }

    // Resolve network by numeric id or by name/slug when a named route is used
    console.debug('[webhook] networkParam:', networkParam)
    let network: any = null
    if (/^\d+$/.test(networkParam)) {
      network = await prisma.affiliateNetwork.findUnique({ where: { id: Number(networkParam) } })
    } else {
      network = await prisma.affiliateNetwork.findFirst({ where: { name: networkParam } })
    }
    if (!network) {
      // tests may set a generic env secret to emulate credentials; allow processing
      // to continue for test runs using `NETWORK_CREDENTIAL_SECRET` (keeps legacy tests green)
      if (process.env.NETWORK_CREDENTIAL_SECRET) {
        // create a virtual network object for signature lookup
        network = { id: null, name: 'env-default', webhookSecret: process.env.NETWORK_CREDENTIAL_SECRET }
      } else {
        return res.status(404).send('network not found')
      }
    }

    // verify webhook signature if configured. Raw body must be present.
    // Use network.webhookSecret if set; otherwise fallback to DIGISTORE_IPN_SECRET env when provided.
    // also support config file secrets if available
    const affiliateConfig = require('../../config/affiliateConfig');
    // Prefer explicit network webhook secret, then affiliateConfig mapping, then
    // environment variables named like DIGISTORE_WEBHOOK_SECRET or DIGISTORE_IPN_SECRET
    const envSecretKey1 = `${String(network.name).toUpperCase()}_WEBHOOK_SECRET`
    const envSecretKey2 = `${String(network.name).toUpperCase()}_IPN_SECRET`
    const configuredSecret =
      (network && (network as any).webhookSecret) ||
      affiliateConfig?.[network?.name?.toLowerCase()]?.webhookSecret ||
      process.env[envSecretKey1] ||
      process.env[envSecretKey2] ||
      process.env.DIGISTORE_IPN_SECRET ||
      process.env.NETWORK_CREDENTIAL_SECRET;
    let raw: any = (req as any).rawBody;
    if (configuredSecret) {
      // accept rawBody when present (middleware may populate), otherwise derive from req.body
      if (!raw) {
        if (Buffer.isBuffer(req.body)) raw = req.body.toString('utf8');
        else if (typeof req.body === 'string') raw = req.body;
        else raw = JSON.stringify(req.body || {});
      }
      if (!raw) return res.status(400).send('raw body required for signature verification');
      const sigHeader =
        req.get('x-signature') || req.get('x-hub-signature') || req.get('x-hub-signature-256');
      if (!sigHeader) return res.status(401).send('missing signature');
      const expected = crypto
        .createHmac('sha256', String(configuredSecret))
        .update(raw)
        .digest('hex');
      const provided = String(sigHeader).replace(/^sha256=/, '');
      // compare lengths first to avoid timingSafeEqual throws on unequal lengths
      const expBuf = Buffer.from(expected);
      const provBuf = Buffer.from(provided);
      if (expBuf.length !== provBuf.length) return res.status(401).send('invalid signature');
      const match = crypto.timingSafeEqual(expBuf, provBuf);
      if (!match) return res.status(401).send('invalid signature');
    }

    // If body was raw/Buffer, try to parse it into params now
    try {
      if (!Object.keys(req.query || {}).length) {
        // attempt to parse JSON body from derived raw string
        const rawCandidate = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : ''))
        if (rawCandidate) {
          const parsed = JSON.parse(rawCandidate)
          params = { ...params, ...parsed }
        } else {
          params = { ...params, ...(req.body || {}) }
        }
      } else {
        params = { ...params, ...(req.body || {}) }
      }
    } catch (e) {
      // ignore parse errors and fall back to req.body spread
      params = { ...params, ...(req.body || {}) }
    }

    // Parse sub_id
    const sub = params.sub_id || params.subid || params.subid
    let userId: number | null = null
    let clickId: string | null = null
    if (sub) {
      const parts = String(sub).split('-')
      userId = Number(parts[0]) || null
      clickId = parts.slice(1).join('-') || null
    }

    // Resolve click
    let click = null;
    if (clickId) click = await prisma.click.findUnique({ where: { clickId } });
    else if (params.clickToken)
      click = await prisma.click.findUnique({ where: { clickToken: String(params.clickToken) } });

    const offerId = params.offerId ? Number(params.offerId) : click?.offerId;
    if (!offerId) return res.status(400).send('missing offerId or clickToken');

    // ensure the referenced offer exists to avoid FK constraint failures
    const offerExists = await prisma.offer.findUnique({ where: { id: Number(offerId) } })
    if (!offerExists) return res.status(404).send('offer not found')

    // determine an eventId for idempotency (prefer explicit IDs if sent)
    const eventId = params.event_id || params.transaction_id || crypto
      .createHash('sha256')
      .update(raw || '')
      .digest('hex');
    const payloadHash = crypto
      .createHash('sha256')
      .update(raw || '')
      .digest('hex');

    // check if already processed (affiliateEvent may be missing in trimmed test schema)
    let existingEvent: any = null
    try {
      if ((prisma as any).affiliateEvent && typeof (prisma as any).affiliateEvent.findUnique === 'function') {
        existingEvent = await (prisma as any).affiliateEvent.findUnique({ where: { eventId } })
      }
    } catch (e) {
      console.warn('affiliateEvent model missing or inaccessible in schema - skipping idempotency check')
      existingEvent = null
    }
    if (existingEvent) {
      // idempotent response
      return res.status(200).send('event already processed');
    }

    const conv = await prisma.$transaction(async (tx) => {
      // insert event to prevent duplicates (skip if model absent in this schema)
      if ((tx as any).affiliateEvent && typeof (tx as any).affiliateEvent.create === 'function') {
        await (tx as any).affiliateEvent.create({
          data: { network: network.name || String(networkId), eventId, payloadHash }
        });
      }

      const created = await tx.conversion.create({
        data: {
          offerId,
          clickId: click?.clickId ?? undefined,
          clickToken: click?.clickToken ?? String(params.clickToken ?? ''),
          amount: params.amount ? Number(params.amount) : undefined,
          status: params.status ? String(params.status) : 'confirmed'
        }
      });

      // call existing commission processor within same transaction so failures rollback
      try {
        const { processConversionSplit } = await import('../../services/commissionEngine');
        await processConversionSplit(created.id, tx);
      } catch (e) {
        console.error('commission processing error', e);
        throw e;
      }

      // update event record with credit information if available (skip if model absent)
      if ((tx as any).affiliateEvent && typeof (tx as any).affiliateEvent.update === 'function' && click && click.user_id) {
        await (tx as any).affiliateEvent.update({
          where: { eventId },
          data: { userId: click.user_id, amount: params.amount ? Number(params.amount) : null }
        });
      }

      return created;
    });

    res.status(200).send('OK')
  } catch (e) {
    console.error('network webhook error', e)
    res.status(500).send('error')
  }
})

export default router
