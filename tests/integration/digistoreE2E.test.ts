import request from 'supertest'
import app from '../../src/index'
import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import prisma from '../../src/prisma'
import crypto from 'crypto'

let mockProducts: any = []
vi.mock('node-fetch', () => ({
  default: (url: any, opts: any) => Promise.resolve({ ok: true, json: async () => mockProducts })
}))

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret'
  process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret'
  process.env.DIGISTORE_IPN_SECRET = process.env.DIGISTORE_IPN_SECRET || 'digisecret'
  process.env.PLATFORM_AFF_ID = process.env.PLATFORM_AFF_ID || 'PLAT'
  // new envs used by legacy /track route
  process.env.DIGISTORE_PRODUCT_ID = process.env.DIGISTORE_PRODUCT_ID || 'prod-env'
  process.env.DIGISTORE_AFFILIATE_ID = process.env.DIGISTORE_AFFILIATE_ID || 'aff-env'
  process.env.DIGISTORE_WEBHOOK_SECRET = process.env.DIGISTORE_WEBHOOK_SECRET || 'webhook_secret'
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Digistore24 integration', () => {
  it('imports offer, creates campaign, tracks click and processes IPN', async () => {
    // create user and network
    const user = await prisma.user.create({ data: { name: 'DigiSeller', email: `digi+${Date.now()}@example.com`, password: 'x' } })
    const network = await prisma.affiliateNetwork.create({ data: { name: 'digistore24', baseApiUrl: 'https://api.digistore24.test' } })

    // store affiliate username in extraConfig for seller
    const affiliateUsername = 'seller_digi'
    await prisma.userNetworkCredential.create({ data: { userId: user.id, networkId: network.id, extraConfig: JSON.stringify({ affiliateUsername }) } })

    // mock products returned by Digistore API
    mockProducts = [ { product_id: 'prod-1', name: 'Digi Prod 1', description: 'desc', payout: 10 } ]

    const { importOffersForUser } = await import('../../src/services/offerImport.service')
    const resImport = await importOffersForUser(user.id, network.id)
    expect(resImport.imported).toBeGreaterThan(0)

    const offer = await prisma.offer.findFirst({ where: { externalOfferId: 'prod-1' } })
    expect(offer).toBeTruthy()
    // after our change, trackingUrl should be the placeholder value rather than a full URL
    expect(offer!.trackingUrl).toBe('digistore24')

    // marketplace import (needs subscription or tokens)
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

    // add wallet and create campaign
    await prisma.adTokenWallet.create({ data: { userId: user.id, balance: 100 } })
    const campRes = await request(app)
      .post('/api/campaigns/marketplace')
      .set('Authorization', `Bearer ${token}`)
      .send({ marketplaceItemId: item!.id, budgetTokens: 50 })
    expect(campRes.status).toBe(201)

    // simulate click via marketplace click endpoint (redirect)
    const clickRes = await request(app)
      .get(`/api/track/click/${item!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .redirects(0)

    expect([301,302]).toContain(clickRes.status)
    const loc = clickRes.headers.location as string
    expect(loc).toContain('/redir/')
    expect(loc).toContain(affiliateUsername)
    expect(loc).toContain('subid=')

    // extract subid = userId-clickId
    const urlObj = new URL(loc)
    const sub = urlObj.searchParams.get('subid') || urlObj.searchParams.get('sub_id') || urlObj.searchParams.get('sub')
    expect(sub).toBeTruthy()
    const clickId = String(sub).split('-').slice(1).join('-')

    const clickRec = await prisma.click.findUnique({ where: { clickId } })
    expect(clickRec).toBeTruthy()
    // attribute click to marketplace item owner (seller)
    await prisma.click.update({ where: { clickId }, data: { user_id: item!.userId, userId: item!.userId } })

    // simulate IPN postback (HMAC over raw body using DIGISTORE_IPN_SECRET)
    const payloadObj = { transaction_id: 'tx123', product_id: offer!.externalOfferId, affiliate: affiliateUsername, amount: 100, currency: 'USD', subid: `${item!.userId}-${clickId}` }
    const payload = JSON.stringify(payloadObj)
    const sig = crypto.createHmac('sha256', String(process.env.DIGISTORE_IPN_SECRET)).update(payload).digest('hex')

    const wbRes = await request(app)
      .post(`/api/webhooks/network/${network.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig}`)
      .send(payload)

    expect(wbRes.status).toBe(200)

    const conv = await prisma.conversion.findFirst({ where: { clickToken: clickRec!.clickToken } })
    expect(conv).toBeTruthy()

    const plat = await prisma.platformRevenue.findFirst({ where: { conversionId: conv!.id } })
    expect(plat).toBeTruthy()

    const ledger = await prisma.transactionLedger.findFirst({ where: { userId: user.id } })
    expect(ledger).toBeTruthy()

    const comm = await prisma.commission.findFirst({ where: { user_id: user.id } })
    expect(comm).toBeTruthy()

  }, 40000)

  it('legacy /track endpoint should build URL from ENV and preserve external subid', async () => {
    // create a standalone offer; trackingUrl is just the magic string
    const offer = await prisma.offer.create({
      data: {
        title: 'Env Digi Offer',
        slug: 'digi-test',
        network: 'digistore24',
        trackingUrl: 'digistore24',
        isActive: true,
      }
    })

    const external = 'abc123'
    const res = await request(app)
      .get(`/track?network=digistore24&offer=digi-test&subid=${external}`)
      .redirects(0)

    expect(res.status).toBe(302)
    const loc = res.headers.location as string
    // URL built from env variables, not the external subid
    expect(loc).toContain(`/redir/${process.env.DIGISTORE_PRODUCT_ID}/${process.env.DIGISTORE_AFFILIATE_ID}/`)

    // parse returned subid – should be internal click id from DB
    const urlObj = new URL(loc)
    const forwardedSub = urlObj.searchParams.get('subid')
    expect(forwardedSub).toBeTruthy()
    expect(forwardedSub).not.toBe(external)

    // click record created with externalSubId saved
    const clickRec = await prisma.click.findFirst({ where: { offerId: offer.id } })
    expect(clickRec).toBeTruthy()
    expect(clickRec!.externalSubId).toBe(external)

    // stats endpoint should increment at least once
    const stats = await request(app).get('/stats')
    expect(stats.status).toBe(200)
    expect(stats.body.totalClicks).toBeGreaterThanOrEqual(1)
  })

  it('digistore conversion webhook should mark click converted', async () => {
    // create a click record manually
    const click = await prisma.click.create({ data: {
      network: 'digistore24', offerId: 0, adId: 0, userId: 0,
      timeBucket: 0, clickId: 'testconvert', clickToken: 'tok', ip: '1.1.1.1',
      userAgent: 'ua', externalSubId: null
    } });

    const secret = process.env.DIGISTORE_WEBHOOK_SECRET || 'webhook_secret';
    const payload = { subid: String(click.id), amount: '47.00', secret };

    const wbRes = await request(app)
      .post('/webhook/digistore')
      .send(payload);
    expect(wbRes.status).toBe(200);
    expect(wbRes.body).toEqual({
      status: 'conversion-recorded',
      clickId: click.id,
      revenue: 47
    });

    // invalid secret should be rejected
    const wbBad = await request(app)
      .post('/webhook/digistore')
      .send({ subid: String(click.id), amount: '1.00', secret: 'wrong' });
    expect(wbBad.status).toBe(401);

    const updated = await prisma.click.findUnique({ where: { id: click.id } });
    expect(updated).toBeTruthy();
    expect(updated!.converted).toBe(true);
    expect(updated!.revenue).toBeCloseTo(47.00);

    // stats should reflect the revenue and new metrics
    const statsRes = await request(app).get('/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.totalRevenue).toBeGreaterThanOrEqual(47.00);
    expect(statsRes.body.conversions).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.epc).toBeDefined();
    expect(statsRes.body.conversionRate).toBeDefined();
  });
})
