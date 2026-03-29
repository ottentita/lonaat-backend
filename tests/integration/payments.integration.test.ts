import request from 'supertest'
import app from '../../src'
import prisma from '../../src/prisma'
import { describe, it, expect, beforeAll } from 'vitest'

const db = prisma

describe.skip('Payment webhook handler', () => {
  let user: any
  let plan: any

  beforeAll(async () => {
    // create a test user and plan
    user = await db.user.create({ data: { email: `webhook${Date.now()}@example.com`, password: 'foo', role: 'user' } })
    plan = await db.plan.create({ data: { name: 'Test Plan', price: 10, monthlyTokens: 5 } })
  })

  it('should process webhook idempotently and mint tokens', async () => {
    const payload = {
      provider: 'stripe',
      providerRef: 'evt_12345',
      userId: String(user.id),
      planId: String(plan.id)
    }

    // first call
    const res1 = await request(app).post('/api/payments/webhook').send(payload).expect(200)
    expect(res1.body).toEqual({ status: 'ok' })

    const events = await db.paymentEvent.findMany({ where: { providerRef: 'evt_12345' } })
    expect(events.length).toBe(1)

    const subs = await db.subscription.findMany({ where: { userId: user.id, planId: plan.id } })
    expect(subs.length).toBe(1)

    const wallet = await db.adTokenWallet.findUnique({ where: { userId: user.id } })
    expect(wallet).toBeDefined()
    expect(wallet!.balance).toBe(plan.monthlyTokens)

    // second call should be a no-op
    const res2 = await request(app).post('/api/payments/webhook').send(payload).expect(200)
    expect(res2.body).toEqual({ status: 'ok' })

    const events2 = await db.paymentEvent.findMany({ where: { providerRef: 'evt_12345' } })
    expect(events2.length).toBe(1)

    const wallet2 = await db.adTokenWallet.findUnique({ where: { userId: user.id } })
    expect(wallet2!.balance).toBe(plan.monthlyTokens) // unchanged
  })
})
