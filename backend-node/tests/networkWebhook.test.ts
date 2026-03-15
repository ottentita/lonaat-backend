import request from 'supertest'
import app from '../src/index'
import { vi, describe, it, beforeAll, afterAll, expect } from 'vitest'
import prisma from '../src/prisma'
import crypto from 'crypto'

// mock commission engine so we can assert it's not called on invalid signatures
vi.mock('../src/services/commissionEngine', () => ({
  processConversionSplit: vi.fn()
}))

let processConversionSplit: any

let server: any

beforeAll(async () => {
  // ensure test env secret is present
  process.env.NETWORK_CREDENTIAL_SECRET = process.env.NETWORK_CREDENTIAL_SECRET || 'test_secret'

  await prisma.$connect()
  server = app.listen(0)

  // import the (mocked) commission engine after mocking so the mock is returned
  const mod = await import('../src/services/commissionEngine')
  processConversionSplit = mod.processConversionSplit
})

afterAll(async () => {
  server && server.close()
  await prisma.$disconnect()
})

describe('Network webhook signature verification', () => {
  it('returns 401 when missing signature', async () => {
    const net = await prisma.affiliateNetwork.create({ data: { name: 'test-net', baseApiUrl: 'https://example.com' } })
    const payload = JSON.stringify({ sub_id: '1-abc', offerId: 1 })

    const res = await request(server)
      .post(`/api/webhooks/network/${net.id}`)
      .set('Content-Type', 'application/json')
      .send(payload)

    expect(res.status).toBe(401)
    expect(processConversionSplit).not.toHaveBeenCalled()
  })

  it('returns 401 when signature invalid', async () => {
    const net = await prisma.affiliateNetwork.create({ data: { name: 'test-net2', baseApiUrl: 'https://example.com', webhookSecret: 'secret1' } })
    const payload = JSON.stringify({ sub_id: '1-abc', offerId: 1 })
    const badSig = crypto.createHmac('sha256', 'wrong').update(payload).digest('hex')

    const res = await request(server)
      .post(`/api/webhooks/network/${net.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${badSig}`)
      .send(payload)

    expect(res.status).toBe(401)
    expect(processConversionSplit).not.toHaveBeenCalled()
  })

  it('returns 200 when signature valid and calls commission engine', async () => {
    const net = await prisma.affiliateNetwork.create({ data: { name: 'test-net3', baseApiUrl: 'https://example.com', webhookSecret: 'secret2' } })
    // create an offer and a click so webhook can create conversion
    const user = await prisma.user.create({ data: { name: 'Alice', email: `alice+${Date.now()}@example.com`, password: 'x' } })
    const offer = await prisma.offer.create({ data: { title: 'o', name: 'o', slug: `o-${Date.now()}`, url: 'https://x', externalOfferId: 'e1' } })
    const click = await prisma.click.create({ data: { offerId: offer.id, adId: 1, userId: user.id, timeBucket: 1, clickId: 'clk1', clickToken: 'tok1' } })

    const payload = JSON.stringify({ sub_id: `${user.id}-${click.clickId}`, offerId: offer.id })
    const sig = crypto.createHmac('sha256', 'secret2').update(payload).digest('hex')

    const res = await request(server)
      .post(`/api/webhooks/network/${net.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig}`)
      .send(payload)

    expect(res.status).toBe(200)
    expect(processConversionSplit).toHaveBeenCalled()
    // event should be logged for idempotency when model exists
    if ((prisma as any).affiliateEvent) {
      const events = await (prisma as any).affiliateEvent.findMany({ where: { network: 'test-net3' } })
      expect(events.length).toBeGreaterThan(0)
    }
  })

  it('ignores duplicate events and does not create second conversion', async () => {
    const net = await prisma.affiliateNetwork.create({ data: { name: 'dup-net', baseApiUrl: 'https://example.com', webhookSecret: 'secret3' } })
    const user = await prisma.user.create({ data: { name: 'Bob', email: `bob+${Date.now()}@example.com`, password: 'x' } })
    const offer = await prisma.offer.create({ data: { title: 'o', name: 'o', slug: `o2-${Date.now()}`, url: 'https://x', externalOfferId: 'e2' } })
    const click = await prisma.click.create({ data: { offerId: offer.id, adId: 1, userId: user.id, timeBucket: 1, clickId: 'clk2', clickToken: 'tok2' } })

    const payload = JSON.stringify({ sub_id: `${user.id}-${click.clickId}`, offerId: offer.id })
    const sig = crypto.createHmac('sha256', 'secret3').update(payload).digest('hex')

    // first call
    const first = await request(server)
      .post(`/api/webhooks/network/${net.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig}`)
      .send(payload)
    expect(first.status).toBe(200)

    const countAfterFirst = await prisma.conversion.count({ where: { offerId: offer.id } })

    // second call with same payload
    const second = await request(server)
      .post(`/api/webhooks/network/${net.id}`)
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig}`)
      .send(payload)
    expect(second.status).toBe(200)

    const countAfterSecond = await prisma.conversion.count({ where: { offerId: offer.id } })
    expect(countAfterSecond).toBe(countAfterFirst) // no new conversion
  })

  it('also works via the named-network /webhooks/digistore route with config secret', async () => {
    process.env.DIGISTORE_WEBHOOK_SECRET = 'nmsecret';
    const user = await prisma.user.create({ data: { name: 'Named', email: `named+${Date.now()}@example.com`, password: 'x' } });
    const offer = await prisma.offer.create({ data: { title: 'n', name: 'n', slug: `n-${Date.now()}`, url: 'https://n', externalOfferId: 'e3' } });
    const click = await prisma.click.create({ data: { offerId: offer.id, adId: 1, userId: user.id, timeBucket: 1, clickId: 'clk3', clickToken: 'tok3' } });

    const payload = JSON.stringify({ sub_id: `${user.id}-${click.clickId}`, offerId: offer.id });
    const sig = crypto.createHmac('sha256', 'nmsecret').update(payload).digest('hex');

    const res = await request(server)
      .post('/webhooks/digistore')
      .set('Content-Type', 'application/json')
      .set('x-signature', `sha256=${sig}`)
      .send(payload);

    expect(res.status).toBe(200);
    const conv = await prisma.conversion.findFirst({ where: { offerId: offer.id } });
    expect(conv).toBeTruthy();
  });
})
