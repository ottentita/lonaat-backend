import { prisma } from '../prisma'
import { subMinutes } from 'date-fns'

export async function analyzeFraudForUser(userId: number) {
  // Analyze clicks for this user's offers
  const clicks = await prisma.click.findMany({ where: { user_id: userId } })

  const ipCounts: Record<string, number> = {}
  const flaggedIPs: string[] = []

  for (const c of clicks) {
    const ip = (c as any).ip || 'unknown'
    ipCounts[ip] = (ipCounts[ip] || 0) + 1
  }

  // Flag IPs with high click counts (threshold from env or default)
  const ipThreshold = Number(process.env.FRAUD_IP_THRESHOLD || 20)
  for (const ip of Object.keys(ipCounts)) {
    if (ipCounts[ip] >= ipThreshold) flaggedIPs.push(ip)
  }

  // Click velocity: clicks in last minute per IP
  const since = subMinutes(new Date(), 1)
  const recent = await prisma.click.findMany({ where: { createdAt: { gte: since } } })
  const velocity: Record<string, number> = {}
  for (const r of recent) {
    const ip = (r as any).ip || 'unknown'
    velocity[ip] = (velocity[ip] || 0) + 1
  }

  const velocityFlags = Object.entries(velocity).filter(([ip, v]) => v > Number(process.env.FRAUD_VELOCITY_THRESHOLD || 10)).map(([ip]) => ip)

  const allFlags = Array.from(new Set([...flaggedIPs, ...velocityFlags]))

  const riskScore = Math.min(100, allFlags.length * 10 + Math.min(50, Object.keys(ipCounts).length))

  return { riskScore, flaggedIPs: allFlags }
}

export default { analyzeFraudForUser }
