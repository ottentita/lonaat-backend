import prisma from '../prisma'

async function run() {
  try {
    const userId = 1
    const [totalClicks, totalCommissions, earningsAgg] = await Promise.all([
      prisma.click.count({ where: { user_id: userId } as any }),
      prisma.commission.count({ where: { user_id: userId } as any }),
      prisma.commission.aggregate({ where: { user_id: userId } as any, _sum: { amount: true } })
    ])

    const totalEarnings = earningsAgg._sum.amount ? Number(earningsAgg._sum.amount) : 0

    console.log(JSON.stringify({ totalClicks: totalClicks || 0, totalCommissions: totalCommissions || 0, totalEarnings }))
  } catch (err) {
    console.error('Failed to compute stats:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
