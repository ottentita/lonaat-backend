import { prisma } from "../prisma";

export async function activatePlan(userId: number, planId: number) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });

  if (!plan) throw new Error("Plan not found");

  const now = new Date()
  const thirtyDays = 1000 * 60 * 60 * 24 * 30

  // fetch current user to see existing subscription
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  let newExpiry: Date
  if (user.subscriptionEndsAt && user.subscriptionEndsAt > now) {
    // extend from existing expiry
    newExpiry = new Date(user.subscriptionEndsAt.getTime() + thirtyDays)
  } else {
    // fresh 30 days from now
    newExpiry = new Date(now.getTime() + thirtyDays)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      planId: plan.id,
      plan: plan.name,
      tokenBalance: plan.monthlyTokens,
      subscriptionEndsAt: newExpiry,
      subscriptions: {
        create: {
          planId: plan.id,
          status: 'active',
          expiresAt: newExpiry,
        },
      },
    },
  })

  return updated
}

export default { activatePlan }
