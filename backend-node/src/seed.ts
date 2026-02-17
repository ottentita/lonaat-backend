import prisma from './prisma'

async function seed() {
  console.log('Seeding sample offers...')

  const offers = [
    {
      title: 'Amazing Gadget Offer',
      description: 'High converting gadget offer',
      url: 'https://example.com/gadget',
      payout: 3.5,
      network: 'ExampleNet',
      externalOfferId: 'EXT-GADGET-001',
      networkName: 'ExampleNet',
      trackingUrl: 'https://track.example.com/clk?offer=EXT-GADGET-001'
    },
    {
      title: 'Cool App Signup',
      description: 'Mobile app trial signup',
      url: 'https://example.com/app',
      payout: 1.2,
      network: 'AppNet',
      externalOfferId: 'EXT-APP-001',
      networkName: 'AppNet',
      trackingUrl: 'https://track.appnet.com/clk?offer=EXT-APP-001'
    },
    {
      title: 'Subscription Box',
      description: 'Monthly box subscription',
      url: 'https://example.com/box',
      payout: 5.0,
      network: 'BoxNet',
      externalOfferId: 'EXT-BOX-001',
      networkName: 'BoxNet',
      trackingUrl: 'https://track.boxnet.com/clk?offer=EXT-BOX-001'
    }
  ]

  for (const o of offers) {
    const exists = await prisma.offer.findFirst({ where: { title: o.title } })
    if (!exists) {
      await prisma.offer.create({ data: o as any })
      console.log('Created offer:', o.title)
    } else {
      // If offer exists, ensure important external fields are present - update if missing
      const toUpdate: any = {}
      if (!exists.externalOfferId && o.externalOfferId) toUpdate.externalOfferId = o.externalOfferId
      if (!exists.networkName && o.networkName) toUpdate.networkName = o.networkName
      if (!exists.trackingUrl && o.trackingUrl) toUpdate.trackingUrl = o.trackingUrl

      if (Object.keys(toUpdate).length > 0) {
        await prisma.offer.update({ where: { id: exists.id }, data: toUpdate })
        console.log('Updated offer with external fields:', o.title)
      } else {
        console.log('Offer already exists:', o.title)
      }
    }
  }

  console.log('Seeding done')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
