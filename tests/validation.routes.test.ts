import request from 'supertest'
import app from '../src'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('Validation middleware', () => {
  beforeAll(() => {
    // ensure auth middleware short-circuits to avoid 401s
    process.env.NODE_ENV = 'development'
  })

  afterAll(() => {
    process.env.NODE_ENV = 'test'
  })

  it('rejects click tracking with missing fields', async () => {
    const res = await request(app).post('/api/track/click').send({})
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it('allows click tracking when externalSubId provided', async () => {
    const res = await request(app).post('/api/track/click').send({ offerId: 1, clickId: 'abc', externalSubId: 'foo' })
    // body contains either click or error due to missing offer, but validation should pass (not 400)
    expect(res.status).not.toBe(400)
  })

  it('rejects conversion endpoint with neither offerId nor clickToken', async () => {
    const res = await request(app).post('/api/track/conversion').send({ amount: 10 })
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it('rejects earnings prediction with invalid query params', async () => {
    const res = await request(app).get('/api/ai/earnings-prediction?offerId=foo&clicks=bar')
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it('rejects subscription request without plan_id', async () => {
    const res = await request(app).post('/api/subscriptions/subscribe').send({})
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })

  it('rejects payments webhook with missing transactionId', async () => {
    const res = await request(app).post('/api/payments/webhook').send({ status: 'completed' })
    expect(res.status).toBe(400)
    expect(res.body.errors).toBeDefined()
  })
})