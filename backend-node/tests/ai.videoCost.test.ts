import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import prisma from '../src/prisma'
import aiEngine from '../src/ai/aiEngine'
import { AIActionType } from '../src/ai/aiTypes'

let proPlan: any = null
let proUser: any = null

beforeAll(async () => {
  // ensure clean
  await prisma.adTokenWallet.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } })
  await prisma.subscription.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } })
  await prisma.user.deleteMany({ where: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } })
  await prisma.plan.deleteMany({ where: { name: { in: ['pro'] } } })

  proPlan = await prisma.plan.create({ data: { name: 'pro', price: 100, monthlyTokens: 1000 } })
  proUser = await prisma.user.create({ data: { email: 'video-pro@example.com', password: 'x', balance: 0 } })
  await prisma.subscription.create({ data: { userId: proUser.id, planId: proPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } })
  await prisma.adTokenWallet.create({ data: { userId: proUser.id, balance: 1000 } })

  // low-balance user
  const low = await prisma.user.create({ data: { email: 'video-lowbal@example.com', password: 'x', balance: 0 } })
  await prisma.subscription.create({ data: { userId: low.id, planId: proPlan.id, status: 'active', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } })
  await prisma.adTokenWallet.create({ data: { userId: low.id, balance: 5 } })
})

afterAll(async () => {
  await prisma.adTokenWallet.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } })
  await prisma.subscription.deleteMany({ where: { user: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } } })
  await prisma.user.deleteMany({ where: { email: { in: ['video-pro@example.com', 'video-lowbal@example.com'] } } })
  await prisma.plan.deleteMany({ where: { name: 'pro' } })
  await prisma.$disconnect()
})

describe('VIDEO_GENERATION dynamic token costs', () => {
  it('10s 720p standard => 10 tokens (dry-run)', async () => {
    const res = await aiEngine.executeAI({ action: AIActionType.VIDEO_GENERATION, payload: { durationSeconds: 10, resolution: '720p', modelTier: 'standard' }, dry: true }, proUser.id)
    expect(res).toBeDefined()
    expect((res as any).success).toBe(true)
    expect((res as any).tokensUsed).toBe(10)
    expect((res as any).simulated).toBe(true)
  })

  it('20s 1080p high => computed tokens (dry-run)', async () => {
    const res = await aiEngine.executeAI({ action: AIActionType.VIDEO_GENERATION, payload: { durationSeconds: 20, resolution: '1080p', modelTier: 'high' }, dry: true }, proUser.id)
    // calculation: (20/10)*10 = 20; 1080p x1.5 => 30; high x1.4 => 42 => ceil(42)=42
    expect(res).toBeDefined()
    expect((res as any).success).toBe(true)
    expect((res as any).tokensUsed).toBe(42)
    expect((res as any).simulated).toBe(true)
  })

  it('rejects when insufficient balance (non-dry)', async () => {
    const low = await prisma.user.findUnique({ where: { email: 'video-lowbal@example.com' } })
    const res = await aiEngine.executeAI({ action: AIActionType.VIDEO_GENERATION, payload: { durationSeconds: 10, resolution: '720p', modelTier: 'standard' }, dry: false }, (low as any)!.id)
    expect(res).toBeDefined()
    expect((res as any).success).toBe(false)
    expect(((res as any).error || '').toLowerCase()).toContain('insufficient')
  })
})
