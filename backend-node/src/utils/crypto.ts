import crypto from 'crypto'

const SECRET = process.env.NETWORK_CREDENTIAL_SECRET
if (!SECRET) {
  // Fail fast — caller expects app to not start without this secret
  throw new Error('NETWORK_CREDENTIAL_SECRET is not set')
}

const KEY = crypto.createHash('sha256').update(String(SECRET)).digest()

export type EncryptedPayload = {
  ciphertext: string
  iv: string
  tag: string
}

export function encrypt(text: string): EncryptedPayload {
  const iv = crypto.randomBytes(12) // recommended 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') }
}

export function decrypt(payload: EncryptedPayload): string {
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()])
  return decrypted.toString('utf8')
}
