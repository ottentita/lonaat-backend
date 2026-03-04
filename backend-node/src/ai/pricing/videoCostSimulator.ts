import { calculateVideoTokenCost, VideoPricingInput } from './videoPricing'

export type VideoCostSimulationInput = VideoPricingInput & {
  // dollar value per token (e.g. 0.01 for one cent per token)
  tokenDollarValue?: number
}

export type VideoCostSimulationOutput = {
  tokenCost: number
  estimatedProviderCostUSD: number
  effectiveRevenueIfTokenDollarValue: number
}

// Internal assumption: provider cost is approximated as a fraction of token-dollar revenue.
// This keeps the simulator simple and avoids adding new external pricing knobs.
const DEFAULT_TOKEN_DOLLAR_VALUE = 0.01
const PROVIDER_COST_RATIO = 0.20 // provider gets ~20% of token-dollar revenue (internal heuristic)

// Safety limits (abuse protection)
const MAX_SIM_DURATION = 600 // seconds
const ALLOWED_RESOLUTIONS = new Set(['480p', '720p', '1080p'])

/**
 * Simulate video generation economics.
 * - Uses the canonical token cost from `calculateVideoTokenCost`.
 * - Estimates provider cost as `tokenCost * tokenDollarValue * PROVIDER_COST_RATIO`.
 * - Returns token cost, estimated provider cost (USD), and effective revenue given tokenDollarValue.
 *
 * Pure function, no DB or I/O.
 */
export function simulateVideoCost(input: VideoCostSimulationInput): VideoCostSimulationOutput {
  const tokenDollarValue = Number(input.tokenDollarValue ?? DEFAULT_TOKEN_DOLLAR_VALUE)
  if (!Number.isFinite(tokenDollarValue) || tokenDollarValue <= 0) {
    throw new Error('tokenDollarValue must be a positive number')
  }

  // Abuse protection: validate duration and resolution before delegating to pricing
  const durationSeconds = Number(input.durationSeconds || 0)
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_SIM_DURATION) {
    throw new Error('ERR_INVALID_VIDEO_INPUT')
  }

  const resolution = String(input.resolution || '720p').toLowerCase()
  const resolutionKey = resolution === '2160p' ? '4k' : resolution
  if (!ALLOWED_RESOLUTIONS.has(resolutionKey)) {
    throw new Error('ERR_INVALID_VIDEO_INPUT')
  }

  const tokenCost = calculateVideoTokenCost(input)

  const grossRevenue = tokenCost * tokenDollarValue
  const estimatedProviderCostUSD = Number((grossRevenue * PROVIDER_COST_RATIO).toFixed(6))
  const effectiveRevenueIfTokenDollarValue = Number((grossRevenue - estimatedProviderCostUSD).toFixed(6))

  return {
    tokenCost,
    estimatedProviderCostUSD,
    effectiveRevenueIfTokenDollarValue,
  }
}

export default { simulateVideoCost }
