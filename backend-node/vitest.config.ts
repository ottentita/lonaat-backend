import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: [ './tests/vitest.setup.ts' ],
    hookTimeout: 120_000,
    // use global setup/teardown to prepare sqlite and seed
    globalSetup: path.resolve(__dirname, 'tests/test-setup.ts'),
    globalTeardown: path.resolve(__dirname, 'tests/test-teardown.ts'),
    include: ['tests/integration/**/*.test.ts', 'tests/**/*.test.ts']
  }
})
