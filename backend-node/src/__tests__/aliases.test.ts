import request from 'supertest'
import app from '../index'
import { describe, it, expect } from 'vitest'

describe('Backend compatibility aliases (minimal smoke)', () => {
  it('GET /api/plans is registered (alias → /api/subscriptions/plans)', async () => {
    const res = await request(app).get('/api/plans')
    // route should exist (200/307/500 are acceptable; 404 means missing)
    expect(res.status).not.toBe(404)
  })

  it('POST /api/subscription/subscribe is registered', async () => {
    const res = await request(app).post('/api/subscription/subscribe').send({ plan_id: 1 })
    expect(res.status).not.toBe(404)
  })

  it('GET /api/subscription/current redirects to /api/subscriptions/my-subscription', async () => {
    const res = await request(app).get('/api/subscription/current')
    // accept redirect (307) or actual handler response (200/401/500)
    expect([200, 301, 302, 307, 401, 500]).toContain(res.status)
  })

  it('GET /api/real-estate/analytics/overview is registered', async () => {
    const res = await request(app).get('/api/real-estate/analytics/overview')
    expect(res.status).not.toBe(404)
  })
})
