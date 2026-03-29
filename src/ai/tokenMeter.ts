import * as tokenService from '../services/token.service'

export async function deductTokens(userId: number, amount: number) {
  // Delegate to existing token service to ensure single source of truth
  return tokenService.deductTokens(userId, amount)
}

export async function hasSufficientTokens(userId: number, amount: number) {
  return tokenService.hasSufficientTokens(userId, amount)
}

export default { deductTokens, hasSufficientTokens }
