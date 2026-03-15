import { describe, it, expect } from 'vitest'
import prisma from '../src/prisma'

describe('Commission engine atomicity', () => {
  it('rolls back all writes when an error is thrown mid-transaction', async () => {
    // create user, offer, click, conversion
    const user = await prisma.user.create({ data: { name: 'Atomic Test', email: `atomic+${Date.now()}@local`, password: 'x', role: 'USER', balance: 0 } })
    const atomicSlug = `atomic-offer-${Date.now()}`
    const offer = await prisma.offer.create({ data: { title: 'Atomic Offer', name: 'Atomic Offer', slug: atomicSlug, url: 'https://example.test/atomic', payout: 10, sellerId: user.id } })
    const click = await prisma.click.create({ data: { offerId: offer.id, adId: offer.id, userId: user.id, timeBucket: 1, clickId: `atomic_click_${Date.now()}`, clickToken: `atomic_token_${Date.now()}` } })
    const conv = await prisma.conversion.create({ data: { offerId: offer.id, clickId: click.clickId, clickToken: click.clickToken, amount: 100 } })

    // load commission engine
    const mod = await import('../src/services/commissionEngine')
    const { processConversionSplit } = mod

    // monkeypatch prisma.$transaction to inject failure on platformRevenue.create
    const originalTx = prisma.$transaction.bind(prisma)
    prisma.$transaction = async (cb: any) => {
      return originalTx(async (tx: any) => {
        const txProxy = Object.create(tx)
        // forward everything except platformRevenue.create which will throw
        txProxy.platformRevenue = {
          create: async () => {
            throw new Error('Injected failure for test')
          }
        }
        return cb(txProxy)
      })
    }

    let threw = false
    try {
      await processConversionSplit(conv.id)
    } catch (e: any) {
      threw = true
      expect(String(e.message)).toMatch(/Injected failure/)
    }
    expect(threw).toBe(true)

    // restore original transaction
    prisma.$transaction = originalTx

    // Assert no Commission created for this click
    const comm = await prisma.commission.findFirst({ where: { click_id: click.id } })
    expect(comm).toBeNull()

    // Assert no TransactionLedger entry for this user referencing the conversion
    const ledger = await prisma.transactionLedger.findFirst({ where: { userId: user.id, reason: { contains: `conversion ${conv.id}` } } })
    expect(ledger).toBeNull()

    // Assert no PlatformRevenue row exists for this conversion
    const plat = await prisma.platformRevenue.findFirst({ where: { conversionId: conv.id } })
    expect(plat).toBeNull()
  }, 20000)
})
