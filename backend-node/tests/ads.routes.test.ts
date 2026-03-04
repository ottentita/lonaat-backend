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

  // this import can occasionally be slow when the full suite has just run
  // (Prisma client generation, DB resets, etc). extend timeout to keep the
  // test stable while still ensuring the module loads and exports a router.
  it('ads.routes exports a router', async () => {
    // path should point to backend-node/src not workspace root
    const mod = await import('../src/modules/ads/ads.routes')
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
  }, 10000)
})
