import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('Ads route docs and module', () => {
  it('ADS_ROUTES.md exists and documents internal path', () => {
    const mdPath = path.resolve(__dirname, '../ADS_ROUTES.md')
    expect(fs.existsSync(mdPath)).toBe(true)
    const md = fs.readFileSync(mdPath, 'utf-8')
    expect(md).toContain('/api/ads/internal')
    expect(md).toContain('POST /campaign')
  })

  it('ads.routes exports a router', async () => {
    const mod = await import('../../src/modules/ads/ads.routes')
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
  })
})
