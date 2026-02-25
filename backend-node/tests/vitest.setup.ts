import { vi } from 'vitest'

// Mock OpenAI client used by AI modules
vi.mock('openai', () => {
  return {
    OpenAI: function () {
      return {
        responses: { create: async () => ({ output: [{ content: 'mocked' }] }) },
        embeddings: { create: async () => ({ data: [{ embedding: [0.1, 0.2] }] }) }
      }
    }
  }
})

// Mock external ad API placeholder
vi.mock('node-fetch', () => {
  return { default: () => ({ ok: true, json: async () => ({}) }) }
})
