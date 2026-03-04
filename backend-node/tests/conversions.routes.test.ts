import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

describe('Conversion route docs and router', () => {
  it('CONVERSION_ROUTES.md exists and documents /api/conversions/track', () => {
    const mdPath = path.resolve(__dirname, '../CONVERSION_ROUTES.md')
    expect(fs.existsSync(mdPath)).toBe(true)
    const md = fs.readFileSync(mdPath, 'utf-8')
    expect(md).toContain('/api/conversions/track')
    expect(md).toContain('POST /track')
  })

  it('conversions.routes exports a router', async () => {
    const mod = await import('../src/routes/conversions')
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
  }, 10000)
})