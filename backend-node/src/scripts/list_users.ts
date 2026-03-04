import { prisma } from '../prisma'

async function run() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, isActive: true, name: true } , orderBy: { id: 'asc' }})
  } catch (err) {
    console.error('Error listing users:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
