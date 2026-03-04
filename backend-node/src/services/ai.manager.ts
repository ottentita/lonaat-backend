import aiEngine from '../ai/aiEngine'

export class AIManager {
  async runFeature(userId: number | string, featureName: string, payload: any, options?: { dry?: boolean }) {
    // Delegate all execution to the centralized aiEngine
    const req = { action: featureName as any, payload, dry: options?.dry }
    const resp = await aiEngine.executeAI(req as any, Number(userId))
    return resp
  }
}

export default new AIManager()
