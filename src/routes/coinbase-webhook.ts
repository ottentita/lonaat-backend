import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import walletService from '../services/walletService';

const router = Router();

/**
 * Coinbase Commerce Webhook Handler
 * POST /api/webhooks/coinbase
 * 
 * Handles payment confirmations from Coinbase Commerce
 */
router.post('/coinbase', async (req, res) => {
  console.log('🔔 COINBASE WEBHOOK RECEIVED');
  
  try {
    // Verify webhook signature
    const signature = req.headers['x-cc-webhook-signature'] as string;
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== computedSignature) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    console.log('📦 Event type:', event.type);

    // Handle charge:confirmed event
    if (event.type === 'charge:confirmed') {
      const charge = event.data;
      const metadata = charge.metadata || {};
      
      const userId = metadata.userId;
      const depositId = metadata.depositId;
      const amount = parseFloat(charge.pricing.local.amount);

      console.log('✅ Payment confirmed');
      console.log('👤 User ID:', userId);
      console.log('💰 Amount:', amount);
      console.log('🆔 Charge ID:', charge.id);

      if (!userId) {
        console.error('❌ No userId in metadata');
        return res.status(400).json({ error: 'Missing userId in metadata' });
      }

      // Check for duplicate transaction
      const referenceId = `coinbase-${charge.id}`;
      const exists = await walletService.transactionExists(referenceId);
      
      if (exists) {
        console.log('⚠️ Transaction already processed');
        return res.json({ success: true, message: 'Already processed' });
      }

      // Add funds to wallet
      await walletService.addFunds(
        userId,
        amount,
        'deposit',
        'crypto',
        `Coinbase Commerce deposit - ${charge.id}`,
        {
          chargeId: charge.id,
          depositId,
          coinbaseData: charge
        }
      );

      // Update deposit status if depositId exists
      if (depositId) {
        await prisma.deposit.update({
          where: { id: depositId },
          data: {
            status: 'confirmed',
            processedAt: new Date()
          }
        });
      }

      console.log('✅ Funds added to wallet via Coinbase');

      return res.json({ success: true, message: 'Payment processed' });
    }

    // Handle charge:failed event
    if (event.type === 'charge:failed') {
      const charge = event.data;
      const metadata = charge.metadata || {};
      const depositId = metadata.depositId;

      console.log('❌ Payment failed');
      console.log('🆔 Charge ID:', charge.id);

      // Update deposit status if depositId exists
      if (depositId) {
        await prisma.deposit.update({
          where: { id: depositId },
          data: {
            status: 'rejected',
            adminNote: 'Coinbase payment failed',
            processedAt: new Date()
          }
        });
      }

      return res.json({ success: true, message: 'Payment failure recorded' });
    }

    // Other events
    console.log('ℹ️ Unhandled event type:', event.type);
    res.json({ success: true, message: 'Event received' });

  } catch (error: any) {
    console.error('❌ Coinbase webhook error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
});

/**
 * Create Coinbase Commerce charge
 * POST /api/webhooks/coinbase/create-charge
 */
router.post('/coinbase/create-charge', async (req, res) => {
  console.log('💳 CREATE COINBASE CHARGE');
  
  try {
    const { userId, amount, depositId } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    const apiKey = process.env.COINBASE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'Coinbase API not configured. Set COINBASE_API_KEY in .env'
      });
    }

    // Create real Coinbase Commerce charge
    const chargeResponse = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify({
        name: 'Wallet Deposit',
        description: `Deposit ${amount} XAF`,
        pricing_type: 'fixed_price',
        local_price: { amount: String(amount), currency: 'XAF' },
        metadata: { userId, depositId }
      })
    });

    const chargeData = await chargeResponse.json();

    if (!chargeResponse.ok) {
      console.error('❌ Coinbase charge creation failed:', chargeData);
      return res.status(500).json({ success: false, error: 'Failed to create charge' });
    }

    console.log('✅ Charge created:', chargeData.data?.id);

    res.json({
      success: true,
      charge: chargeData.data,
      message: 'Charge created. Redirect user to hosted_url'
    });

  } catch (error: any) {
    console.error('❌ Create charge error:', error);
    res.status(500).json({ 
      error: 'Failed to create charge',
      details: error.message 
    });
  }
});

export default router;
