import prisma from '../prisma'
import { PLAN_CONFIG } from '../config/planConfig'

export async function applyMonthlyRollover() {
  const accounts = await prisma.tokenAccount.findMany()

  for (const acc of accounts) {
    const allocation = PLAN_CONFIG[acc.planType]?.monthlyTokens || 0

    const newBalance = Math.min(
      acc.balance + allocation,
      acc.rolloverCap
    )

    await prisma.tokenAccount.update({
      where: { id: acc.id },
      data: { balance: newBalance }
    })

    await prisma.tokenLedger.create({
      data: {
        userId: acc.userId,
        type: "MINT",
        amount: allocation,
        status: "COMPLETED"
      }
    })
  }
}
