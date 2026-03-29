import { prisma } from '../prisma'

export async function runSubscriptionCleanup() {
  try {
    // trialEndsAt / subscriptionEndsAt fields not in current schema — skip cleanup
    console.log('Subscription cleanup: skipped (fields not in schema)')
    return { expiredTrials: 0, expiredSubscriptions: 0 }
  } catch (error: any) {
    console.warn('Subscription cleanup skipped:', error.message)
    return { expiredTrials: 0, expiredSubscriptions: 0 }
  }
}

export function startSubscriptionCleanup(intervalMs = 24 * 60 * 60 * 1000) {
  // run once at startup
  runSubscriptionCleanup().catch(() => {})
  // schedule periodic cleanup
  setInterval(() => runSubscriptionCleanup().catch(() => {}), intervalMs)
}

export default startSubscriptionCleanup
