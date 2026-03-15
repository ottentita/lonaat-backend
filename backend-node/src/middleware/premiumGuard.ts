import { reserveTokens } from '../services/tokenService'
import { Request, Response, NextFunction } from 'express'

// feature: label used in ledger entries
// tokenCost: number of tokens to reserve for this operation
export const premiumGuard = (feature: string, tokenCost: number) =>
  async (req: Request & any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id

      await reserveTokens(userId, tokenCost, feature)

      req.tokenMeta = { feature, tokenCost }

      next()
    } catch (error: any) {
      return res.status(403).json({ message: error.message })
    }
  }
