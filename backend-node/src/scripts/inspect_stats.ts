import prisma from '../prisma'

async function run() {
  try {
    const devUserId = 1
    console.log('UserId to check (dev):', devUserId)

    const clicksForDev = await prisma.click.count({ where: { user_id: devUserId } as any })
    const commsForDev = await prisma.commission.count({ where: { user_id: devUserId } as any })
    console.log(`Counts for user ${devUserId}: clicks=${clicksForDev}, commissions=${commsForDev}`)

    // Find distinct user_ids present in clicks and commissions
    const clickUsers = await prisma.click.findMany({ select: { user_id: true } })
    const commissionUsers = await prisma.commission.findMany({ select: { user_id: true } })

    const clickUserIds = Array.from(new Set(clickUsers.map(c => c.user_id))) as number[]
    const commissionUserIds = Array.from(new Set(commissionUsers.map(c => c.user_id))) as number[]

    console.log('Distinct user_ids with clicks:', clickUserIds)
    console.log('Distinct user_ids with commissions:', commissionUserIds)

    // Distribution: clicks per user_id
    const clicksByUser = await prisma.click.groupBy({ by: ['user_id'] as any, _count: { _all: true } as any })
    console.log('Clicks per user (top 20):')
    ;(clicksByUser as any).slice(0,20).forEach((r: any) => console.log(` user_id=${r.user_id} count=${r._count._all}`))

    // Also show commissions per user (top 20)
    const commsByUser = await prisma.commission.groupBy({ by: ['user_id'] as any, _count: { _all: true } as any })
    console.log('Commissions per user (top 20):')
    ;(commsByUser as any).slice(0,20).forEach((r: any) => console.log(` user_id=${r.user_id} count=${r._count._all}`))

  } catch (err) {
    console.error('Inspect error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
