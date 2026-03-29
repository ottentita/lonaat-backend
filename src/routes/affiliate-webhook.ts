import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Commission rates by network
const commissionRates: Record<string, number> = {
  'Digistore24': 0.5,
  'AWIN': 0.3,
  'awin': 0.3,
  'WarriorPlus': 0.5,
  'Impact': 0.3,
  'JVZoo': 0.5,
  'ClickBank': 0.5,
  'Admitad': 0.3,
  'MyLead': 0.3
};

const getCommissionRate = (network: string): number => {
  return commissionRates[network] || 0.3;
};

/**
 * POST /api/webhooks/affiliate - Universal affiliate conversion webhook
 * 
 * CRITICAL REQUIREMENTS:
 * 1. IDEMPOTENCY FIRST - Check eventId before any processing
 * 2. REJECT DUPLICATES - Return 200 OK but don't process
 * 3. CREATE CONVERSION - Record in database
 * 4. UPDATE WALLET - Use increment ONLY (atomic)
 * 5. CREATE LEDGER - Transaction history
 */
router.post('/affiliate', async (req: Request, res: Response) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 AFFILIATE CONVERSION WEBHOOK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { eventId, userId, productId, amount, network, orderId, clickId } = req.body;

    // STEP 1: VALIDATE REQUIRED FIELDS
    if (!eventId) {
      console.error('❌ WEBHOOK REJECTED - Missing eventId');
      return res.status(400).json({ 
        success: false,
        error: 'eventId is required for idempotency' 
      });
    }

    if (!userId || !amount || !network) {
      console.error('❌ WEBHOOK REJECTED - Missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        required: ['eventId', 'userId', 'amount', 'network']
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error('❌ WEBHOOK REJECTED - Invalid amount:', amount);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid amount' 
      });
    }

    console.log('📋 WEBHOOK DATA:', {
      eventId,
      userId,
      productId: productId || 'N/A',
      amount: parsedAmount,
      network,
      orderId: orderId || 'N/A'
    });

    // STEP 2: IDEMPOTENCY CHECK (FIRST - BEFORE ANY PROCESSING)
    console.log('🔍 IDEMPOTENCY CHECK - Checking for duplicate eventId:', eventId);
    
    const existingCommission = await prisma.commissions.findFirst({
      where: { 
        external_ref: String(eventId)
      }
    });

    if (existingCommission) {
      console.log('⚠️ DUPLICATE EVENT DETECTED - Idempotency check failed');
      console.log('   Existing commission ID:', existingCommission.id);
      console.log('   Original created_at:', existingCommission.created_at);
      console.log('   Status:', existingCommission.status);
      console.log('🔄 WEBHOOK RESPONSE - Returning 200 OK (duplicate rejected)');
      
      // Return 200 OK to prevent webhook retries, but indicate duplicate
      return res.status(200).json({ 
        success: true,
        duplicate: true,
        message: 'Event already processed',
        commissionId: existingCommission.id
      });
    }

    console.log('✅ IDEMPOTENCY CHECK PASSED - No duplicate found');

    // STEP 3: VALIDATE USER EXISTS
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!user) {
      console.error('❌ WEBHOOK REJECTED - User not found:', userId);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    console.log('✅ USER VALIDATED:', user.email);

    // STEP 4: CALCULATE COMMISSION
    const rate = getCommissionRate(network);
    const commissionAmount = parsedAmount * rate;

    console.log('💵 COMMISSION CALCULATION:', {
      rawAmount: parsedAmount,
      rate: `${(rate * 100).toFixed(0)}%`,
      commissionAmount: commissionAmount.toFixed(2)
    });

    // STEP 5: ATOMIC TRANSACTION - Create conversion, update wallet, create ledger
    console.log('🔄 STARTING ATOMIC TRANSACTION...');

    const result = await prisma.$transaction(async (tx) => {
      // 5a. CREATE COMMISSION RECORD
      console.log('   📝 Creating commission record...');
      const commission = await tx.commissions.create({
        data: {
          user_id: Number(userId),
          network: network,
          amount: commissionAmount,
          status: 'approved',
          external_ref: String(eventId), // ✅ UNIQUE eventId for idempotency
          product_id: productId ? Number(productId) : null,
          click_id: clickId ? Number(clickId) : null,
          paid_at: new Date(),
          webhook_data: JSON.stringify({
            eventId,
            orderId,
            rawAmount: parsedAmount,
            commissionRate: rate,
            network,
            receivedAt: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.headers['user-agent']
          })
        }
      });

      console.log('   ✅ Commission created - ID:', commission.id);

      // 5b. UPDATE WALLET (INCREMENT ONLY - ATOMIC)
      console.log('   💰 Updating wallet balance...');
      
      let wallet = await tx.wallet.findUnique({
        where: { userId: Number(userId) }
      });

      if (!wallet) {
        // Create wallet if doesn't exist
        wallet = await tx.wallet.create({
          data: {
            userId: Number(userId),
            balance: commissionAmount,
            totalEarned: commissionAmount,
            locked_balance: 0
          }
        });
        console.log('   ✅ Wallet created with balance:', commissionAmount);
      } else {
        // Update existing wallet using INCREMENT (atomic)
        await tx.wallet.update({
          where: { userId: Number(userId) },
          data: {
            balance: { increment: commissionAmount },
            totalEarned: { increment: commissionAmount }
          }
        });
        console.log('   ✅ Wallet updated - Added:', commissionAmount);
      }

      // 5c. CREATE LEDGER ENTRY
      console.log('   📊 Creating ledger entry...');
      const ledger = await tx.transactionLedger.create({
        data: {
          userId: Number(userId),
          amount: Math.round(commissionAmount * 100), // Convert to cents (Int)
          type: 'commission',
          reason: `Commission from ${network} - Order ${orderId || eventId}`
        }
      });

      console.log('   ✅ Ledger entry created - ID:', ledger.id);

      return { commission, wallet, ledger };
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CONVERSION PROCESSED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL RESULT:', {
      commissionId: result.commission.id,
      userId: userId,
      amount: commissionAmount,
      network: network,
      eventId: eventId,
      status: 'approved'
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Conversion processed successfully',
      data: {
        commissionId: result.commission.id,
        amount: commissionAmount,
        eventId: eventId,
        status: 'approved'
      }
    });

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ WEBHOOK PROCESSING ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check for unique constraint violation (duplicate eventId)
    if (error.code === 'P2002') {
      console.log('⚠️ DUPLICATE DETECTED VIA UNIQUE CONSTRAINT');
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Event already processed (unique constraint)'
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
});

export default router;
