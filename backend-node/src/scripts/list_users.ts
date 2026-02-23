import prisma from '../prisma'

async function run() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, isActive: true, name: true } , orderBy: { id: 'asc' }})
    console.log('Users:')
    users.forEach(u => console.log(`- id=${u.id} email=${u.email} role=${u.role} isActive=${u.isActive} name=${u.name}`))
  } catch (err) {
    console.error('Error listing users:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
