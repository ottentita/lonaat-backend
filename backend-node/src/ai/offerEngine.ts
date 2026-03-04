import { prisma } from '../prisma'

export async function analyzeOffersForUser(userId: number) {
  // Fetch offers and basic stats
  const offers = await prisma.offer.findMany({})

  const results = [] as any[]

  for (const offer of offers) {
    const offerId = offer.id
    const conversions = await prisma.commission.findMany({ where: { product_id: offerId, status: 'approved' } })
    const clicks = await prisma.click.count({ where: { offerId } })

    const totalConv = conversions.length
    const totalRevenue = conversions.reduce((s, c) => s + Number((c as any).amount || 0), 0)
    const epc = clicks > 0 ? totalRevenue / clicks : 0

    results.push({ offerId, title: offer.title, network: offer.network, epc, clicks, totalConv })
  }

  results.sort((a, b) => b.epc - a.epc)

  // Top 5 offers
  const topOffers = results.slice(0, 5)

  // Simple network suggestion based on user offers' networks
  const networks = Array.from(new Set(results.map(r => r.network).filter(Boolean)))

  return { topOffers, suggestedNetworks: networks }
}

export default { analyzeOffersForUser }
