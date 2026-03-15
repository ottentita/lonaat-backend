import express from 'express'
import fs from 'fs'
import path from 'path'

const router = express.Router()
const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const SECRETS_FILE = path.join(DATA_DIR, 'postback_secrets.json')

function readSecrets(): Record<string, string> {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(SECRETS_FILE)) fs.writeFileSync(SECRETS_FILE, JSON.stringify({}), 'utf8')
    const raw = fs.readFileSync(SECRETS_FILE, 'utf8')
    return JSON.parse(raw || '{}')
  } catch (e) {
    console.error('readSecrets error', e)
    return {}
  }
}

function writeSecrets(s: Record<string, string>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(SECRETS_FILE, JSON.stringify(s, null, 2), 'utf8')
    return true
  } catch (e) {
    console.error('writeSecrets error', e)
    return false
  }
}

// List secrets (shows network names only)
router.get('/', (req, res) => {
  const s = readSecrets()
  res.json({ networks: Object.keys(s) })
})

// Set/Update a secret
router.post('/', (req, res) => {
  const { network, secret } = req.body
  if (!network || !secret) return res.status(400).json({ error: 'network and secret required' })
  const s = readSecrets()
  s[network] = String(secret)
  if (!writeSecrets(s)) return res.status(500).json({ error: 'failed to write' })
  res.json({ ok: true })
})

// Delete a secret
router.delete('/:network', (req, res) => {
  const network = req.params.network
  const s = readSecrets()
  if (!s[network]) return res.status(404).json({ error: 'not found' })
  delete s[network]
  if (!writeSecrets(s)) return res.status(500).json({ error: 'failed to write' })
  res.json({ ok: true })
})

export default router
