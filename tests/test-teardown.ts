import fs from 'fs'
import path from 'path'

export default async function teardown() {
  try {
    const dbPath = path.resolve(__dirname, '../test.db')
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  } catch (e) {
    // ignore
    console.warn('teardown error', e)
  }
}
