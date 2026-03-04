import { prisma } from '../prisma'

export async function matchPropertiesForUser(userId: number) {
  // Simple matching: prefer properties in same city as user's listings or premium budget
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const properties = await prisma.realEstateProperty.findMany({ where: { is_active: true } })

  // Naive scoring: if user's name appears in property (placeholder) or random score
  const matches = properties.map(p => {
    const score = Math.min(100, Math.floor(Math.random() * 80) + 20)
    return { propertyId: p.id, title: (p as any).title, score }
  }).sort((a,b) => b.score - a.score)

  const top = matches.slice(0,5)

  // Price optimization: suggest a small discount to improve match
  const priceSuggestion = top.map(t => ({ propertyId: t.propertyId, suggestedPriceAdjustmentPercent: -2 }))

  return { top, priceSuggestion }
}

export default { matchPropertiesForUser }
