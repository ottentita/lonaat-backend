import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

export default async function setup() {
  // load test env
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') })

  const cwd = path.resolve(__dirname, '..')

  // generate prisma client for test schema
  execSync('npx prisma generate --schema=prisma/schema.test.prisma', { stdio: 'inherit', cwd })

  // ensure test DB is removed so migrations can be applied cleanly
  const candidates = [path.resolve(cwd, 'test.db'), path.resolve(cwd, 'prisma', 'test.db')]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        console.log('Removing existing test DB:', p)
        fs.unlinkSync(p)
      }
      // also remove WAL/SHM if present
      if (fs.existsSync(p + '-wal')) fs.unlinkSync(p + '-wal')
      if (fs.existsSync(p + '-shm')) fs.unlinkSync(p + '-shm')
    } catch (e) {
      console.warn('Could not remove test DB file', p, e)
    }
  }

  // sync schema to test database (no migration history required)
  execSync('npx prisma db push --schema=prisma/schema.test.prisma --force-reset', { stdio: 'inherit', cwd })

  // run minimal test seed
  execSync('node prisma/seed.test.js', { stdio: 'inherit', cwd })
}
