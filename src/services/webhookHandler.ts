/**
 * 🔒 LOCKED WEBHOOK HANDLER SERVICE
 * 
 * This service contains the core webhook processing logic.
 * DO NOT MODIFY unless absolutely necessary.
 * 
 * Features:
 * - Duplicate prevention via transaction_id
 * - Strict validation
 * - Always returns HTTP 200 (safe for webhook providers)
 * - Comprehensive error handling
 * - Wallet sync with fallback
 */

import { Request, Response } from 'express';
import { prisma } from '../prisma';

// Commission rates by network
const commissionRates: Record<string, number> = {
  'Digistore24': 0.5,    // 50%
  'AWIN': 0.3,           // 30%
  'awin': 0.3,           // 30%
  'WarriorPlus': 0.5,    // 50%
  'Impact': 0.3,         // 30%
  'JVZoo': 0.5,          // 50%
  'ClickBank': 0.5,      // 50%
  'Admitad': 0.3,        // 30%
  'MyLead': 0.3          // 30%
};

const getCommissionRate = (network: string): number => {
  return commissionRates[network] || 0.3;
};

/**
 * 🔒 LOCKED: Digistore24 Webhook Handler
 * 
 * ALWAYS returns HTTP 200 to prevent webhook retries
 * Handles all errors gracefully
 */
export async function handleDigistore24Webhook(req: Request, res: Response) {
  const WEBHOOK_LOCK = process.env.WEBHOOK_LOCK === 'true';
  
  try {
    console.log('🔒 WEBHOOK LOCK ACTIVE:', WEBHOOK_LOCK);
    console.log('💰 DIGISTORE24 WEBHOOK - Received:', JSON.stringify(req.body).substring(0, 200));

    // STRICT VALIDATION - Check payload exists
    if (!req.body || typeof req.body !== 'object') {
      console.error('❌ WEBHOOK - Invalid payload: body is empty or not an object');
      return res.status(200).send('Invalid payload - ignored safely');
    }

    const { event, data } = req.body;

    if (!data || typeof data !== 'object') {
      console.error('❌ WEBHOOK - Invalid payload: data field missing or invalid');
      return res.status(200).send('Invalid payload - ignored safely');
    }

    // Extract required fields with multiple fallbacks
    const email = data.email || data.buyer_email || data.customer_email;
    const amount = parseFloat(data.amount || data.commission || 0);
    const productId = data.product_id;
    const transactionId = data.order_id || data.transaction_id;

    // STRICT VALIDATION - Reject if ANY required field is missing
    // BUT ALWAYS RETURN 200 to prevent retries
    if (!email) {
      console.error('❌ WEBHOOK - Missing email field');
      return res.status(200).send('Missing email - ignored safely');
    }

    if (!amount || amount <= 0) {
      console.error('❌ WEBHOOK - Invalid amount:', amount);
      return res.status(200).send('Invalid amount - ignored safely');
    }

    if (!transactionId) {
      console.error('❌ WEBHOOK - Missing transaction_id');
      return res.status(200).send('Missing transaction_id - ignored safely');
    }

    console.log('✅ WEBHOOK - Validation passed');
    console.log(`   Email: ${email}`);
    console.log(`   Amount: $${amount.toFixed(2)}`);
    console.log(`   Transaction ID: ${transactionId}`);

    // 🔒 DUPLICATE PREVENTION LOCK
    const existingCommission = await prisma.commissions.findFirst({
      where: { external_ref: transactionId }
    });

    if (existingCommission) {
      console.warn('🔒 DUPLICATE WEBHOOK IGNORED - Transaction already processed');
      console.warn(`   Transaction ID: ${transactionId}`);
      console.warn(`   Existing Commission ID: ${existingCommission.id}`);
      console.warn(`   Created At: ${existingCommission.created_at}`);
      return res.status(200).send('Duplicate ignored');
    }

    console.log('✅ WEBHOOK - No duplicate found, proceeding');

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error('❌ WEBHOOK - User not found for email:', email);
      return res.status(200).send('User not found - ignored safely');
    }

    console.log('✅ WEBHOOK - User found:', user.id, user.email);

    // Calculate commission
    const rate = getCommissionRate('Digistore24');
    const commissionAmount = amount * rate;

    // CREATE COMMISSION
    const commission = await prisma.commissions.create({
      data: {
        user_id: user.id,
        network: 'Digistore24',
        product_id: productId ? Number(productId) : null,
        amount: commissionAmount,
        status: 'pending',
        external_ref: transactionId,
        webhook_data: JSON.stringify(req.body)
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ COMMISSION CREATED FROM WEBHOOK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 COMMISSION DETAILS:', {
      commission_id: commission.id,
      user_id: user.id,
      user_email: user.email,
      network: 'Digistore24',
      transaction_id: transactionId,
      sale_amount: amount,
      commission_rate: `${(rate * 100).toFixed(0)}%`,
      commission_amount: commissionAmount,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 🔒 WALLET SYNC WITH SAFE FALLBACK
    try {
      let wallet = await prisma.wallet.findUnique({
        where: { userId: String(user.id) }
      });

      if (!wallet) {
        console.log('💰 WEBHOOK - Creating wallet for user:', user.id);
        wallet = await prisma.wallet.create({
          data: {
            userId: String(user.id),
            balance: commissionAmount,
            totalEarned: commissionAmount
          }
        });
        console.log('✅ WEBHOOK - Wallet created with balance:', commissionAmount);
      } else {
        await prisma.wallet.update({
          where: { userId: String(user.id) },
          data: {
            balance: { increment: commissionAmount },
            totalEarned: { increment: commissionAmount }
          }
        });
        console.log('✅ WEBHOOK - Wallet balance updated');
        console.log(`   Previous Balance: $${wallet.balance.toFixed(2)}`);
        console.log(`   Commission Added: $${commissionAmount.toFixed(2)}`);
        console.log(`   New Balance: $${(wallet.balance + commissionAmount).toFixed(2)}`);
      }
    } catch (walletError) {
      console.error('⚠️ WEBHOOK - Wallet update failed (commission still created):', walletError);
      // Continue anyway - commission was created successfully
    }

    console.log('🔒 Webhook processed safely');

    // ALWAYS RETURN 200
    return res.status(200).json({ 
      status: 'ok',
      commission_id: commission.id,
      commission_amount: commissionAmount
    });

  } catch (error: any) {
    // 🔒 CRITICAL: ALWAYS RETURN 200 EVEN ON ERROR
    console.error('❌ WEBHOOK - Critical error:', error);
    console.error('Stack:', error.stack);
    
    // Return 200 to prevent webhook provider from retrying
    return res.status(200).send('Error handled safely');
  }
}
