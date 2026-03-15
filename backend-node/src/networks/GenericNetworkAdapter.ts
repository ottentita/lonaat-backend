import fetch from 'node-fetch'
import { NetworkAdapter } from './BaseNetworkAdapter'

export default class GenericNetworkAdapter implements NetworkAdapter {
  constructor(private baseApiUrl: string) {}

  async fetchOffers(credentials: any) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const headers: any = {}
      if (credentials && credentials.apiKey) headers['Authorization'] = `Bearer ${credentials.apiKey}`
      const res = await fetch(this.baseApiUrl + '/offers', { headers, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      // basic normalization (map keys commonly used)
      return data.map((d: any) => ({
        externalId: d.externalId || d.id || d.offer_id,
        name: d.name || d.title,
        description: d.description || d.desc,
        trackingUrl: d.trackingUrl || d.tracking_url || d.tracking || d.url,
        payout: d.payout || d.payoutAmount || d.commission
      }))
    } catch (e: any) {
      if (e.name === 'AbortError') return []
      console.error('Network adapter fetchOffers error:', e.message || e)
      return []
    }
  }

  buildTrackingLink(offer: any, userId: number, clickId: string) {
    let url = offer.trackingUrl || offer.tracking_url || offer.url || ''
    if (!url) return ''
    try {
      const u = new URL(url)
      u.searchParams.set('aff_id', process.env.PLATFORM_AFF_ID || 'PLATFORM')
      u.searchParams.set('sub_id', `${userId}-${clickId}`)
      if (!u.searchParams.has('click_token')) u.searchParams.set('click_token', clickId)
      return u.toString()
    } catch (e) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}aff_id=${encodeURIComponent(process.env.PLATFORM_AFF_ID||'PLATFORM')}&sub_id=${encodeURIComponent(userId+'-'+clickId)}&click_token=${encodeURIComponent(clickId)}`
    }
  }
}
