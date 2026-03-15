import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDB() {
  try {
    // Get the click count
    const clickCount = await prisma.click.count()
    console.log(`\n✅ Total clicks in database: ${clickCount}`)

    // Get recent clicks
    const recentClicks = await prisma.click.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { offer: { select: { name: true, slug: true } } },
    })

    console.log('\n📊 Recent clicks:')
    recentClicks.forEach((click, i) => {
      console.log(
        `  ${i + 1}. Offer: ${click.offer?.name || 'N/A'}, IP: ${click.ip}, Created: ${click.createdAt}`
      )
    })

    // Get offer count
    const offerCount = await prisma.offer.count()
    console.log(`\n✅ Total offers in database: ${offerCount}`)

    // List all offers with their click counts
    const offers = await prisma.offer.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { clicks: true } } },
      take: 5,
    })

    console.log('\n📊 Top offers by clicks:')
    offers.forEach((offer) => {
      console.log(`  - ${offer.name} (${offer.slug}): ${offer._count.clicks} clicks`)
    })

    console.log('\n✅ Database verification complete!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDB()
