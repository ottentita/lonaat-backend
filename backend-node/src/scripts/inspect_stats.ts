import { prisma } from '../prisma'

async function run() {
  try {
    const devUserId = 1
    const clicksForDev = await prisma.click.count({ where: { user_id: devUserId } as any })
    const commsForDev = await prisma.commission.count({ where: { user_id: devUserId } as any })

    // Find distinct user_ids present in clicks and commissions
    const clickUsers = await prisma.click.findMany({ select: { user_id: true } })
    const commissionUsers = await prisma.commission.findMany({ select: { user_id: true } })

    const clickUserIds = Array.from(new Set(clickUsers.map(c => c.user_id))) as number[]
    const commissionUserIds = Array.from(new Set(commissionUsers.map(c => c.user_id))) as number[]

    

    // Distribution: clicks per user_id
    const clicksByUser = await prisma.click.groupBy({ by: ['user_id'] as any, _count: { _all: true } as any })
    ;(clicksByUser as any).slice(0,20).forEach((r: any) => {})

    // Also show commissions per user (top 20)
    const commsByUser = await prisma.commission.groupBy({ by: ['user_id'] as any, _count: { _all: true } as any })
    ;(commsByUser as any).slice(0,20).forEach((r: any) => {})

  } catch (err) {
    console.error('Inspect error:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
