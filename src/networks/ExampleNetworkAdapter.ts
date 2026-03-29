import fetch from 'node-fetch'
import { NetworkAdapter } from './BaseNetworkAdapter'

export class ExampleNetworkAdapter implements NetworkAdapter {
  private apiKey: string | undefined
  private platformAffId: string | undefined

  constructor(private baseApiUrl: string) {
    this.apiKey = process.env.EXAMPLE_API_KEY
    this.platformAffId = process.env.EXAMPLE_PLATFORM_AFF_ID || process.env.PLATFORM_AFF_ID
  }

  async fetchOffers(credentials: any) {
    try {
      const headers: any = { 'Accept': 'application/json' }
      const key = credentials?.apiKey || this.apiKey
      if (key) headers['Authorization'] = `Bearer ${key}`

      const res = await fetch(this.baseApiUrl.replace(/\/$/, '') + '/offers', { headers })
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []

      return data.map((o: any) => ({
        externalId: o.id || o.offer_id || o.external_id,
        name: o.title || o.name,
        description: o.description || o.desc,
        trackingUrl: o.tracking_url || o.trackingUrl || o.pixels?.redirect || o.url,
        payout: o.payout || o.payout_amount || o.price || o.commission
      }))
    } catch (e: any) {
      console.error('ExampleNetworkAdapter.fetchOffers error', e.message || e)
      return []
    }
  }

  buildTrackingLink(offer: any, userId: number, clickId: string) {
    let url = offer.trackingUrl || offer.url || ''
    if (!url) return ''
    try {
      const u = new URL(url.match(/^https?:\/\//i) ? url : `https://${url}`)
      // prefer adapter platform aff id if present
      if (this.platformAffId) u.searchParams.set('aff_id', this.platformAffId)
      else u.searchParams.set('aff_id', process.env.PLATFORM_AFF_ID || 'PLATFORM')
      u.searchParams.set('sub_id', `${userId}-${clickId}`)
      if (!u.searchParams.has('click_token')) u.searchParams.set('click_token', clickId)
      return u.toString()
    } catch (e) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}aff_id=${encodeURIComponent(this.platformAffId||process.env.PLATFORM_AFF_ID||'PLATFORM')}&sub_id=${encodeURIComponent(userId+'-'+clickId)}&click_token=${encodeURIComponent(clickId)}`
    }
  }

  // parse a network-specific postback into { externalOfferId, clickToken, revenue }
  parsePostback(req: any) {
    // Example network sends: ?offer_id=123&token=abc&revenue=1.23
    const params = req.query || req.body || {}
    return {
      externalOfferId: params.offer_id || params.offer || params.offerId,
      clickToken: params.token || params.click_token || params.clickToken,
      revenue: params.revenue ? Number(params.revenue) : (params.amount ? Number(params.amount) : undefined),
      raw: params
    }
  }
}

export default ExampleNetworkAdapter
