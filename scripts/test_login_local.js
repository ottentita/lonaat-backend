const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

;(async function(){
  const prisma = new PrismaClient()
  try {
    const email = 'admin@lonaat.com'
    const password = 'Admin123!'
    const user = await prisma.user.findUnique({ where: { email } })
    console.log('user', !!user)
    if(!user) return process.exit(2)
    console.log('stored password length', (user.password||'').length)
    const ok = await bcrypt.compare(password, user.password)
    console.log('bcrypt compare ok', ok)
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' })
    console.log('token length', token.length)
  } catch (e) {
    console.error('ERROR', e)
    process.exit(1)
  } finally { await prisma.$disconnect() }
})()
