import { describe, it, expect, beforeAll } from 'vitest'
import prisma from '../../src/prisma'
import aiController from '../../src/ai/aiController'
import request from 'supertest'
import app from '../../src'
import crypto from 'crypto'

const db = prisma

describe('Earnings prediction engine', () => {
  let user: any, offer: any

  beforeAll(async () => {
    process.env.AD_CLICK_COST = '1' // deterministic token cost

    user = await db.user.create({ data: { email: `earn${Date.now()}@example.com`, password: 'foo', role: 'user' } })
    const slugEarn = `offer-earn-${Date.now()}`
    offer = await db.offer.create({ data: { title: 'Offer Earn', name: 'Offer Earn', slug: slugEarn, url: '', network: 'net', payout: 20 } })

    // simulate 50 clicks with 2 conversions
    for (let i = 0; i < 50; i++) {
      // generate UUIDs to avoid collisions across runs and satisfy possible uuid schema
      const token = crypto.randomUUID()
      const cid = crypto.randomUUID()
      const click = await db.click.create({ data: { offerId: offer.id, adId: offer.id, userId: user.id, timeBucket: i, clickId: cid, clickToken: token } })
      if (i < 2) {
        await db.commission.create({ data: { user_id: user.id, click_id: click.id, amount: 20, status: 'pending' } })
        await db.conversion.create({ data: { offerId: offer.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } })
      }
    }
  }, 30000)

  it('service computes expected values and risk level', async () => {
    const result = await aiController.earningsPrediction(user.id, offer.id, 100)
    expect(result).toHaveProperty('expectedConversions')
    expect(result.expectedConversions).toBeCloseTo(4) // 2/50=0.04 conv rate -> 4 conversions
    expect(result).toHaveProperty('expectedEarnings', expect.any(Number))
    expect(result).toHaveProperty('roi', expect.any(Number))
    expect(result.riskLevel).toBe('LOW')
  })

  it('endpoint returns same structure', async () => {
    process.env.NODE_ENV = 'development'
    const res = await request(app).get(`/api/ai/earnings-prediction?offerId=${offer.id}&clicks=100`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('expectedConversions')
    expect(res.body).toHaveProperty('expectedEarnings')
    expect(res.body).toHaveProperty('roi')
    expect(res.body).toHaveProperty('riskLevel')
    process.env.NODE_ENV = 'test'
  })
})