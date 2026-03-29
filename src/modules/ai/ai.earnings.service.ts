import { prisma } from '../../prisma'

/**
 * Simple earnings prediction based on historical offer data and projected clicks.
 * Returns conversion estimates, earnings, ROI and risk level.
 */
export async function predictEarnings(userId: number, offerId: number, projectedClicks: number) {
  // historical conversion rate for the offer
  const clickCount = await prisma.click.count({ where: { offerId } })
  const convCount = await prisma.conversion.count({ where: { offerId } })
  const conversionRate = clickCount > 0 ? convCount / clickCount : 0

  // average commission amount for that offer (join via click relation)
  const avgCommRes = await prisma.commission.aggregate({
    _avg: { amount: true },
    where: { click: { offerId } }
  })
  const avgCommission = Number(avgCommRes._avg.amount || 0)

  // cost of a click in tokens (configured in env)
  const tokenCost = Number(process.env.AD_CLICK_COST || 1)

  const expectedConversions = projectedClicks * conversionRate
  const expectedEarnings = expectedConversions * avgCommission
  const totalCost = projectedClicks * tokenCost
  const roi = totalCost > 0 ? expectedEarnings / totalCost : 0

  let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
  if (conversionRate > 0.03) riskLevel = 'LOW'
  else if (conversionRate >= 0.01) riskLevel = 'MEDIUM'

  return {
    expectedConversions,
    expectedEarnings,
    roi,
    riskLevel
  }
}

export default { predictEarnings }