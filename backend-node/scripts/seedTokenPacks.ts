import prismaClient from '../src/prisma'

async function seed() {
  const prisma = prismaClient.default || prismaClient

  const packs = [
    { name: 'Starter', tokenAmount: 1000, priceUSD: 5 },
    { name: 'Growth', tokenAmount: 5000, priceUSD: 20 },
    { name: 'Pro', tokenAmount: 15000, priceUSD: 50 },
  ]

  for (const p of packs) {
    try {
      await (prisma as any).tokenPack.upsert({
        where: { name: p.name },
        update: { tokenAmount: p.tokenAmount, priceUSD: p.priceUSD },
        create: { name: p.name, tokenAmount: p.tokenAmount, priceUSD: p.priceUSD }
      })
      console.log('Upserted', p.name)
    } catch (err) {
      console.error('Failed to upsert token pack', p.name, err)
    }
  }

  process.exit(0)
}

seed()
