import { analyzeOffersForUser } from './offerEngine'
import { analyzeFraudForUser } from './fraudEngine'
import { predictEarningsForUser } from './earningsEngine'
import { matchPropertiesForUser } from './realEstateEngine'
import { generateAdBlueprint } from './adEngine'
import prisma from '../prisma'

export async function analyzeUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const offers = await analyzeOffersForUser(userId)
  const fraud = await analyzeFraudForUser(userId)
  const earnings = await predictEarningsForUser(userId)

  return { user, offers, fraud, earnings }
}

export async function generateAd(productId: number) {
  return await generateAdBlueprint(productId)
}

export async function matchProperties(userId: number) {
  return await matchPropertiesForUser(userId)
}

export default { analyzeUser, generateAd, matchProperties }
