import { AIActionType, AIRequest, AIResponse } from './aiTypes'
import { getFeatureConfig } from './featureRegistry'
import prisma from '../prisma'
import * as tokenMeter from './tokenMeter'
import { calculateVideoTokenCost } from './pricing/videoPricing'
import { simulateVideoCost } from './pricing/videoCostSimulator'

const DRY_RUN = String(process.env.AI_DRY_RUN || '').toLowerCase() === 'true'

function planRank(plan?: string) {
  switch ((plan || '').toLowerCase()) {
    case 'pro': return 3
    case 'basic': return 2
    case 'trial': return 1
    default: return 0
  }
}

export async function executeAI(request: AIRequest, userId: number): Promise<AIResponse> {
  const feature = getFeatureConfig(request.action)
  if (!feature) throw new Error('Feature not found')

  // Validate user and plan (derive plan from active subscription when present)
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscriptions: { include: { plan: true } } } })
  if (!user) throw new Error('User not found')

  // determine plan: prefer most recent active subscription's plan name
  let userPlan = 'trial'
  if (user.subscriptions && user.subscriptions.length > 0) {
    const active = user.subscriptions.find(s => s.status === 'active' && new Date(s.expiresAt) > new Date())
    if (active && (active as any).plan && (active as any).plan.name) {
      userPlan = (active as any).plan.name
    }
  }
  console.debug('[aiEngine] userPlan=', userPlan, 'feature.minimumPlan=', feature.minimumPlan)
  if (planRank(userPlan) < planRank(feature.minimumPlan)) {
    return { success: false, error: 'Plan does not allow this feature', requiredPlan: feature.minimumPlan }
  }

  if (userPlan === 'trial' && !feature.trialAllowed) {
    return { success: false, error: 'Feature not available for trial users', requiredPlan: feature.minimumPlan }
  }

  // compute token cost (support fixed strategy)
  let cost = 0
  if (feature.tokenCostStrategy && feature.tokenCostStrategy.type === 'fixed') {
    cost = feature.tokenCostStrategy.amount
  }

  // Special handling for VIDEO_GENERATION: dynamic cost based on payload
  if (request.action === AIActionType.VIDEO_GENERATION) {
    try {
      const duration = (request.payload || {}).durationSeconds ?? 10
      cost = calculateVideoTokenCost({
        durationSeconds: Number(duration),
        resolution: (request.payload || {}).resolution,
        modelTier: (request.payload || {}).modelTier,
      })
    } catch (err: any) {
      return { success: false, error: String(err && err.message ? err.message : err) }
    }

    // Guardrail: prevent negative-margin executions based on configured token dollar value
    try {
      const tokenDollarValue = Number(process.env.TOKEN_DOLLAR_VALUE ?? '0.01')
      const sim = simulateVideoCost({
        durationSeconds: Number(duration),
        resolution: (request.payload || {}).resolution,
        modelTier: (request.payload || {}).modelTier,
        tokenDollarValue,
      })
      if (sim.effectiveRevenueIfTokenDollarValue < sim.estimatedProviderCostUSD) {
        return { success: false, error: 'ERR_NEGATIVE_MARGIN' }
      }
    } catch (err: any) {
      if (String(err.message).includes('ERR_INVALID_VIDEO_INPUT')) {
        return { success: false, error: 'ERR_INVALID_VIDEO_INPUT' }
      }
      if (String(err.message).includes('ERR_NEGATIVE_MARGIN')) {
        return { success: false, error: 'ERR_NEGATIVE_MARGIN' }
      }
      // other errors fall through
    }
  }

  if (cost > 0) {
    const requestDry = (request as any).dry === true
    const effectiveDry = requestDry || DRY_RUN
    if (effectiveDry) {
      console.warn('AI_DRY_RUN enabled — simulating token deduction for user', userId)
      const ok = await tokenMeter.hasSufficientTokens(userId, cost)
      if (!ok) return { success: false, error: 'Insufficient tokens (dry check)' }
      // continue to simulated result
    } else {
      try {
        const deducted = await tokenMeter.deductTokens(userId, cost)
        if (!deducted) return { success: false, error: 'Insufficient tokens' }
      } catch (err: any) {
        const msg = String(err && err.message ? err.message : err)
        if (msg.toLowerCase().includes('insufficient')) return { success: false, error: 'Insufficient tokens' }
        throw err
      }
    }
  }

  // Placeholder execution logic
  let result: any = null
  switch (request.action) {
    case AIActionType.TEXT_GENERATION:
      result = `Generated text placeholder for user ${userId}`
      break
    case AIActionType.IMAGE_ANALYSIS:
      result = { analysis: 'image analysis placeholder' }
      break
    case AIActionType.IMAGE_ENHANCEMENT:
      result = { enhanced: true }
      break
    case AIActionType.VIDEO_GENERATION:
      result = { video: 'video generation placeholder' }
      break
    case AIActionType.AD_COPY:
      result = { copies: ['Ad variant A', 'Ad variant B'] }
      break
    case AIActionType.PRODUCT_OPTIMIZER:
      result = { optimized: true }
      break
    default:
      result = { message: 'No implementation' }
  }

  const response: AIResponse & { simulated?: boolean } = {
    success: true,
    result,
    tokensUsed: cost,
  }

  const requestDry = (request as any).dry === true
  const effectiveDry = requestDry || DRY_RUN
  if (effectiveDry) response.simulated = true

  return response
}

export default { executeAI }
