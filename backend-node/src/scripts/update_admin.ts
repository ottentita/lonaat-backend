import { prisma } from '../prisma'
import bcrypt from 'bcryptjs'
import { generateToken, decodeToken } from '../utils/jwt'

async function run() {
  try {
    const targetId = 5
    const newEmail = 'titasembi@gmail.com'
    const rawPassword = 'Far@el11'

    const user = await prisma.user.findUnique({ where: { id: targetId } })
    if (!user) {
      console.error(`User id=${targetId} not found`)
      process.exit(1)
    }

    

    const hashed = await bcrypt.hash(rawPassword, 10)

    const updated = await prisma.user.update({ where: { id: targetId }, data: { email: newEmail, password: hashed } })

    

    // Confirm password is hashed (don't print hash)
    const stored = await prisma.user.findUnique({ where: { id: targetId } })
    const storedPwd: any = (stored as any).password
    const looksHashed = typeof storedPwd === 'string' && /^\$2[aby]\$/.test(storedPwd)
    

    // Simulate login: compare password and generate token
    const valid = await bcrypt.compare(rawPassword, storedPwd)
    

    if (valid) {
      const token = generateToken({ id: updated.id, role: (updated.role as any) || 'user', email: updated.email, name: updated.name } as any)
      const decoded = decodeToken(token)
    }
  } catch (err) {
    console.error('Error updating admin:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
