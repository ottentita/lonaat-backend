import { Request, Response, NextFunction } from 'express'

const blockedIPs = new Set<string>()

export function blockIfSuspicious(req: Request, res: Response, next: NextFunction) {
  const ip = (req.ip || req.headers['x-forwarded-for'] || '').toString()
  if (!ip) return next()
  if (blockedIPs.has(ip)) return res.status(403).json({ error: 'Blocked' })
  next()
}

export function reportSuspiciousIP(ip: string) {
  blockedIPs.add(ip)
}

export default { blockIfSuspicious, reportSuspiciousIP }
