import { vi, beforeAll, afterAll } from 'vitest'

// Load test env
require('dotenv').config({ path: '.env.test' })

// Ensure Prisma test client is connected and available as a singleton on globalThis
// Use dynamic import inside beforeAll to avoid resolution issues when vitest changes cwd
beforeAll(async () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path')
    const prismaRequirePath = path.resolve(process.cwd(), 'src', 'prisma')
    const mod = await import(prismaRequirePath)
    const prismaClient = mod.prisma || mod.default || mod
    if (!globalThis.prisma) globalThis.prisma = prismaClient
    if (globalThis.prisma && typeof globalThis.prisma.$connect === 'function') {
      await globalThis.prisma.$connect()
    }
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn('Could not initialize test Prisma client in vitest.setup:', e && e.message ? e.message : e)
  }
})

afterAll(async () => {
  try {
    if (globalThis.prisma && typeof globalThis.prisma.$disconnect === 'function') {
      await globalThis.prisma.$disconnect()
    }
  } catch (e) {
    // ignore
  }
})

// Mock OpenAI client used by AI modules — provide default export compatible with `import OpenAI from 'openai'`
vi.mock('openai', () => {
  class MockOpenAI {
    constructor() {}
    // shape used in code: chat.completions.create
    chat = {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify({ hooks: [], script: '', caption: '', hashtags: [] }) } }]
        })
      }
    }
    // optional responses/embeddings used elsewhere
    responses = { create: async () => ({ output: [{ content: 'mocked' }] }) }
    embeddings = { create: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) }
  }

  return {
    default: MockOpenAI
  }
})

// Mock external ad API placeholder
vi.mock('node-fetch', () => {
  return { default: () => ({ ok: true, json: async () => ({}) }) }
})
