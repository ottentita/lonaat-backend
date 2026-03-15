import express from 'express'
import prisma from '../prisma'
import crypto from 'crypto'

const router = express.Router()

import { validate } from '../middleware/validation'
import { clickSchema, conversionSchema } from '../schemas/requestSchemas'
import { getAdapterForNetwork } from '../networks/registry'
import { adapterRegistry } from '../affiliate/adapterRegistry'

router.post('/click', validate(clickSchema, 'body'), async (req, res) => {
  try {
    const { offerId, clickId, ip, userAgent, externalSubId } = req.body
    if (!offerId || !clickId) return res.status(400).json({ error: 'offerId and clickId required' })

    const timeBucket = Math.floor(Date.now() / 5000)
    const hashIp = (str?: string) => {
      if (!str) return 0
      let n = 0
      for (let i = 0; i < str.length; i++) n = ((n << 5) - n) + str.charCodeAt(i) | 0
      return Math.abs(n)
    }
    const userKey = (req as any).user?.id || hashIp(ip)

    // wrap in transaction so we can rely on DB uniqueness for the time bucket check
    const token = crypto.randomBytes(8).toString('hex')

    // ensure offer exists before attempting to create a nested relation
    const offerExists = await prisma.offer.findUnique({ where: { id: Number(offerId) } })
    if (!offerExists) return res.status(404).json({ error: 'offer not found' })

    const click = await prisma.$transaction(async (tx) => {
      // prefer scalar FK when available to avoid nested-connect issues in trimmed schemas
      // do not set adId to the offer id (may not correspond to an ad); leave null to avoid FK violations
      // include a connect for the relation to satisfy trimmed Prisma clients that expect nested connect
      return tx.click.create({ data: { adId: 0, userId: userKey, timeBucket, clickId, clickToken: token, ip, userAgent, offer: { connect: { id: Number(offerId) } } } })
    })

    res.json({ ok: true, click })
  } catch (err: any) {
    console.error('Track click error:', err)
    if (err.code === 'P2002') return res.status(409).json({ error: 'Duplicate click' })
    res.status(500).json({ error: 'Failed to record click' })
  }
})

router.post('/conversion', validate(conversionSchema, 'body'), async (req, res) => {
  try {
    let { offerId, clickId, clickToken, amount, status } = req.body

    // If clickToken provided, resolve it to clickId and offerId
    if (!offerId && clickToken) {
      const click = await prisma.click.findUnique({ where: { clickToken } })
      if (!click) return res.status(404).json({ error: 'click not found for token' })
      clickId = click.clickId
      offerId = click.offerId
    }

    if (!offerId) return res.status(400).json({ error: 'offerId required' })

    // ensure referenced offer exists to avoid FK failures
    const offerExists = await prisma.offer.findUnique({ where: { id: Number(offerId) } })
    if (!offerExists) return res.status(404).json({ error: 'offer not found' })

    const conv = await prisma.conversion.create({ data: { offerId: Number(offerId), clickId, amount, status } })
    res.json({ ok: true, conversion: conv })
  } catch (err) {
    console.error('Track conversion error:', err)
    res.status(500).json({ error: 'Failed to record conversion' })
  }
})

// Redirect endpoint: create a Click with a generated token and redirect to offer.trackingUrl
router.get('/redirect/:offerId', async (req, res) => {
  try {
    const offerId = Number(req.params.offerId)
    if (!offerId) return res.status(400).send('invalid offerId')

    const offer = await prisma.offer.findUnique({ where: { id: offerId } })
    if (!offer || !offer.trackingUrl) return res.status(404).send('offer not found or has no trackingUrl')

    const token = crypto.randomBytes(16).toString('hex')
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || undefined
    const userAgent = req.get('user-agent')

    // capture any external subid passed along; we won't forward it
    const externalSub = req.query.subid ? String(req.query.subid) : null

    const timeBucket = Math.floor(Date.now() / 5000)
    const hashIp = (str?: string) => {
      if (!str) return 0
      let n = 0
      for (let i = 0; i < str.length; i++) n = ((n << 5) - n) + str.charCodeAt(i) | 0
      return Math.abs(n)
    }
    const userKey = (req as any).user?.id || hashIp(Array.isArray(ip) ? ip[0] : ip)
    const click = await prisma.click.create({
      data: {
        adId: 0,
        userId: userKey,
        timeBucket,
        clickId: `c_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        clickToken: token,
        ip: Array.isArray(ip) ? ip[0] : ip,
        userAgent,
        offer: { connect: { id: offer.id } }
      }
    })

    let redirectUrl = offer.trackingUrl

    // Replace any click token placeholder first
    if (redirectUrl.includes('{click_token}')) {
      redirectUrl = redirectUrl.replace(/\{click_token\}/g, encodeURIComponent(token))
    }

    // Try to normalize and enforce platform affiliate params
    try {
      // Ensure absolute URL for parsing; if missing protocol, default to https
      const safeUrl = redirectUrl.match(/^https?:\/\//i) ? redirectUrl : `https://${redirectUrl}`
      const u = new URL(safeUrl)

      // Remove any externally-provided affiliate id and set our platform aff id
      const PLATFORM_AFF_ID = process.env.PLATFORM_AFF_ID || 'PLATFORM'
      u.searchParams.delete('aff_id')
      u.searchParams.set('aff_id', PLATFORM_AFF_ID)

      // sub_id = {userId}-{clickId}
      const subUserId = (click as any)?.user_id ?? (click as any)?.userId ?? 0
      const subClickId = String((click as any)?.clickId ?? '')
      if (subClickId) u.searchParams.set('sub_id', `${subUserId}-${subClickId}`)

      // ensure click_token param exists if template wasn't used
      if (!u.searchParams.has('click_token')) u.searchParams.set('click_token', token)

      // If we added https:// prefix earlier but original had no protocol, strip it back for redirect
      redirectUrl = u.toString()
      if (!redirectUrl.includes('://') && !offer.trackingUrl.includes('://')) redirectUrl = redirectUrl.replace(/^https?:\/\//, '')
    } catch (e) {
      // Fallback: append params manually
      const sep = redirectUrl.includes('?') ? '&' : '?'
      const PLATFORM_AFF_ID = process.env.PLATFORM_AFF_ID || 'PLATFORM'
      redirectUrl = `${redirectUrl}${sep}aff_id=${encodeURIComponent(PLATFORM_AFF_ID)}&sub_id=${encodeURIComponent(((click as any)?.user_id ?? (click as any)?.userId ?? 0) + '-' + ((click as any)?.clickId ?? ''))}&click_token=${encodeURIComponent(token)}`
    }

    res.redirect(302, redirectUrl)
  } catch (err) {
    console.error('Redirect error:', err)
    res.status(500).send('redirect failed')
  }
})

// New: marketplace item click redirect
    // Redirect by clickId: lookup click and redirect to associated offer.trackingUrl
    router.get('/:clickId', async (req, res) => {
      try {
        const clickId = req.params.clickId
        const click = await prisma.click.findUnique({ where: { clickId }, include: { offer: true } })
        if (!click || !click.offer || !click.offer.trackingUrl) return res.status(404).send('click or offer not found')

        const offer = click.offer
        let redirectUrl = offer.trackingUrl

        try {
          const u = new URL(redirectUrl.match(/^https?:\/\//i) ? redirectUrl : `https://${redirectUrl}`)
          u.searchParams.set('aff_id', process.env.PLATFORM_AFF_ID || 'PLATFORM')
          const subUserId = String(click.user_id || click.userId || 0)
          u.searchParams.set('sub_id', `${subUserId}-${click.clickId}`)
          if (!u.searchParams.has('click_token')) u.searchParams.set('click_token', click.clickToken)
          redirectUrl = u.toString()
        } catch (e) {
          const sep = redirectUrl.includes('?') ? '&' : '?'
          redirectUrl = `${redirectUrl}${sep}aff_id=${encodeURIComponent(process.env.PLATFORM_AFF_ID||'PLATFORM')}&sub_id=${encodeURIComponent((click.user_id||click.userId||0)+'-'+click.clickId)}&click_token=${encodeURIComponent(click.clickToken)}`
        }

        res.redirect(302, redirectUrl)
      } catch (e) {
        console.error('track by clickId error', e)
        res.status(500).send('error')
      }
    })
router.get('/click/:marketplaceItemId', async (req, res) => {
  try {
    const id = Number(req.params.marketplaceItemId)
    if (!id) return res.status(400).send('invalid id')
    const item = await prisma.marketplaceItem.findUnique({ where: { id }, include: { offer: true } })
    if (!item) return res.status(404).send('item not found')

    // find tracking URL
    const offer = item.offer
    if (!offer || !offer.trackingUrl) return res.status(404).send('no tracking URL')

    const token = crypto.randomBytes(16).toString('hex')
    const timeBucket = Math.floor(Date.now() / 5000)
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || undefined
    const userAgent = req.get('user-agent')
    const userKey = (req as any).user?.id || 0

    const externalSub = req.query.subid ? String(req.query.subid) : null
    let click: any
    try {
      click = await prisma.click.create({ data: { adId: 0, userId: userKey, timeBucket, clickId: `mi_${Date.now()}_${Math.floor(Math.random()*10000)}`, clickToken: token, ip: Array.isArray(ip) ? ip[0] : ip, userAgent, offer: { connect: { id: offer.id } } } })
    } catch (e: any) {
      // handle unique constraint collisions (userId, adId, timeBucket) by returning existing click
      if (e && e.code === 'P2002') {
        try {
          const existing = await prisma.click.findFirst({ where: { userId: userKey, adId: 0, timeBucket } })
          if (existing) {
            click = existing
          } else {
            throw e
          }
        } catch (inner) {
          throw inner
        }
      } else {
        throw e
      }
    }

    // Build redirect URL ensuring platform params. Prefer network-specific adapters
    let redirectUrl = offer.trackingUrl
    try {
      const adapterFactory = adapterRegistry[offer.network || '']
      if (adapterFactory) {
        try {
          const mod = await adapterFactory()
          if (mod && typeof mod.buildLink === 'function') {
            // pass seller user object (marketplace owner)
            redirectUrl = await mod.buildLink(offer, { id: item.userId })
          }
        } catch (e) {
          console.error('adapter buildLink error for', offer.network, e)
        }
      } else if (offer.network === 'digistore24') {
        // existing Digistore special-case preserved
        try {
          const network = await prisma.affiliateNetwork.findFirst({ where: { name: 'digistore24' } })
          if (network) {
            try { console.debug('[digistore] network.id', network.id, 'item.userId', item.userId) } catch (e) {}
            let cred = await prisma.userNetworkCredential.findFirst({ where: { userId: item.userId, networkId: network.id } })
            if (!cred) {
              try { cred = await prisma.userNetworkCredential.findFirst({ where: { userId: item.userId } }) } catch (e) { /* ignore */ }
            }
            const metaOffer: any = { ...offer }
            metaOffer.externalId = offer.externalOfferId || offer.externalId || offer.product_id || offer.productId || null
            let affiliateName = process.env.PLATFORM_AFF_ID || 'PLAT'
            try {
              if (cred && cred.extraConfig) {
                let parsed: any = cred.extraConfig
                if (typeof cred.extraConfig === 'string') {
                  try { parsed = JSON.parse(cred.extraConfig) } catch (e) { parsed = cred.extraConfig }
                }
                metaOffer.extra = parsed
                if (parsed && parsed.affiliateUsername) affiliateName = parsed.affiliateUsername
              }
            } catch (e) { /* ignore */ }
            const prod = metaOffer.externalId || process.env.DIGISTORE_PRODUCT_ID || ''
            const sub = `${item.userId}-${click.clickId}`
            try {
              console.debug('[digistore] cred:', cred ? (cred.extraConfig || cred) : null, 'metaOffer.externalId:', prod, 'affiliateName:', affiliateName)
            } catch (e) { /* ignore logging failures */ }
            redirectUrl = `https://www.digistore24.com/redir/${encodeURIComponent(prod)}/${encodeURIComponent(affiliateName)}/?subid=${encodeURIComponent(sub)}&click_token=${encodeURIComponent(click.clickId)}`
          }
        } catch (e) {
          console.error('digistore redirect build error', e)
        }
      } else {
        const u = new URL(redirectUrl.match(/^https?:\/\//i) ? redirectUrl : `https://${redirectUrl}`)
        u.searchParams.set('aff_id', process.env.PLATFORM_AFF_ID || 'PLATFORM')
        u.searchParams.set('sub_id', `${item.userId}-${click.clickId}`)
        if (!u.searchParams.has('click_token')) u.searchParams.set('click_token', token)
        redirectUrl = u.toString()
      }
    } catch (e) {
      const sep = redirectUrl.includes('?') ? '&' : '?'
      redirectUrl = `${redirectUrl}${sep}aff_id=${encodeURIComponent(process.env.PLATFORM_AFF_ID||'PLATFORM')}&sub_id=${encodeURIComponent(item.userId+'-'+click.clickId)}&click_token=${encodeURIComponent(token)}`
    }

    res.redirect(302, redirectUrl)
  } catch (e) {
    console.error('marketplace click error', e)
    res.status(500).send('error')
  }
})

export default router

