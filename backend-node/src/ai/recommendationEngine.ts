import { prisma } from '../prisma'

export async function getOfferRecommendations() {
  // read-only, no side effects
  const offers = await prisma.offer.findMany({ where: { isActive: true } })

  const scores: Array<{ offerId: number; score: number }> = []

  for (const offer of offers) {
    const offerId = offer.id
    const clickVolume = await prisma.click.count({ where: { offerId } })
    const convCount = await prisma.conversion.count({ where: { offerId } })
    const conversionRate = clickVolume > 0 ? convCount / clickVolume : 0

    const avgCommRes = await prisma.commission.aggregate({
      _avg: { amount: true },
      where: {
        click: { offerId }
      }
    })
    const avgCommission = Number(avgCommRes._avg.amount || 0)

    const score = conversionRate * 0.5 + clickVolume * 0.2 + avgCommission * 0.3
    scores.push({ offerId, score })
  }

  scores.sort((a, b) => b.score - a.score)
  return scores.slice(0, 5)
}

export default { getOfferRecommendations }