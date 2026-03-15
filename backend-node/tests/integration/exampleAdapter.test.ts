import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import ExampleNetworkAdapter from '../../src/networks/ExampleNetworkAdapter'

// mock node-fetch at module level with a customizable implementation
let mockData: any = null
vi.mock('node-fetch', () => ({
  default: (url: any, opts: any) => Promise.resolve({ ok: true, json: async () => mockData })
}))

describe('ExampleNetworkAdapter', () => {
  beforeAll(() => {
    process.env.EXAMPLE_API_KEY = 'example_key'
    process.env.EXAMPLE_PLATFORM_AFF_ID = 'EXPLATFORM'
  })

  it('normalizes offers from external API', async () => {
    mockData = [ { id: 'a1', title: 'T1', tracking_url: 'https://a/track' } ]

    const adapter = new ExampleNetworkAdapter('https://api.example')
    const offers = await adapter.fetchOffers({})
    expect(Array.isArray(offers)).toBe(true)
    expect(offers[0].externalId).toBe('a1')
  })

  it('builds redirect URL with platform aff and sub_id and click_token', () => {
    const adapter = new ExampleNetworkAdapter('https://api.example')
    const url = adapter.buildTrackingLink({ trackingUrl: 'https://redir.example/offer' }, 5, 'clk123')
    expect(url).toContain('aff_id=EXPLATFORM')
    expect(url).toContain('sub_id=5-clk123')
    expect(url).toContain('click_token=clk123')
  })

  it('parses postback params to internal mapping', () => {
    const adapter = new ExampleNetworkAdapter('https://api.example')
    const parsed = adapter.parsePostback({ query: { offer_id: 'a1', token: 'tok', revenue: '2.5' } })
    expect(parsed.externalOfferId).toBe('a1')
    expect(parsed.clickToken).toBe('tok')
    expect(parsed.revenue).toBe(2.5)
  })
})
