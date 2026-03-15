import request from 'supertest'
import app from '../../src/index'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import prisma from '../../src/prisma'
import { generateToken } from '../../src/utils/jwt'

describe('SaaS Content Generation', () => {
  let userId: number
  let authToken: string
  let offerId: number

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret'
    await prisma.$connect()

    // Create test user and ad token wallet with balance
    const user = await prisma.user.create({ data: { email: `content-test-${Date.now()}@example.com`, password: 'hashedpass' } })
    userId = user.id
    await prisma.adTokenWallet.create({ data: { userId: userId, balance: 50 } })
    authToken = generateToken({ id: userId, role: 'user', email: user.email, name: user.email })

    // Create test offer
    const offer = await prisma.offer.create({
      data: {
        name: 'Test Product for Content',
        title: 'Test Product',
        slug: `test-content-${Date.now()}`,
        url: 'https://example.com',
        network: 'test'
      }
    })
    offerId = offer.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should generate content successfully and deduct tokens', async () => {
    const res = await request(app)
      .post('/api/ai/generate-content')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        offerId,
        affiliateLink: 'https://aff.example.com/product',
        description: 'Amazing product that solves your problem',
        audience: 'entrepreneurs'
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.draftId).toBeDefined()
    expect(res.body.content).toBeDefined()
    expect(res.body.content.script).toBeTruthy()
    expect(res.body.content.caption).toBeTruthy()
    expect(res.body.remainingTokens).toBe(49)
  })

  it('should reject if no tokens available', async () => {
    // Create user with 0 tokens (adTokenWallet balance 0)
    const noTokenUser = await prisma.user.create({ data: { email: `no-tokens-${Date.now()}@example.com`, password: 'hashedpass' } })
    await prisma.adTokenWallet.create({ data: { userId: noTokenUser.id, balance: 0 } })
    const token = generateToken({
      id: noTokenUser.id,
      role: 'user',
      email: noTokenUser.email,
      name: noTokenUser.email
    })

    const res = await request(app)
      .post('/api/ai/generate-content')
      .set('Authorization', `Bearer ${token}`)
      .send({ offerId, description: 'Test' })

    expect(res.status).toBe(402)
    expect(res.body.error).toContain('Insufficient tokens')
  })

  it('should retrieve all content drafts for user', async () => {
    const res = await request(app)
      .get('/api/ai/my-content')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.drafts)).toBe(true)
    expect(res.body.count).toBeGreaterThanOrEqual(1)
    expect(res.body.drafts[0]).toHaveProperty('id')
    expect(res.body.drafts[0]).toHaveProperty('caption')
  })

  it('should return 401 if not authenticated', async () => {
    const res = await request(app)
      .post('/api/ai/generate-content')
      .send({ offerId })

    expect(res.status).toBe(401)
  })

  it('should return 400 if offerId missing', async () => {
    const res = await request(app)
      .post('/api/ai/generate-content')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'No offer id' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('offerId')
  })
})
