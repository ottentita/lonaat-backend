import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createPayment } from "../services/payment.service";
import { generateCryptoPaymentReference } from "../providers/crypto.provider";
import { prisma } from "../prisma";
import { activatePlan } from "../services/plan.activation.service";
import { authorizeRole } from "../middleware/role";

const router = Router();

router.post("/crypto", authenticate, async (req: any, res) => {
  try {
    const { amount, currency, planId } = req.body;

    if (!amount || !currency || !planId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const reference = "CRYPTO_" + Date.now();

    // create payment (createPayment maps `reference` to existing transactionId field)
    await createPayment({
      userId: req.user.id,
      provider: "CRYPTO",
      amount,
      currency,
      status: "PENDING",
      reference
    });

    res.json({
      success: true,
      reference,
      network: "TRC20",
      currency: "USDT",
      walletAddress: "YOUR_USDT_TRC20_WALLET",
      instructions: "Send exact amount and submit txHash for confirmation."
    });
  } catch (err) {
    console.error('Create crypto payment error', err);
    res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
});

router.post("/crypto/confirm", authenticate, async (req: any, res) => {
  try {
    const { reference, txHash, planId } = req.body;

    if (!reference || !txHash || !planId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // find by transactionId (createPayment maps reference -> transactionId)
    const payment = await prisma.payment.findUnique({
      where: { transactionId: reference }
    } as any);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({ error: "Invalid payment state" });
    }

    await prisma.payment.update({
      where: { transactionId: reference } as any,
      data: {
        txHash,
        status: "AWAITING_ADMIN_CONFIRMATION"
      }
    } as any);

    // do NOT auto-activate plan; admin will verify
    res.json({
      success: true,
      message: "Transaction submitted. Awaiting verification."
    });
  } catch (err) {
    console.error('Confirm crypto payment error', err);
    res.status(500).json({ success: false, error: 'Failed to confirm payment' });
  }
});

// Admin approval endpoint — approves payment and activates plan
router.post("/crypto/admin-approve", authenticate, authorizeRole("ADMIN"), async (req: any, res) => {
  try {
    const { reference, planId } = req.body;

    if (!reference || !planId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const payment = await prisma.payment.findUnique({ where: { transactionId: reference } } as any);

    if (!payment || payment.status !== "AWAITING_ADMIN_CONFIRMATION") {
      return res.status(400).json({ error: "Invalid payment state" });
    }

    await prisma.payment.update({ where: { transactionId: reference } as any, data: { status: "CONFIRMED" } } as any);

    // activate plan for the user who made the payment
    await activatePlan(Number(payment.userId), planId);

    res.json({ success: true, message: "Payment approved and plan activated." });
  } catch (err) {
    console.error('Admin approve payment error', err);
    res.status(500).json({ success: false, error: 'Failed to approve payment' });
  }
});

export default router;
