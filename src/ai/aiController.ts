import { analyzeOffersForUser } from './offerEngine'
import { analyzeFraudForUser } from './fraudEngine'
import { predictEarningsForUser } from './earningsEngine'
import { predictEarnings as predictOfferEarnings } from '../modules/ai/ai.earnings.service'
import { matchPropertiesForUser } from './realEstateEngine'
import { generateAdBlueprint } from './adEngine'
import { getOfferRecommendations } from './recommendationEngine'
import { prisma } from '../prisma'

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

export async function earningsPrediction(userId: number, offerId: number, clicks: number) {
  return await predictOfferEarnings(userId, offerId, clicks)
}

export async function getRecommendations() {
  return await getOfferRecommendations()
}

export async function generateScript(payload: any) {
  // Minimal implementation for build stability; callers expect a JSON result.
  return {
    script: String((payload && (payload.script || payload.prompt)) || 'Generated script placeholder'),
  }
}

export default { analyzeUser, generateAd, matchProperties, getRecommendations, earningsPrediction, generateScript }
