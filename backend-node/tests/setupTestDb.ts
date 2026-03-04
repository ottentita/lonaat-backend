import { execSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'
import { Client } from 'pg'

async function waitForPostgres(uri: string, maxAttempts = 30, intervalMs = 1000) {
  let attempts = 0
  while (attempts < maxAttempts) {
    attempts++
    try {
      const client = new Client({ connectionString: uri })
      await client.connect()
      await client.end()
      console.log(`Postgres is available (after ${attempts} attempt${attempts === 1 ? '' : 's'})`)
      return true
    } catch (e) {
      console.log(`Postgres not ready yet (attempt ${attempts}/${maxAttempts}) - retrying in ${intervalMs}ms`)
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
  return false
}

export default async function setup() {
  // load test env (.env.test)
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') })

  const cwd = path.resolve(__dirname, '..')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL is not set in .env.test')

  console.log('Waiting for Postgres at', dbUrl)
  const ok = await waitForPostgres(dbUrl, 30, 1000)
  if (!ok) {
    throw new Error('Postgres did not become ready within 30 seconds')
  }

  console.log('Running Prisma migrate deploy against', dbUrl)
  // Deploy migrations to the test Postgres DB (requires DB to be up)
  execSync('npx prisma migrate deploy --schema=prisma/schema.test.prisma', { stdio: 'inherit', cwd, env: { ...process.env } })

  // Run test seed if present
  try {
    execSync('node prisma/seed.test.js', { stdio: 'inherit', cwd, env: { ...process.env } })
  } catch (e) {
    console.warn('No test seed or seed failed:', e)
  }
}
