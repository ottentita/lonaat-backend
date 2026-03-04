import { describe, it, expect } from 'vitest'
import { simulateVideoCost } from '../../src/ai/pricing/videoCostSimulator'

describe('videoCostSimulator invalid inputs', () => {
  it('rejects duration > 600 seconds', () => {
    expect(() => simulateVideoCost({ durationSeconds: 601, resolution: '720p', modelTier: 'standard', tokenDollarValue: 0.01 })).toThrow('ERR_INVALID_VIDEO_INPUT')
  })

  it('rejects unsupported resolution', () => {
    expect(() => simulateVideoCost({ durationSeconds: 60, resolution: '4k', modelTier: 'standard', tokenDollarValue: 0.01 })).toThrow('ERR_INVALID_VIDEO_INPUT')
  })
})
