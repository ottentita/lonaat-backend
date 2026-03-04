import { prisma } from '../prisma'

export async function generateAdBlueprint(productId: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } as any })
  if (!product) throw new Error('Product not found')

  const name = (product as any).name || 'Product'
  const price = (product as any).price || 'N/A'

  const headline = `Buy ${name} — Best Price!`
  const body = `Discover ${name}. Affordable, reliable, and highly recommended. Priced at ${price}. Limited stock.`
  const cta = 'Shop Now'

  const audience = [
    { interest: 'shoppers', weight: 0.7 },
    { interest: 'deal_seekers', weight: 0.5 }
  ]

  const budgetSuggestion = {
    currency: 'USD',
    daily: Number(process.env.AI_AD_DAILY_BUDGET || 10)
  }

  return { headline, body, cta, audience, budgetSuggestion }
}

export default { generateAdBlueprint }
