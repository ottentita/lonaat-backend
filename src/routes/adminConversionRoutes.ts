import { Router } from 'express'
import { prisma } from '../prisma'

const router = Router()

// Approve conversion
router.post('/conversions/:id/approve', async (req, res) => {
  try {
    const conversionId = Number(req.params.id);
    if (isNaN(conversionId)) {
      return res.status(400).json({ error: 'Invalid conversion ID' });
    }

    const conversion = await prisma.conversion.findUnique({ where: { id: conversionId } })

    if (!conversion) {
      return res.status(404).json({ message: 'Conversion not found' })
    }

    if (conversion.status === 'approved') {
      return res.status(400).json({ message: 'Already approved' })
    }

    // Update conversion status
    await prisma.conversion.update({ where: { id: conversionId }, data: { status: 'approved' } })

    const amount = Number(conversion.commissionAmount || 0)

    // Update user balances (uses snake_case fields as in Prisma schema)
    await prisma.user.update({
      where: { id: conversion.userId },
      data: {
        pending_earnings: { decrement: amount },
        withdrawable_balance: { increment: amount },
        balance: { increment: amount }
      } as any
    })

    return res.json({ message: 'Conversion approved successfully' })
  } catch (err) {
    console.error('Approve conversion error', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
