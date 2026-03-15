const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing test tables: affiliateEvent, conversion, click, offer, user...')
  try {
    // delete in dependency order
    if (prisma.affiliateEvent) {
      await prisma.affiliateEvent.deleteMany()
    }
  } catch (e) {
    // ignore
  }
  try { await prisma.conversion.deleteMany() } catch (e) {}
  try { await prisma.click.deleteMany() } catch (e) {}
  try { await prisma.offer.deleteMany() } catch (e) {}
  // delete subscriptions and related financial/marketplace tables before plans
  try { await prisma.conversion.deleteMany() } catch (e) {}
  try { await prisma.commission.deleteMany() } catch (e) {}
  try { await prisma.transactionLedger.deleteMany() } catch (e) {}
  try { await prisma.platformRevenue.deleteMany() } catch (e) {}
  try { await prisma.subscription.deleteMany() } catch (e) {}
  try { await prisma.plan.deleteMany() } catch (e) {}
  try { await prisma.adTokenWallet.deleteMany() } catch (e) {}
  try { await prisma.marketplaceItem.deleteMany() } catch (e) {}
  try { await prisma.user.deleteMany() } catch (e) {}
  console.log('Cleared test tables')
  try {
    // ensure reserved offer id 0 exists to satisfy tests that create clicks with offerId=0
    // keep the INSERT minimal to avoid column name mapping issues
    await prisma.$executeRawUnsafe(`INSERT INTO offers (id, title, slug, network) VALUES (0, 'reserved-offer-0', 'reserved-offer-0', 'digistore24') ON CONFLICT (id) DO NOTHING`)
    const found = await prisma.offer.findUnique({ where: { id: 0 } })
    if (found) console.log('Ensured reserved offer id 0 exists')
    else console.warn('Failed to ensure reserved offer id 0 (offer.findUnique returned null)')
  } catch (e) {
    console.error('Error ensuring reserved offer id 0 exists:', e && e.message ? e.message : e)
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
