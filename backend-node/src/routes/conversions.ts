import express from 'express'
import { prisma } from '../prisma'

const router = express.Router()

// production-ready conversion tracking endpoint
import { validate } from '../middleware/validation'
import { conversionSchema } from '../schemas/requestSchemas'

router.post('/track', validate(conversionSchema, 'body'), async (req, res) => {
  try {
    const { clickToken, revenue } = req.body as { clickToken?: string; revenue?: number }

    if (!clickToken) {
      return res.status(400).json({ error: 'clickToken required' })
    }
    if (typeof revenue !== 'number') {
      return res.status(400).json({ error: 'revenue required and must be a number' })
    }

    await prisma.$transaction(async (tx: any) => {
      // ensure click exists for token
      const click = await tx.click.findUnique({ where: { clickToken } })
      if (!click) {
        // will be caught below
        throw new Error('CLICK_NOT_FOUND')
      }

      // prevent duplicates explicitly (unique constraint helps too)
      const existing = await tx.conversion.findUnique({ where: { clickToken } })
      if (existing) {
        throw new Error('DUPLICATE')
      }

      await tx.conversion.create({
        data: {
          clickToken,
          clickId: click.clickId,
          offerId: click.offerId,
          revenue,
          status: 'pending',
        }
      })
    })

    res.json({ ok: true })
  } catch (err: any) {
    console.error('Conversion track error:', err)
    if (err.message === 'CLICK_NOT_FOUND') {
      return res.status(404).json({ error: 'Click not found' })
    }
    if (err.message === 'DUPLICATE' || err.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate conversion' })
    }
    res.status(500).json({ error: 'Failed to record conversion' })
  }
})

export default router
