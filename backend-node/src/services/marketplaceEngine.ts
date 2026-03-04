import prisma from '../prisma'

const LISTING_FEE_TOKENS = Number(process.env.LISTING_FEE_TOKENS ?? 10)
const PLATFORM_RATE = Number(process.env.MARKETPLACE_PLATFORM_RATE ?? 0.10)

export async function createMarketplaceProduct(userId: number, productData: any) {
  return prisma.$transaction(async (tx) => {
    // Check token wallet
    const wallet = await tx.adTokenWallet.findUnique({ where: { userId } })
    const balance = wallet ? Number(wallet.balance) : 0
    if (balance < LISTING_FEE_TOKENS) throw new Error('Insufficient tokens for listing fee')

    // Deduct tokens and create ledger entry
    await tx.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: LISTING_FEE_TOKENS } as any } })

    await tx.transactionLedger.create({
      data: {
        userId,
        amount: LISTING_FEE_TOKENS,
        type: 'debit',
        reason: 'listing_fee',
      }
    })

    // Create product as marketplace type
    const created = await tx.product.create({ data: { ...productData, user_id: userId, type: 'marketplace', ownerId: userId } })
    return created
  })
}

export async function processMarketplaceSale(productId: number, buyerInfo: string, saleAmount: number) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } })
    if (!product) throw new Error('Product not found')
    if (product.type !== 'marketplace') throw new Error('Product is not a marketplace item')

    const commission = Number((saleAmount * PLATFORM_RATE).toFixed(2))
    const sellerShare = Number((saleAmount - commission).toFixed(2))

    // create marketplace sale record
    const sale = await tx.marketplaceSale.create({ data: { productId, buyerInfo, saleAmount, commission } as any })

    // credit seller ledger (credit)
    if (product.ownerId) {
      await tx.transactionLedger.create({ data: { userId: product.ownerId, amount: Math.round(sellerShare), type: 'credit', reason: `marketplace sale ${sale.id}` } })
    }

    // record platform revenue
    await tx.platformRevenue.create({ data: { conversionId: null, offerId: null, userId: product.ownerId ?? undefined, amount: saleAmount, platformShare: commission, userShare: sellerShare } as any })

    return sale
  })
}
