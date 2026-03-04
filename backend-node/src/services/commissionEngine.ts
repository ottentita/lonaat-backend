import prisma from '../prisma'

const PLATFORM_MARGIN = Number(process.env.PLATFORM_MARGIN ?? 0.2)

export async function processConversionSplit(conversionId: number, prismaClientParam?: any) {
  const db = prismaClientParam || prisma
  const conv = await db.conversion.findUnique({ where: { id: conversionId }, include: { click: true, offer: true } })
  if (!conv) throw new Error('conversion not found')
  const click = conv.click
  const offer = conv.offer

  // Try to determine numeric amount; fall back to 0
  const amountNum = Number(conv.amount ?? conv.revenue ?? 0)
  if (!amountNum || amountNum <= 0) return null

  const platformShare = Number((amountNum * PLATFORM_MARGIN))
  const userShare = Number(amountNum - platformShare)

  // If caller provided a transaction client, use it for atomic writes without starting a new transaction
  if (prismaClientParam) {
    let commissionRecord = null
    const clickIdVal = click?.id ?? null
    const userId = (click as any)?.user_id ?? (click as any)?.userId ?? null

    if (userId) {
      commissionRecord = await db.commission.create({
        data: {
          user_id: userId,
          click_id: clickIdVal ?? undefined,
          amount: userShare,
          status: 'paid',
          network: offer?.network ?? undefined,
          product_id: offer?.id ?? undefined,
        }
      })

      await db.transactionLedger.create({
        data: {
          userId,
          amount: Math.round(userShare),
          type: 'credit',
          reason: `Commission for conversion ${conv.id}`,
        }
      })
    }

    const plat = await db.platformRevenue.create({
      data: {
        conversionId: conv.id,
        offerId: conv.offerId,
        userId: userId ?? undefined,
        amount: amountNum,
        platformShare: platformShare,
        userShare: userShare,
      }
    })

    return { commission: commissionRecord, platformRevenue: plat }
  }

  // Otherwise, perform operations inside a new transaction
  return prisma.$transaction(async (tx) => {
    let commissionRecord = null

    const clickIdVal = click?.id ?? null
    const userId = (click as any)?.user_id ?? (click as any)?.userId ?? null

    if (userId) {
      commissionRecord = await tx.commission.create({
        data: {
          user_id: userId,
          click_id: clickIdVal ?? undefined,
          amount: userShare,
          status: 'paid',
          network: offer?.network ?? undefined,
          product_id: offer?.id ?? undefined,
        }
      })

      await tx.transactionLedger.create({
        data: {
          userId,
          amount: Math.round(userShare),
          type: 'credit',
          reason: `Commission for conversion ${conv.id}`,
        }
      })
    }

    const plat = await tx.platformRevenue.create({
      data: {
        conversionId: conv.id,
        offerId: conv.offerId,
        userId: userId ?? undefined,
        amount: amountNum,
        platformShare: platformShare,
        userShare: userShare,
      }
    })

    return { commission: commissionRecord, platformRevenue: plat }
  })
}
