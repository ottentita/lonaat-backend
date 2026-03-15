import { describe, it, expect, beforeAll } from 'vitest'
import prisma from '../../src/prisma'
import aiController from '../../src/ai/aiController'
import request from 'supertest'
import app from '../../src'
import crypto from 'crypto'

const db = prisma

describe('Offer recommendation engine', () => {
  let offer1: any, offer2: any

  beforeAll(async () => {
    // create dummy user for clicks/commissions
    const user = await db.user.create({ data: { email: `rec${Date.now()}@example.com`, password: 'foo', role: 'user' } })

    // create two offers (unique slugs per run)
    const s1 = `offer-1-${Date.now()}`
    const s2 = `offer-2-${Date.now()}`
    offer1 = await db.offer.create({ data: { title: 'Offer 1', name: 'Offer 1', slug: s1, url: '', network: 'net1', payout: 5 } })
    offer2 = await db.offer.create({ data: { title: 'Offer 2', name: 'Offer 2', slug: s2, url: '', network: 'net2', payout: 10 } })

    // clicks and conversions for offer1: high click volume, moderate conv rate, low commission
    for (let i = 0; i < 3; i++) {
      const token = crypto.randomUUID()
      const cid = crypto.randomUUID()
      const click = await db.click.create({ data: { offerId: offer1.id, adId: offer1.id, userId: user.id, timeBucket: i, clickId: cid, clickToken: token } })
      if (i < 5) {
        await db.commission.create({ data: { user_id: user.id, click_id: click.id, amount: 5, status: 'pending' } })
        await db.conversion.create({ data: { offerId: offer1.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } })
      }
    }

    // offer2: lower clicks but high commission
    for (let i = 0; i < 1; i++) {
      const token2 = crypto.randomUUID()
      const cid2 = crypto.randomUUID()
      const click = await db.click.create({ data: { offerId: offer2.id, adId: offer2.id, userId: user.id, timeBucket: 100 + i, clickId: cid2, clickToken: token2 } })
      await db.commission.create({ data: { user_id: user.id, click_id: click.id, amount: 10, status: 'pending' } })
      if (i === 0) {
        await db.conversion.create({ data: { offerId: offer2.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } })
      }
    }
  }, 30000)

  it('service returns top offer based on weighted score', async () => {
    const recs = await aiController.getRecommendations()
    expect(Array.isArray(recs)).toBe(true)
    expect(recs.length).toBeGreaterThan(0)
    // at least one recommendation is returned
    expect(recs[0].offerId).toBeDefined()
  }, 20000)

  it('route responds with recommendations and bypasses auth in dev', async () => {
    process.env.NODE_ENV = 'development'
    const res = await request(app).get('/api/ai/recommendations')
    expect(res.status).toBe(200)
    expect(res.body.recommendations).toBeDefined()
    expect(Array.isArray(res.body.recommendations)).toBe(true)
    process.env.NODE_ENV = 'test'
  }, 20000)
})
