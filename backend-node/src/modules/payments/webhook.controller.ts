import { Request, Response } from 'express'
import { prisma } from '../../prisma'
import { AppError } from '../../errors/AppError'
import { activateSubscriptionTx } from '../ads/subscription.service'

// placeholder signature verifier
function verifySignature(req: Request): boolean {
  // TODO: implement provider-specific verification logic
  // inspect headers/body to compute HMAC, compare with secret
  return true
}

export async function handlePaymentWebhook(req: Request, res: Response) {
  try {
    // simple JSON body expected: { provider, providerRef, userId, planId }
    const { provider, providerRef, userId, planId } = req.body as any

    if (!verifySignature(req)) {
      throw new AppError('Invalid signature', 403)
    }

    if (!provider || !providerRef || !userId || !planId) {
      // Return express-validator style errors to satisfy tests expecting `errors`
      return res.status(400).json({ errors: [{ msg: 'provider, providerRef, userId and planId required' }] })
    }

    await prisma.$transaction(async (tx: any) => {
      const existing = await tx.paymentEvent.findUnique({ where: { providerRef } })
      if (existing) {
        // idempotent: nothing to do
        return
      }

      await tx.paymentEvent.create({
        data: {
          provider,
          providerRef,
          userId: String(userId)
        }
      })

      // activate subscription and mint tokens inside same transaction
      await activateSubscriptionTx(tx, Number(userId), Number(planId))
    })

    res.json({ status: 'ok' })
  } catch (err: any) {
    console.error('payment webhook error', err)
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message })
    }
    res.status(500).json({ error: 'processing failed' })
  }
}
