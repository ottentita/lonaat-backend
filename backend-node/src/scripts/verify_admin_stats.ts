import { prisma } from '../prisma'
import { generateToken, decodeToken } from '../utils/jwt'

async function run() {
  try {
    const email = 'titasembi@gmail.com'
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      process.exit(0)
    }

    const pwd = (user as any).password
    const isHashed = typeof pwd === 'string' && /^\$2[aby]\$/.test(pwd)
    

    const clicks = await prisma.click.count({ where: { user_id: user.id } as any })
    const comms = await prisma.commission.count({ where: { user_id: user.id } as any })
    

    // Generate JWT for this user (uses server secret from .env)
    const payload = { id: user.id, role: (user.role as any) || 'user', email: user.email, name: user.name }

    let token: string | null = null
    try {
      token = generateToken(payload as any)
    } catch (err: any) {
      console.error('Failed to generate token:', err.message || err)
    }

    const decoded = token ? decodeToken(token) : null
    

    // Simulate /api/stats response (as route would do for this user id)
    const [totalClicks, totalCommissions, earningsAgg] = await Promise.all([
      prisma.click.count({ where: { user_id: user.id } as any }),
      prisma.commission.count({ where: { user_id: user.id } as any }),
      prisma.commission.aggregate({ where: { user_id: user.id } as any, _sum: { amount: true } })
    ])

    const totalEarnings = (earningsAgg as any)?._sum?.amount ? Number((earningsAgg as any)._sum.amount) : 0
    
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
