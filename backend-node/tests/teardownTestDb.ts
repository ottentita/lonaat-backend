import { execSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'

export default async function teardown() {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') })
  const cwd = path.resolve(__dirname, '..')

  try {
    console.log('Resetting test database schema')
    // Reset database by running migrate reset non-interactively
    execSync('npx prisma migrate reset --force --schema=prisma/schema.test.prisma', { stdio: 'inherit', cwd, env: { ...process.env } })
  } catch (e) {
    console.warn('Failed to reset test DB:', e)
  }
}
