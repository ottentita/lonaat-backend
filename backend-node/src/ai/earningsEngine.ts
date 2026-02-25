import prisma from '../prisma'
import { subDays } from 'date-fns'

export async function predictEarningsForUser(userId: number) {
  // Average conversion rate = commissions / clicks over last 30 days
  const since = subDays(new Date(), 30)
  const clicks = await prisma.click.count({ where: { user_id: userId } as any })
  const commissions = await prisma.commission.findMany({ where: { user_id: userId, created_at: { gte: since } as any } })

  const convCount = commissions.length
  const convRate = clicks > 0 ? convCount / clicks : 0

  const totalEarned = commissions.reduce((s, c) => s + Number((c as any).amount || 0), 0)
  const avgDaily = totalEarned / 30
  const predicted30 = avgDaily * 30

  // Expected payout release date: today + 7 days by default or env
  const payoutDelayDays = Number(process.env.PAYOUT_DELAY_DAYS || 7)
  const expectedPayoutDate = new Date(Date.now() + payoutDelayDays * 24 * 3600 * 1000)

  return {
    conversionRate: convRate,
    predicted30DayEarnings: predicted30,
    expectedPayoutDate: expectedPayoutDate.toISOString(),
    totalEarned
  }
}

export default { predictEarningsForUser }
