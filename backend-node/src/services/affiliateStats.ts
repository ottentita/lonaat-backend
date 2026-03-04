import { prisma } from '../prisma'

export async function getTotalEarnings(userId?: number) {
  const where: any = {}
  if (userId) where.user_id = userId
  const res = await prisma.commission.aggregate({ where, _sum: { amount: true } })
  return res._sum.amount ? Number(res._sum.amount) : 0
}

export async function getPendingEarnings(userId?: number) {
  const where: any = { status: 'pending' }
  if (userId) where.user_id = userId
  const res = await prisma.commission.aggregate({ where, _sum: { amount: true } })
  return res._sum.amount ? Number(res._sum.amount) : 0
}

export async function getAvailableBalance(userId: number) {
  // Prefer stored withdrawable_balance on user if present
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { withdrawable_balance: true, balance: true } as any })
  if (user && user.withdrawable_balance != null) return Number((user as any).withdrawable_balance)

  // Fallback: sum approved commissions minus completed withdrawals
  const approved = await prisma.commission.aggregate({ where: { user_id: userId, status: 'approved' }, _sum: { amount: true } })
  const withdrawals = await prisma.withdrawal_requests.aggregate({ where: { user_id: userId, status: 'paid' }, _sum: { amount: true } })
  const approvedAmount = approved._sum.amount ? Number(approved._sum.amount) : 0
  const withdrawn = withdrawals._sum.amount ? Number(withdrawals._sum.amount) : 0
  return Math.max(0, approvedAmount - withdrawn)
}

export async function getTotalClicks(userId?: number) {
  const where: any = {}
  if (userId) where.user_id = userId
  // affiliateClick table used for product affiliate clicks
  const count = await prisma.affiliateClick.count({ where })
  return count || 0
}

export async function getTotalLeads(userId?: number) {
  // Use commissions as representation of leads credited to user
  const where: any = {}
  if (userId) where.user_id = userId
  const stats = await prisma.commission.aggregate({ where, _count: { id: true } })
  return stats._count.id || 0
}

export async function getAffiliateStats(userId: number) {
  const [totalEarnings, pendingEarnings, availableBalance, totalClicks, totalLeads] = await Promise.all([
    getTotalEarnings(userId),
    getPendingEarnings(userId),
    getAvailableBalance(userId),
    getTotalClicks(userId),
    getTotalLeads(userId)
  ])

  const conversionRate = totalClicks > 0 ? Number(((totalLeads / totalClicks) * 100).toFixed(2)) : 0

  return {
    total_earnings: totalEarnings,
    pending_earnings: pendingEarnings,
    available_balance: availableBalance,
    total_clicks: totalClicks,
    total_leads: totalLeads,
    conversion_rate: conversionRate
  }
}

export default {
  getTotalEarnings,
  getPendingEarnings,
  getAvailableBalance,
  getTotalClicks,
  getTotalLeads,
  getAffiliateStats
}
