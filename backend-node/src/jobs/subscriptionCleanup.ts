import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function runSubscriptionCleanup() {
  const now = new Date()
  try {
    // expire trials
    const expiredTrials = await prisma.user.updateMany({
      where: {
        trialEndsAt: { lte: now },
        plan: { not: 'free' },
      },
      data: {
        plan: 'expired',
        tokenBalance: 0,
      },
    })

    // expire subscriptions
    const expiredSubscriptions = await prisma.user.updateMany({
      where: {
        subscriptionEndsAt: { lte: now },
        plan: { not: 'free' },
      },
      data: {
        plan: 'expired',
        tokenBalance: 0,
      },
    })

    return { expiredTrials: expiredTrials.count, expiredSubscriptions: expiredSubscriptions.count }
  } catch (error) {
    console.error('Subscription cleanup failed:', error)
    throw error
  }
}

export function startSubscriptionCleanup(intervalMs = 24 * 60 * 60 * 1000) {
  // run once at startup
  runSubscriptionCleanup().catch(() => {})
  // schedule periodic cleanup
  setInterval(() => runSubscriptionCleanup().catch(() => {}), intervalMs)
}

export default startSubscriptionCleanup
