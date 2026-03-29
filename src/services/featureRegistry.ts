import { getFeatureConfig, listFeatures as listAIRegistered, registerFeatureConfig } from '../ai/featureRegistry'

export type FeatureHandler = (payload: any, meta?: { userId?: number }) => Promise<any>

export type Feature = {
  name: string
  tokenCost: number
  description?: string
  handler?: FeatureHandler
}

export function registerFeature(feature: Feature) {
  // Mirror into centralized AI registry
  registerFeatureConfig({ 
    name: feature.name, 
    action: feature.name as any, 
    minimumPlan: 'basic', 
    tokenCostStrategy: { type: 'fixed', amount: feature.tokenCost }, 
    trialAllowed: true,
    description: feature.description 
  })
}

export function getFeature(name: string): Feature | undefined {
  const cfg = getFeatureConfig(name)
  if (!cfg) return undefined
  return { name: cfg.name, tokenCost: cfg.tokenCostStrategy.amount, description: cfg.description }
}

export function listFeatures(): Feature[] {
  return listAIRegistered().map(f => ({ name: f.name, tokenCost: f.tokenCostStrategy.amount, description: f.description }))
}
