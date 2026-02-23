import prisma from '../prisma'
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

    console.log('Before update (id, email, role):', { id: user.id, email: user.email, role: user.role })

    const hashed = await bcrypt.hash(rawPassword, 10)

    const updated = await prisma.user.update({ where: { id: targetId }, data: { email: newEmail, password: hashed } })

    console.log('Updated user (id, email, role):', { id: updated.id, email: updated.email, role: updated.role })

    // Confirm password is hashed (don't print hash)
    const stored = await prisma.user.findUnique({ where: { id: targetId } })
    const storedPwd: any = (stored as any).password
    const looksHashed = typeof storedPwd === 'string' && /^\$2[aby]\$/.test(storedPwd)
    console.log('Password stored hashed:', looksHashed)

    // Simulate login: compare password and generate token
    const valid = await bcrypt.compare(rawPassword, storedPwd)
    console.log('Password compare with raw password:', valid)

    if (valid) {
      const token = generateToken({ id: updated.id, role: (updated.role as any) || 'user', email: updated.email, name: updated.name } as any)
      const decoded = decodeToken(token)
      console.log('Generated token (first 200 chars):', token.slice(0,200))
      console.log('Decoded token payload:', decoded)
    }
  } catch (err) {
    console.error('Error updating admin:', err)
  } finally {
    await prisma.$disconnect()
  }
}

run()
