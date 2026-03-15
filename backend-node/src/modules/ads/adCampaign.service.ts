// prisma is lazily required to avoid client creation on module import
async function getPrisma() {
  const { default: prisma } = await import('../../prisma')
  return prisma
}
import tokenWallet from './tokenWallet.service'

export async function createCampaign(userId: number, dailyBudget: number, productId?: number, offerId?: number) {
  if (!productId && !offerId) throw new Error('productId or offerId required')

  const prisma = await getPrisma()
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.adTokenWallet.findUnique({ where: { userId } })
    if (!wallet) throw new Error('No token wallet')
    if (wallet.balance < dailyBudget) throw new Error('Insufficient tokens for budget')

    const campaign = await tx.adCampaign.create({ data: { userId, dailyBudget, productId, offerId } })
    return campaign
  })
}

export async function pauseCampaign(campaignId: number) {
  const prisma = await getPrisma()
  return prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } })
}

export async function getActiveCampaignsForUser(userId: number) {
  const prisma = await getPrisma()
  return prisma.adCampaign.findMany({ where: { userId, status: 'active' } })
}

export default { createCampaign, pauseCampaign, getActiveCampaignsForUser }
