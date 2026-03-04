import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import prisma from '../src/prisma'
import aiEngine from '../src/ai/aiEngine'
import { AIActionType } from '../src/ai/aiTypes'

let trialUser: any = null
let basicUser: any = null
let proUser: any = null
let basicPlan: any = null
let proPlan: any = null

beforeAll(async () => {
  // ensure previous runs cleaned up
  await prisma.adTokenWallet.deleteMany({ where: { user: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } } })
  await prisma.subscription.deleteMany({ where: { user: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } } })
  await prisma.user.deleteMany({ where: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } })
    // create or get plan fixtures
    basicPlan = (await prisma.plan.findFirst({ where: { name: 'basic' } })) || (await prisma.plan.create({ data: { name: 'basic', price: 0, monthlyTokens: 100 } }))
    proPlan = (await prisma.plan.findFirst({ where: { name: 'pro' } })) || (await prisma.plan.create({ data: { name: 'pro', price: 100, monthlyTokens: 1000 } }))

    // helper to find-or-create user
    async function findOrCreateUser(email: string, balance: number) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return existing
      return prisma.user.create({ data: { email, password: 'x', balance } })
    }

    // create or reuse test users (use `balance` per current schema)
    trialUser = await findOrCreateUser('ai-trial-test@example.com', 0)
    basicUser = await findOrCreateUser('ai-basic-test@example.com', 200)
    proUser = await findOrCreateUser('ai-pro-test@example.com', 1000)

    // attach subscriptions for basic and pro users if not present
    const basicSub = await prisma.subscription.findFirst({ where: { userId: basicUser.id, planId: basicPlan.id } })
    if (!basicSub) await prisma.subscription.create({ data: { userId: basicUser.id, planId: basicPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } })
    const proSub = await prisma.subscription.findFirst({ where: { userId: proUser.id, planId: proPlan.id } })
    if (!proSub) await prisma.subscription.create({ data: { userId: proUser.id, planId: proPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } })

    // ensure ad token wallets exist and have balances
    const basicWallet = await prisma.adTokenWallet.findUnique({ where: { userId: basicUser.id } })
    if (!basicWallet) await prisma.adTokenWallet.create({ data: { userId: basicUser.id, balance: 200 } })
    const proWallet = await prisma.adTokenWallet.findUnique({ where: { userId: proUser.id } })
    if (!proWallet) await prisma.adTokenWallet.create({ data: { userId: proUser.id, balance: 1000 } })

  // fixtures created above (idempotent)
})

afterAll(async () => {
  // cleanup only the records we created if they still exist
  await prisma.subscription.deleteMany({ where: { userId: { in: [basicUser?.id, proUser?.id].filter(Boolean) } } })
  await prisma.adTokenWallet.deleteMany({ where: { userId: { in: [basicUser?.id, proUser?.id].filter(Boolean) } } })
  await prisma.user.deleteMany({ where: { email: { in: ['ai-trial-test@example.com', 'ai-basic-test@example.com', 'ai-pro-test@example.com'] } } })
  await prisma.plan.deleteMany({ where: { name: { in: ['basic', 'pro'] } } })
  await prisma.$disconnect()
})

describe('Feature access control', () => {
  it('denies trial users from IMAGE_ANALYSIS', async () => {
    const res = await aiEngine.executeAI({ action: AIActionType.IMAGE_ANALYSIS, payload: {}, dry: true }, trialUser.id)
    expect(res).toBeDefined()
    expect((res as any).success).toBe(false)
    expect((res as any).requiredPlan).toBe('basic')
  })

  it('denies basic users from VIDEO_GENERATION', async () => {
    const res = await aiEngine.executeAI({ action: AIActionType.VIDEO_GENERATION, payload: {}, dry: true }, basicUser.id)
    expect(res).toBeDefined()
    expect((res as any).success).toBe(false)
    expect((res as any).requiredPlan).toBe('pro')
  })

  it('allows pro users to run VIDEO_GENERATION', async () => {
    const res = await aiEngine.executeAI({ action: AIActionType.VIDEO_GENERATION, payload: {}, dry: true }, proUser.id)
    expect(res).toBeDefined()
    expect((res as any).success).toBe(true)
    expect((res as any).tokensUsed).toBeGreaterThanOrEqual(1)
  })
})
