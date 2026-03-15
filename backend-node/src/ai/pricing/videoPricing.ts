export type VideoPricingInput = {
  durationSeconds: number
  resolution?: string
  modelTier?: string
}

const MAX_DURATION = 120

const RESOLUTION_MULTIPLIERS: Record<string, number> = {
  '720p': 1,
  '1080p': 1.5,
  '4k': 2.5,
}

const MODEL_MULTIPLIERS: Record<string, number> = {
  standard: 1,
  high: 1.4,
}

export function calculateVideoTokenCost(opts: VideoPricingInput): number {
  const durationSeconds = Number(opts.durationSeconds || 0)
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('durationSeconds must be a positive number')
  }
  if (durationSeconds > MAX_DURATION) {
    throw new Error(`durationSeconds exceeds maximum allowed (${MAX_DURATION}s)`) }

  const resolutionRaw = String(opts.resolution || '720p').toLowerCase()
  const resolutionKey = resolutionRaw === '2160p' ? '4k' : resolutionRaw
  const resolutionMultiplier = RESOLUTION_MULTIPLIERS[resolutionKey]
  if (resolutionMultiplier == null) throw new Error(`invalid resolution: ${opts.resolution}`)

  const modelRaw = String(opts.modelTier || 'standard').toLowerCase()
  const modelMultiplier = MODEL_MULTIPLIERS[modelRaw]
  if (modelMultiplier == null) throw new Error(`invalid modelTier: ${opts.modelTier}`)

  // base: 10 tokens per 10 seconds => 1 token per second
  const baseUnits = durationSeconds
  const raw = baseUnits * resolutionMultiplier * modelMultiplier
  return Math.ceil(raw)
}

export default { calculateVideoTokenCost }
