import request from 'supertest'
import app from '../src/index'
import prisma from '../src/prisma'
import { describe, beforeAll, afterAll, it, expect } from 'vitest'

let server: any
let user: any

beforeAll(async () => {
  await prisma.$connect()
  server = app.listen(0)
  // create a test user with token account via registration route
  const res = await request(server)
    .post('/api/auth/register')
    .send({ email: `tokenuser+${Date.now()}@example.com`, password: 'password' })
  user = res.body?.user
  if (!user) {
    // fallback: create user directly so teardown can run
    const created = await prisma.user.create({ data: { name: 'token-fallback', email: `tokenuser+fallback${Date.now()}@example.com`, password: 'x' } })
    user = { id: created.id, email: created.email }
  }
})

afterAll(async () => {
  server && server.close()
  if (user && user.id) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
  await prisma.$disconnect()
})

describe('Token endpoints', () => {
  it('GET /me/token-balance should return free plan data', async () => {
    // login to get cookie
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password' })

    const cookies = login.headers['set-cookie']

    const bal = await request(server)
      .get('/me/token-balance')
      .set('Cookie', cookies)

    expect(bal.status).toBe(200)
    expect(bal.body.plan).toBe('FREE')
    expect(bal.body.balance).toBeGreaterThanOrEqual(0)
    expect(bal.body.available).toBe(bal.body.balance - bal.body.reserved)
  })

  it('POST /internal/test-token-flow does full cycle', async () => {
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password' })
    const cookies = login.headers['set-cookie']

    const flow = await request(server)
      .post('/internal/test-token-flow')
      .set('Cookie', cookies)

    expect(flow.status).toBe(200)
    expect(flow.body.message).toMatch(/completed/)    
    expect(flow.body.balance).toBeDefined()
  })
})
