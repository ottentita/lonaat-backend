import { Router } from "express";
import { reserveTokens, finalizeTokens, releaseTokens } from "../services/tokenService";
import { authMiddleware } from "../middleware/auth";
import { prisma } from "../prisma";

const router = Router();

router.post("/internal/test-token-flow", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const testAmount = 5;

    // Reserve
    await reserveTokens(userId, testAmount, "TEST_FLOW");

    // Finalize
    await finalizeTokens(userId, testAmount, "TEST_FLOW");

    // Reserve again
    await reserveTokens(userId, testAmount, "TEST_RELEASE");

    // Release
    await releaseTokens(userId, testAmount, "TEST_RELEASE");

    // Report account state using TokenAccount if available; otherwise fall back to user.tokenBalance
    if ((prisma as any).tokenAccount) {
      const account = await prisma.tokenAccount.findUnique({ where: { userId } })
      return res.json({ message: 'Token flow test completed', balance: account?.balance, reserved: account?.reservedBalance })
    }

    const user = await prisma.user.findUnique({ where: { id: Number(userId) } as any })
    return res.json({ message: 'Token flow test completed', balance: user ? Number((user as any).tokenBalance || 0) : null, reserved: 0 })

  } catch (error: any) {
    return res.status(500).json({
      message: "Token flow test failed",
      error: error.message
    });
  }
});

// Test endpoint: simulate failure after reserve inside one transaction (should rollback)
router.post('/internal/test-token-flow-rollback', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id
    const testAmount = 5

    // Perform reserve inside single transaction then throw to force rollback
    await prisma.$transaction(async (tx: any) => {
      const account = await tx.tokenAccount.findUnique({ where: { userId } })
      if (!account) throw new Error('Token account not found')

      const available = account.balance - account.reservedBalance
      if (available + account.overdraftLimit < testAmount) throw new Error('Insufficient tokens')

      await tx.tokenAccount.update({ where: { userId }, data: { reservedBalance: { increment: testAmount } } })
      await tx.tokenLedger.create({ data: { userId, type: 'RESERVE', amount: testAmount, feature: 'ROLLBACK_TEST', status: 'PENDING' } })

      // simulate failure
      throw new Error('Simulated failure after reserve')
    })

    return res.status(500).json({ message: 'Unexpected success' })
  } catch (error: any) {
    // After rollback, return current account state
    const account = await prisma.tokenAccount.findUnique({ where: { userId: req.user.id } })
    return res.status(200).json({ message: 'Rollback simulated', balance: account?.balance, reserved: account?.reservedBalance })
  }
})

export default router;
