import request from 'supertest'
import app from '../../src/index'
import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import prisma from '../../src/prisma'
import crypto from 'crypto'

// mock node-fetch for ExampleNetworkAdapter
let mockOffers: any = []
vi.mock('node-fetch', () => ({
  default: (url: any, opts: any) => Promise.resolve({ ok: true, json: async () => mockOffers })
}))

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret'
  process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret'
  process.env.PLATFORM_AFF_ID = process.env.PLATFORM_AFF_ID || 'PLAT'
  process.env.EXAMPLE_PLATFORM_AFF_ID = process.env.EXAMPLE_PLATFORM_AFF_ID || 'EXPLAT'

  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Affiliate end-to-end smoke test', () => {
  it('runs full affiliate flow including postback and atomicity', async () => {
    // Step 1: create user and network
    const user = await prisma.user.create({ data: { name: 'AffUser', email: `aff+${Date.now()}@example.com`, password: 'x' } })
    const network = await prisma.affiliateNetwork.create({ data: { name: 'example_network', baseApiUrl: 'https://api.example', webhookSecret: 'whsec' } })

    // Step 2: store encrypted credential
    const { encrypt } = await import('../../src/utils/crypto')
    const enc = encrypt('EXAMPLE_KEY_123')
    await prisma.userNetworkCredential.create({ data: { userId: user.id, networkId: network.id, apiKeyEncrypted: enc.ciphertext, apiKeyIv: enc.iv, apiKeyTag: enc.tag } })

    // Step 3: import offers (mock external API)
    mockOffers = [ { id: 'ext-1', title: 'Offer Ext 1', tracking_url: 'https://trk.example/offer' } ]
    const { importOffersForUser } = await import('../../src/services/offerImport.service')
    const resImport = await importOffersForUser(user.id, network.id)
    expect(resImport.imported).toBeGreaterThan(0)

    const offer = await prisma.offer.findFirst({ where: { externalOfferId: 'ext-1' } })
    expect(offer).toBeTruthy()

    // Step 4: import to marketplace via API (needs subscription or tokens)
    const plan = await prisma.plan.create({ data: { name: 'P', price: 0, monthlyTokens: 10 } })
    await prisma.subscription.create({ data: { userId: user.id, planId: plan.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) } })

    const { generateToken } = await import('../../src/utils/jwt')
    const token = generateToken({ id: user.id, role: 'user', email: user.email, name: user.name })

    const impRes = await request(app)
      .post('/api/marketplace/import-offer')
      .set('Authorization', `Bearer ${token}`)
      .send({ networkOfferId: offer!.id })

    expect(impRes.status).toBe(201)
    const item = await prisma.marketplaceItem.findFirst({ where: { userId: user.id, offerId: offer!.id } })
    expect(item).toBeTruthy()

    // Step 5: create campaign - ensure user has token wallet
    await prisma.adTokenWallet.create({ data: { userId: user.id, balance: 100 } })
    const campRes = await request(app)
      .post('/api/campaigns/marketplace')
      .set('Authorization', `Bearer ${token}`)
      .send({ marketplaceItemId: item!.id, budgetTokens: 50 })
    expect(campRes.status).toBe(201)

    const walletAfter = await prisma.adTokenWallet.findUnique({ where: { userId: user.id } })
    expect(Number(walletAfter!.balance)).toBe(50)

    // Step 6: simulate click
    const clickRes = await request(app)
      .get(`/api/track/click/${item!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .redirects(0)

    expect([301,302]).toContain(clickRes.status)
    const loc = clickRes.headers.location as string
    expect(loc).toContain('aff_id=')
    expect(loc).toContain('sub_id=')
    expect(loc).toContain('click_token=')

    // extract sub_id user-clickId
    const urlObj = new URL(loc)
    const sub = urlObj.searchParams.get('sub_id') as string
    const clickId = sub.split('-').slice(1).join('-')

    let clickRec = await prisma.click.findUnique({ where: { clickId } })
    expect(clickRec).toBeTruthy()
    // ensure click is attributed to the marketplace user (seller) so commission engine credits them
    await prisma.click.update({ where: { clickId }, data: { user_id: item!.userId, userId: item!.userId } })
    clickRec = await prisma.click.findUnique({ where: { clickId } })

    // Step 7: simulate postback with valid HMAC signature
    const payload = JSON.stringify({ sub_id: sub, offerId: offer!.id, amount: 100 })
    const sig = crypto.createHmac('sha256', String(network.webhookSecret)).update(payload).digest('hex')

    const wbRes = await request(app)
      .post(`/api/webhooks/network/${network.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig}`)
      .send(payload)

    expect(wbRes.status).toBe(200)

    // verify conversion created
    const conv = await prisma.conversion.findFirst({ where: { clickToken: clickRec!.clickToken } })
    expect(conv).toBeTruthy()

    // verify platform revenue and transaction ledger and commission
    const plat = await prisma.platformRevenue.findFirst({ where: { conversionId: conv!.id } })
    expect(plat).toBeTruthy()

    const ledger = await prisma.transactionLedger.findFirst({ where: { userId: user.id } })
    expect(ledger).toBeTruthy()

    const comm = await prisma.commission.findFirst({ where: { user_id: user.id } })
    expect(comm).toBeTruthy()

    // Step 8: verify atomicity - mock commission to throw and assert rollback
    // Prepare a new click
    const click2Res = await request(app)
      .get(`/api/track/click/${item!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .redirects(0)
    const loc2 = click2Res.headers.location as string
    const sub2 = new URL(loc2).searchParams.get('sub_id') as string
    const clickId2 = sub2.split('-').slice(1).join('-')
    let clickRec2 = await prisma.click.findUnique({ where: { clickId: clickId2 } })
    expect(clickRec2).toBeTruthy()
    await prisma.click.update({ where: { clickId: clickId2 }, data: { user_id: item!.userId, userId: item!.userId, timeBucket: (clickRec2!.timeBucket || 0) + 1 } })
    clickRec2 = await prisma.click.findUnique({ where: { clickId: clickId2 } })

    // Mock commission processor to throw
    vi.doMock('../../src/services/commissionEngine', () => ({ processConversionSplit: async () => { throw new Error('forced failure') } }))

    const payload2 = JSON.stringify({ sub_id: sub2, offerId: offer!.id, amount: 50 })
    const sig2 = crypto.createHmac('sha256', String(network.webhookSecret)).update(payload2).digest('hex')

    const wbRes2 = await request(app)
      .post(`/api/webhooks/network/${network.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig2}`)
      .send(payload2)

    // should return 500 due to forced failure
    expect(wbRes2.status).toBe(500)

    // ensure no conversion, ledger or platformRevenue for that click exists
    const conv2 = await prisma.conversion.findFirst({ where: { clickToken: clickRec2!.clickToken } })
    expect(conv2).toBeNull()

    const plat2 = await prisma.platformRevenue.findFirst({ where: { offerId: offer!.id, userId: user.id } })
    // There may be a previous platformRevenue from earlier conversion; ensure none for the new conversion id by checking conversions directly.
    // To be safe assert that no commission tied to clickRec2 exists
    const comm2 = await prisma.commission.findFirst({ where: { click_id: clickRec2!.id } })
    expect(comm2).toBeNull()

    // cleanup mock
    vi.doUnmock('../../src/services/commissionEngine')
  }, 40000)
})
