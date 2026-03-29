import { Router, Request, Response, NextFunction } from 'express'
import { clickLimiter } from '../../middleware/rateLimiter'

const router = Router()

async function withAuth(req: Request, res: Response, next: NextFunction, handler: (req: Request, res: Response) => Promise<any>) {
  const { authMiddleware } = await import('../../middleware/auth')
  authMiddleware(req as any, res, async (err?: any) => {
    if (err) return next(err)
    try {
      await handler(req, res)
    } catch (e) {
      next(e)
    }
  })
}

router.post('/campaign', (req, res, next) =>
  withAuth(req, res, next, async (r, s) => {
    const { createCampaignHandler } = await import('./ads.controller')
    return createCampaignHandler(r, s)
  })
)

router.post('/campaign/:id/click', clickLimiter, (req, res, next) =>
  withAuth(req, res, next, async (r, s) => {
    const { processClickHandler } = await import('./ads.controller')
    return processClickHandler(r, s)
  })
)

router.get('/dashboard/:userId', (req, res, next) =>
  withAuth(req, res, next, async (r, s) => {
    const { dashboardHandler } = await import('./ads.controller')
    return dashboardHandler(r, s)
  })
)

router.post('/admin/credit', (req, res, next) =>
  withAuth(req, res, next, async (r, s) => {
    const { adminCreditTokens } = await import('./ads.controller')
    return adminCreditTokens(r, s)
  })
)

export default router
