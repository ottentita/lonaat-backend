import express from 'express'
import prisma from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = express.Router()

// Connect a network (user provides credentials)
router.post('/connect', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { networkId, apiKey, apiSecret, extraConfig } = req.body
    if (!networkId || !apiKey) return res.status(400).json({ error: 'networkId and apiKey required' })

    // ensure network exists
    const network = await prisma.affiliateNetwork.findUnique({ where: { id: Number(networkId) } })
    if (!network) return res.status(404).json({ error: 'Network not found' })

    // encrypt keys before storing
    const { encrypt } = await import('../utils/crypto')
    const encKey = apiKey ? encrypt(String(apiKey)) : undefined
    const encSecret = apiSecret ? encrypt(String(apiSecret)) : undefined

    const data: any = { userId: req.user!.id, networkId: Number(networkId), extraConfig }
    if (encKey) {
      data.apiKeyEncrypted = encKey.ciphertext
      data.apiKeyIv = encKey.iv
      data.apiKeyTag = encKey.tag
    }
    if (encSecret) {
      data.apiSecretEncrypted = encSecret.ciphertext
      data.apiSecretIv = encSecret.iv
      data.apiSecretTag = encSecret.tag
    }

    const cred = await prisma.userNetworkCredential.upsert({
      where: { userId_networkId: { userId: Number(req.user!.id), networkId: Number(networkId) } },
      update: data,
      create: data
    })

    // Do not return decrypted secrets
    const safe = { ...cred }
    delete (safe as any).apiKeyEncrypted
    delete (safe as any).apiKeyIv
    delete (safe as any).apiKeyTag
    delete (safe as any).apiSecretEncrypted
    delete (safe as any).apiSecretIv
    delete (safe as any).apiSecretTag

    res.json({ ok: true, credential: safe })
  } catch (e) {
    console.error('Connect network error', e)
    res.status(500).json({ error: 'failed' })
  }
})

router.post('/:networkId/import', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const networkId = Number(req.params.networkId)
    const { importOffersForUser } = await import('../services/offerImport.service')
    const result = await importOffersForUser(req.user!.id, networkId)
    res.json(result)
  } catch (e) {
    console.error('Import error', e)
    res.status(500).json({ error: 'failed' })
  }
})

export default router
