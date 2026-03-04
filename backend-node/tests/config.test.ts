import { describe, it, expect, vi } from 'vitest'

// the module under test logs warnings for missing envs when loaded

describe('affiliateConfig environment validation', () => {
  it('warns when required variables are missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // delete environment vars to simulate missing
    delete process.env.DIGISTORE_API_KEY
    delete process.env.DIGISTORE_WEBHOOK_SECRET
    delete process.env.CLICKBANK_API_KEY
    delete process.env.CLICKBANK_WEBHOOK_SECRET
    delete process.env.JVZOO_WEBHOOK_SECRET
    delete process.env.WARRIORPLUS_WEBHOOK_SECRET

    const config = require('../src/config/affiliateConfig')
    expect(warnSpy).toHaveBeenCalled()
    // config object should still exist with undefined values
    expect(config).toHaveProperty('digistore')
    warnSpy.mockRestore()
  })
})