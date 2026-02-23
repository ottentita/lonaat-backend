import prisma from '../prisma'
import { generateToken, decodeToken } from '../utils/jwt'

async function run() {
  try {
    const email = 'titasembi@gmail.com'
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log(`User with email ${email} not found`)
      process.exit(0)
    }

    console.log('Found user:')
    console.log({ id: user.id, role: user.role, email: user.email, name: user.name })

    const pwd = (user as any).password
    const isHashed = typeof pwd === 'string' && /^\$2[aby]\$/.test(pwd)
    console.log('Password field looks hashed:', isHashed)

    const clicks = await prisma.click.count({ where: { user_id: user.id } as any })
    const comms = await prisma.commission.count({ where: { user_id: user.id } as any })
    console.log(`Counts for user id ${user.id}: clicks=${clicks}, commissions=${comms}`)

    // Generate JWT for this user (uses server secret from .env)
    const payload = { id: user.id, role: (user.role as any) || 'user', email: user.email, name: user.name }

    let token: string | null = null
    try {
      token = generateToken(payload as any)
      console.log('Generated JWT for user (first 200 chars):', token.slice(0,200))
    } catch (err: any) {
      console.error('Failed to generate token:', err.message || err)
    }

    const decoded = token ? decodeToken(token) : null
    console.log('Decoded JWT payload:', decoded)

    // Simulate /api/stats response (as route would do for this user id)
    const [totalClicks, totalCommissions, earningsAgg] = await Promise.all([
      prisma.click.count({ where: { user_id: user.id } as any }),
      prisma.commission.count({ where: { user_id: user.id } as any }),
      prisma.commission.aggregate({ where: { user_id: user.id } as any, _sum: { amount: true } })
    ])

    const totalEarnings = (earningsAgg as any)?._sum?.amount ? Number((earningsAgg as any)._sum.amount) : 0
    console.log('Simulated /api/stats response:', { totalClicks, totalCommissions, totalEarnings })
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
