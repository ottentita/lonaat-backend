import { NextFunction, Response } from 'express'
import { AuthRequest } from './auth'

export function subscriptionGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' })

  // Admin bypass
  if (req.user.isAdmin) return next()

  const now = new Date()
  const plan = (req.user as any).plan || 'free'
  const tokenBalance = Number((req.user as any).tokenBalance ?? 0)
  const trialEndsAt = (req.user as any).trialEndsAt ? new Date((req.user as any).trialEndsAt) : null
  const subscriptionEndsAt = (req.user as any).subscriptionEndsAt ? new Date((req.user as any).subscriptionEndsAt) : null

  // expired plan
  if (plan === 'expired') return res.status(403).json({ error: 'Subscription expired' })

  // if on trial and trial ended -> block
  if (trialEndsAt && trialEndsAt <= now && (!subscriptionEndsAt || subscriptionEndsAt <= now)) {
    return res.status(403).json({ error: 'Trial expired' })
  }

  // if not on any active plan and no tokens -> block
  const hasActiveSubscription = subscriptionEndsAt && subscriptionEndsAt > now
  if (!hasActiveSubscription && tokenBalance <= 0 && plan !== 'free' && plan !== 'trial') {
    return res.status(403).json({ error: 'No active subscription or tokens available' })
  }

  next()
}

export default subscriptionGuard
