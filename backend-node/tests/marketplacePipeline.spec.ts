import request from 'supertest'
import app from '../src/index'
import { vi, describe, it, beforeAll, afterAll, expect } from 'vitest'
import prisma from '../src/prisma'

// Mock GenericNetworkAdapter to return deterministic offers
vi.mock('../src/networks/GenericNetworkAdapter', () => ({
  default: class {
    base: any
    constructor(baseApiUrl: string) { this.base = baseApiUrl }
    async fetchOffers() {
      return [ { id: 'ext1', name: 'Imported Offer', url: 'https://example.com/track?o=1', payout: 1.5, trackingUrl: 'https://example.com/track?o=1&{click_token}' } ]
    }
  }
}))

let server: any
let token: string

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret'
  process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret'

  await prisma.$connect()
  server = app.listen(0)
})

afterAll(async () => {
  server && server.close()
  await prisma.$disconnect()
})

describe('Marketplace pipeline', () => {
  it('imports offers for user via service', async () => {
    const user = await prisma.user.create({ data: { name: 'Bob', email: `bob+${Date.now()}@example.com`, password: 'x' } })
    const net = await prisma.affiliateNetwork.create({ data: { name: 'net1', baseApiUrl: 'https://net1.example' } })
    await prisma.userNetworkCredential.create({ data: { userId: user.id, networkId: net.id } })

    const { importOffersForUser } = await import('../src/services/offerImport.service')
    const res = await importOffersForUser(user.id, net.id)
    expect(res.imported).toBeGreaterThan(0)

    const offer = await prisma.offer.findFirst({ where: { externalOfferId: 'ext1' } })
    expect(offer).toBeTruthy()
  })

  it('creates marketplace item via API for eligible user', async () => {
    // create user with active subscription
    const user = await prisma.user.create({ data: { name: 'Carol', email: `carol+${Date.now()}@example.com`, password: 'x' } })
    const plan = await prisma.plan.create({ data: { name: 'p', price: 0, monthlyTokens: 10 } })
    await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } })

    // create an offer to import
    const offer = await prisma.offer.create({ data: { title: 'offerX', name: 'offerX', slug: 'offerX', url: 'https://x', externalOfferId: `eo-${Date.now()}`, trackingUrl: 'https://track.example/clk' } })

    const { generateToken } = await import('../src/utils/jwt')
    token = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name })

    const res = await request(server)
      .post('/api/marketplace/import-offer')
      .set('Authorization', `Bearer ${token}`)
      .send({ networkOfferId: offer.id })

    expect(res.status).toBe(201)
    expect(res.body.marketplaceItem).toBeTruthy()
  })

  it('creates campaign and deducts tokens', async () => {
    const user = await prisma.user.create({ data: { name: 'Dave', email: `dave+${Date.now()}@example.com`, password: 'x' } })
    const offer = await prisma.offer.create({ data: { title: 'offerY', name: 'offerY', slug: 'offerY', url: 'https://y', externalOfferId: `eo2-${Date.now()}`, trackingUrl: 'https://trk.example/offer' } })
    const item = await prisma.marketplaceItem.create({ data: { userId: user.id, offerId: offer.id } })
    await prisma.adTokenWallet.create({ data: { userId: user.id, balance: 100 } })

    const { generateToken } = await import('../src/utils/jwt')
    const t = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name })

    const res = await request(server)
      .post('/api/campaigns/marketplace')
      .set('Authorization', `Bearer ${t}`)
      .send({ marketplaceItemId: item.id, budgetTokens: 50 })

    expect(res.status).toBe(201)
    const updated = await prisma.adTokenWallet.findUnique({ where: { userId: user.id } })
    expect(Number(updated!.balance)).toBe(50)
  })

  it('click redirect includes aff_id, sub_id and click_token', async () => {
    const user = await prisma.user.create({ data: { name: 'Eve', email: `eve+${Date.now()}@example.com`, password: 'x' } })
    const offer = await prisma.offer.create({ data: { title: 'offerZ', name: 'offerZ', slug: 'offerZ', url: 'https://z', externalOfferId: `eo3-${Date.now()}`, trackingUrl: 'https://redir.example/offer' } })
    const item = await prisma.marketplaceItem.create({ data: { userId: user.id, offerId: offer.id } })

    const { generateToken } = await import('../src/utils/jwt')
    const t = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name })

    const res = await request(server)
      .get(`/api/track/click/${item.id}`)
      .set('Authorization', `Bearer ${t}`)
      .redirects(0)

    expect([301,302]).toContain(res.status)
    const loc = res.headers.location as string
    expect(loc).toContain('aff_id=')
    expect(loc).toMatch(/sub_id=.*-/)
    expect(loc).toContain('click_token=')
  })
})
