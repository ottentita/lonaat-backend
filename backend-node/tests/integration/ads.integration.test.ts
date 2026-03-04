import { describe, it, expect, beforeAll } from 'vitest'
import subscriptionService from '../../src/modules/ads/subscription.service'
import adEngine from '../../src/modules/ads/adEngine.service'
import prisma from '../../src/prisma'

const db = prisma

describe.skip('Ads integration (sqlite)', () => {
  let user: any
  let plan: any
  let campaign: any

  beforeAll(async () => {
    // fetch seeded user/plan created in global setup
    user = await db.user.findFirst({ where: { email: 'testuser@example.com' } })
    plan = await db.plan.findFirst({ where: { name: 'Test Plan' } })
  })

  it('credits tokens after activating subscription', async () => {
    const res = await subscriptionService.activateSubscription(user.id, plan.id, 1)
    expect(res).toBeDefined()
    const wallet = await db.adTokenWallet.findUnique({ where: { userId: user.id } })
    expect(wallet).toBeDefined()
    expect(wallet!.balance).toBe(Number(plan.monthlyTokens))
  })

  it('deducts tokens on ad click and auto-pauses when zero', async () => {
    // ensure wallet has small balance
    await db.adTokenWallet.update({ where: { userId: user.id }, data: { balance: 2 } })
    // create campaign
    campaign = await db.adCampaign.create({ data: { userId: user.id, dailyBudget: 10 } })

    // first click should succeed and reduce balance to 0 and pause campaign
    const r1 = await adEngine.processAdClick(campaign.id, '127.0.0.1', false)
    expect(r1).toBeDefined()
    const walletAfter = await db.adTokenWallet.findUnique({ where: { userId: user.id } })
    expect(walletAfter!.balance).toBe(0)
    const camp = await db.adCampaign.findUnique({ where: { id: campaign.id } })
    expect(camp!.status).toBe('paused')
  })

  it.skip('prevents negative balance and blocks rapid repeat clicks', async () => {
    // top up wallet a bit and unpause campaign
    await db.adTokenWallet.update({ where: { userId: user.id }, data: { balance: 4 } })
    await db.adCampaign.update({ where: { id: campaign.id }, data: { status: 'active' } })

    // first click: should deduct
    await adEngine.processAdClick(campaign.id, '10.0.0.1', false)

    // immediate second click from same IP should be blocked by fraud check
    let threw = false
    try {
      await adEngine.processAdClick(campaign.id, '10.0.0.1', false)
    } catch (e: any) {
      threw = true
      expect(String(e.message)).toMatch(/Rapid duplicate click detected/)
    }
    expect(threw).toBe(true)

    // now test database-level uniqueness when ip is missing; in-memory check is skipped
    threw = false
    try {
      await adEngine.processAdClick(campaign.id, undefined, false)
      // second call within same bucket should hit unique index
      await adEngine.processAdClick(campaign.id, undefined, false)
    } catch (e: any) {
      threw = true
      expect(e.name).toBe('DuplicateClickError')
    }
    expect(threw).toBe(true)
  })
})
