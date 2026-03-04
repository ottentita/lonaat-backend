import fetch from 'node-fetch'
import { NetworkAdapter } from './BaseNetworkAdapter'

export default class Digistore24Adapter implements NetworkAdapter {
  private ipnSecret: string | undefined

  constructor(private baseApiUrl: string) {
    this.ipnSecret = process.env.DIGISTORE_IPN_SECRET
  }

  // fetch product list from Digistore-like API (normalized to our offer format)
  async fetchOffers(credentials: any) {
    try {
      const headers: any = { 'Accept': 'application/json' }
      // digistore uses API key in credentials.apiKey or apiKeyEncrypted
      const key = credentials?.apiKey || credentials?.apiKeyEncrypted || process.env.DIGISTORE_API_KEY
      if (key) headers['Authorization'] = `Bearer ${key}`

      const res = await fetch(this.baseApiUrl.replace(/\/$/, '') + '/products', { headers })
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      return data.map((p: any) => ({
        externalId: p.product_id || p.id || p.productId,
        name: p.name || p.title,
        description: p.description,
        // provide a template tracking url - adapter.buildTrackingLink will inject affiliate
        trackingUrl: `https://www.digistore24.com/redir/${p.product_id || p.id || ''}/`,
        payout: p.payout || p.price || p.commission
      }))
    } catch (e: any) {
      console.error('Digistore24Adapter.fetchOffers error', e.message || e)
      return []
    }
  }

  // build tracking URL for digistore: https://www.digistore24.com/redir/{PRODUCT_ID}/{AFFILIATE_NAME}/?subid={sub}
  buildTrackingLink(offer: any, userId: number, clickId: string) {
    const prodMatch = (offer.externalId || offer.product_id || offer.productId || '').toString()
    // affiliate username should be provided in offer.adapterMeta or credentials.extraConfig; fallback to env PLATFORM_AFF_ID
    let affiliateName = process.env.PLATFORM_AFF_ID || 'platform'
    try {
      if (offer.adapterMeta && offer.adapterMeta.affiliateUsername) affiliateName = offer.adapterMeta.affiliateUsername
      else if (offer.extra && typeof offer.extra === 'object' && offer.extra.affiliateUsername) affiliateName = offer.extra.affiliateUsername
    } catch (e) { /* ignore */ }

    const sub = `${userId}-${clickId}`
    const url = `https://www.digistore24.com/redir/${encodeURIComponent(prodMatch)}/${encodeURIComponent(affiliateName)}/?subid=${encodeURIComponent(sub)}`
    // append click_token as fallback
    return `${url}&click_token=${encodeURIComponent(clickId)}`
  }

  // parse IPN/form postback from Digistore24
  // accepts either a params object (req.body) or raw string
  parsePostback(reqOrParams: any) {
    const params = reqOrParams && reqOrParams.body ? reqOrParams.body : (reqOrParams || {})
    const txId = params.transaction_id || params.txn_id || params.transactionId
    const productId = params.product_id || params.productId
    const affiliate = params.affiliate || params.seller || params.aff
    const amount = params.amount ? Number(params.amount) : (params.gross ? Number(params.gross) : undefined)
    const currency = params.currency || params.curr
    const subid = params.subid || params.sub_id || params.sub

    let userId: number | null = null
    let clickId: string | null = null
    if (subid) {
      const parts = String(subid).split('-')
      userId = Number(parts[0]) || null
      clickId = parts.slice(1).join('-') || null
    }

    return {
      transactionId: txId,
      productId,
      affiliate,
      amount,
      currency,
      subid,
      userId,
      clickId,
      raw: params
    }
  }
}
