import { Router } from "express";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/me/token-balance", authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // If TokenAccount model exists in Prisma client use it; otherwise fallback to legacy user fields
    if ((prisma as any).tokenAccount && typeof (prisma as any).tokenAccount.findUnique === 'function') {
      const account = await prisma.tokenAccount.findUnique({ where: { userId } })
      if (!account) return res.status(404).json({ message: 'Token account not found' })
      const available = account.balance - account.reservedBalance
      return res.json({
        plan: account.planType,
        balance: account.balance,
        reserved: account.reservedBalance,
        available,
        overdraftLimit: account.overdraftLimit
      })
    }

    // fallback: check user row for tokenBalance/plan
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } as any })
    if (!user) return res.status(404).json({ message: 'User not found' })
    const balance = Number((user as any).tokenBalance || 0)
    const plan = ((user as any).plan || 'FREE').toString().toUpperCase()
    return res.json({ plan, balance, reserved: 0, available: balance, overdraftLimit: 0 })

  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch balance" });
  }
});

export default router;
