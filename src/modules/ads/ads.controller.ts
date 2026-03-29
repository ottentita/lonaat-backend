import { Request, Response } from 'express'
import { CreateCampaignInput, ProcessClickInput } from './ads.types'
import adCampaignService from './adCampaign.service'
import adEngine from './adEngine.service'
import tokenWallet from './tokenWallet.service'

// prisma client is created lazily to avoid database initialization at module import
function getPrisma() {
  // require used to defer loading until runtime
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../prisma').default
}

export async function createCampaignHandler(req: Request, res: Response) {
  try {
    const body = req.body as CreateCampaignInput
    const userId = Number(body.userId || (req as any).user?.userId)
    const campaign = await adCampaignService.createCampaign(userId, body.dailyBudget, body.productId, body.offerId)
    return res.json(campaign)
  } catch (err: any) {
    console.error('createCampaign error', err)
    return res.status(400).json({ error: err.message })
  }
}

export async function processClickHandler(req: Request, res: Response) {
  try {
    const campaignId = Number(req.params.id)
    const ip = req.ip || req.headers['x-forwarded-for'] as string
    const isAdmin = !!(req as any).user?.isAdmin
    const result = await adEngine.processAdClick(campaignId, ip, isAdmin)
    return res.json(result)
  } catch (err: any) {
    console.error('processClick error', err)
    return res.status(400).json({ error: err.message })
  }
}

export async function dashboardHandler(req: Request, res: Response) {
  try {
    const prisma = getPrisma()
    const userId = Number(req.params.userId)
    const wallet = await tokenWallet.getWallet(userId)
    const campaigns = await prisma.adCampaign.findMany({ where: { userId } })
    const active = campaigns.filter(c => c.status === 'active')
    const totalSpent = campaigns.reduce((s, c) => s + (c.totalSpent || 0), 0)
    const impressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0)
    const clicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0)
    const ctr = impressions > 0 ? clicks / impressions : 0

    // approximate conversions: commissions for user's products/offers
    const convCount = await prisma.commission.count({ where: { user_id: userId } })
    const conversionRate = clicks > 0 ? convCount / clicks : 0

    return res.json({
      balance: wallet ? wallet.balance : 0,
      activeCampaigns: active.length,
      totalSpent,
      ctr,
      conversionRate
    })
  } catch (err: any) {
    console.error('dashboardHandler error', err)
    return res.status(500).json({ error: err.message })
  }
}

export async function adminCreditTokens(req: Request, res: Response) {
  try {
    const { userId, amount } = req.body
    if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' })

    // admin route should be protected by middleware; perform transactional credit
    const prisma = getPrisma()
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.adTokenWallet.upsert({ where: { userId }, create: { userId, balance: 0 }, update: {} })
      await tx.adTokenWallet.update({ where: { userId }, data: { balance: { increment: Number(amount) } } })
      await tx.tokenTransaction.create({ data: { userId, amount: Number(amount), type: 'credit', reason: 'admin_credit' } })
      const updatedWallet = await tx.adTokenWallet.findUnique({ where: { userId } })
      return { newBalance: updatedWallet!.balance }
    })

    return res.json(result)
  } catch (err: any) {
    console.error('adminCreditTokens error', err)
    return res.status(500).json({ error: err.message })
  }
}

export default { createCampaignHandler, processClickHandler, dashboardHandler, adminCreditTokens }
