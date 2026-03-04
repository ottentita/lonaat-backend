import prisma from '../../prisma'
import tokenWallet from './tokenWallet.service'

/**
 * Activate subscription when payment is confirmed.
 * Creates Subscription, credits tokens, and logs transaction — all in a Prisma transaction.
 */
// internal helper that operates within an existing Prisma transaction
export async function activateSubscriptionTx(
  tx: any,
  userId: number,
  planId: number,
  months = 1
) {
  const plan = await tx.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + months)

  const subscription = await tx.subscription.create({ data: { userId, planId, expiresAt } })

  const tokensToCredit = Number(plan.monthlyTokens || 0) * months

  // Credit tokens using transactional helper
  const newBalance = await tokenWallet.creditTokensTransactional(
    tx,
    userId,
    tokensToCredit,
    `subscription:${subscription.id}`
  )

  return { subscription, newBalance }
}

// externally exposed version that starts its own transaction
export async function activateSubscription(userId: number, planId: number, months = 1) {
  return prisma.$transaction((tx) => activateSubscriptionTx(tx, userId, planId, months))
}

export default { activateSubscription }
