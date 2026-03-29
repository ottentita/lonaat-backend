import { describe, it, expect } from 'vitest'
import { calculateVideoTokenCost } from '../../src/ai/pricing/videoPricing'

describe('calculateVideoTokenCost', () => {
  it('10s 720p standard => 10 tokens', () => {
    const tokens = calculateVideoTokenCost({ durationSeconds: 10, resolution: '720p', modelTier: 'standard' })
    expect(tokens).toBe(10)
  })

  it('20s 1080p high => 42 tokens', () => {
    const tokens = calculateVideoTokenCost({ durationSeconds: 20, resolution: '1080p', modelTier: 'high' })
    // (20) * 1.5 * 1.4 = 42
    expect(tokens).toBe(42)
  })

  it('120s 4K high => large cost', () => {
    const tokens = calculateVideoTokenCost({ durationSeconds: 120, resolution: '4k', modelTier: 'high' })
    // 120 * 2.5 * 1.4 = 420 => ceil 420
    expect(tokens).toBe(420)
  })

  it('duration > max throws', () => {
    expect(() => calculateVideoTokenCost({ durationSeconds: 121, resolution: '720p', modelTier: 'standard' })).toThrow()
  })
})
