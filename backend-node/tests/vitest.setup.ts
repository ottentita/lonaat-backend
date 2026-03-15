const { PrismaClient } = require('@prisma/client')

let prismaClient

if (!globalThis.prisma) {
  prismaClient = new PrismaClient()
  globalThis.prisma = prismaClient
} else {
  prismaClient = globalThis.prisma
}

module.exports = prismaClient
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
