/**
 * MTN MOMO SERVICE - CAMEROON PAYMENT INTEGRATION
 * Handles MTN Mobile Money payments for wallet funding and withdrawals
 */

import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Environment variables (MANDATORY)
const BASE_URL = process.env.MTN_MOMO_BASE_URL;
const SUB_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
const API_USER = process.env.MTN_MOMO_API_USER;
const API_KEY = process.env.MTN_MOMO_API_KEY;
const CALLBACK_URL = process.env.MTN_MOMO_CALLBACK_URL;

// Verify environment variables
const requiredEnvVars = [
  'MTN_MOMO_BASE_URL',
  'MTN_MOMO_SUBSCRIPTION_KEY', 
  'MTN_MOMO_API_USER',
  'MTN_MOMO_API_KEY',
  'MTN_MOMO_CALLBACK_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ MISSING ENVIRONMENT VARIABLES:', missingVars.join(', '));
  console.error('🛑 MTN MOMO integration will fail without these variables');
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

console.log('✅ MTN MOMO environment variables verified');

/**
 * Get MTN MOMO access token
 */
export async function getMomoToken(): Promise<string> {
  try {
    const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");

    const response = await axios.post(
      `${BASE_URL}/collection/token/`,
      {},
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Ocp-Apim-Subscription-Key": SUB_KEY,
        },
        timeout: 10000 // 10 second timeout
      }
    );

    const token = response.data.access_token;
    if (!token) {
      throw new Error('No access token received from MTN MOMO');
    }

    console.log('✅ MTN MOMO token obtained successfully');
    return token;
  } catch (error: any) {
    console.error('❌ Failed to get MTN MOMO token:', error.response?.data || error.message);
    throw new Error(`MTN MOMO authentication failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Request payment from MTN MOMO (Deposit to wallet)
 */
export async function requestToPay({
  amount,
  phone,
  externalId,
  userId,
}: {
  amount: number;
  phone: string;
  externalId: string;
  userId: number;
}): Promise<string> {
  try {
    console.log(`📱 Requesting MTN MOMO payment: ${amount} XAF to ${phone}`);
    
    const token = await getMomoToken();
    const referenceId = uuidv4();

    const requestData = {
      amount: amount.toString(),
      currency: "XAF",
      externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: phone,
      },
      payerMessage: `Wallet funding for user ${userId}`,
      payeeNote: `Deposit ${amount} XAF`,
    };

    const response = await axios.post(
      `${BASE_URL}/collection/v1_0/requesttopay`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Reference-Id": referenceId,
          "X-Target-Environment": "sandbox",
          "Ocp-Apim-Subscription-Key": SUB_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000 // 15 second timeout
      }
    );

    console.log(`✅ MTN MOMO payment requested: Reference ${referenceId}`);
    
    // Store request for webhook matching
    await storeMomoRequest({
      referenceId,
      externalId,
      userId,
      amount,
      phone,
      status: 'pending',
      createdAt: new Date()
    });

    return referenceId;
  } catch (error: any) {
    console.error('❌ MTN MOMO payment request failed:', error.response?.data || error.message);
    throw new Error(`MTN MOMO payment request failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Check payment status
 */
export async function getPaymentStatus(referenceId: string): Promise<any> {
  try {
    const token = await getMomoToken();

    const response = await axios.get(
      `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Ocp-Apim-Subscription-Key": SUB_KEY,
          "X-Target-Environment": "sandbox",
        },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to check MTN MOMO payment status:', error.response?.data || error.message);
    throw new Error(`MTN MOMO status check failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Store MOMO request for webhook matching
 */
async function storeMomoRequest(request: {
  referenceId: string;
  externalId: string;
  userId: number;
  amount: number;
  phone: string;
  status: string;
  createdAt: Date;
}): Promise<void> {
  try {
    // This would typically use Prisma - for now using console
    console.log('📝 Storing MOMO request:', {
      referenceId: request.referenceId,
      externalId: request.externalId,
      userId: request.userId,
      amount: request.amount,
      phone: request.phone,
      status: request.status
    });

    // TODO: Store in database when schema is ready
    // await prisma.momoRequest.create({ data: request });
  } catch (error) {
    console.error('❌ Failed to store MOMO request:', error);
    // Don't throw - payment request already sent
  }
}

/**
 * Validate Cameroon phone number
 */
export function validateCameroonPhone(phone: string): boolean {
  // Cameroon phone numbers: +237 6XXXXXXX or +237 7XXXXXXX
  const cameroonRegex = /^\+237[67]\d{8}$/;
  return cameroonRegex.test(phone);
}

/**
 * Format phone number for MTN MOMO
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // If no country code, assume Cameroon (+237)
  if (!cleanPhone.startsWith('237')) {
    cleanPhone = '237' + cleanPhone;
  }
  
  // Add + prefix
  return '+' + cleanPhone;
}

/**
 * Calculate MTN MOMO fees (Cameroon context)
 */
export function calculateMomoFees(amount: number): number {
  // Typical MTN MOMO fee structure in Cameroon
  if (amount <= 1000) return 50;
  if (amount <= 5000) return 100;
  if (amount <= 10000) return 250;
  if (amount <= 20000) return 500;
  if (amount <= 50000) return 1000;
  return 1500;
}

/**
 * Get MOMO request with fees included
 */
export function getMomoAmountWithFees(amount: number): {
  totalAmount: number;
  fees: number;
  netAmount: number;
} {
  const fees = calculateMomoFees(amount);
  const totalAmount = amount + fees;
  
  return {
    totalAmount,
    fees,
    netAmount: amount
  };
}

/**
 * Webhook handler for MOMO callbacks
 */
export async function handleMomoWebhook(callbackData: any): Promise<void> {
  try {
    console.log('📱 MTN MOMO webhook received:', callbackData);
    
    const { referenceId, status, amount } = callbackData;
    
    if (status === 'SUCCESSFUL') {
      // Find the stored request
      // TODO: Lookup from database
      console.log(`✅ MOMO payment successful: ${referenceId}, Amount: ${amount}`);
      
      // Credit user wallet
      // TODO: Implement wallet crediting
    } else if (status === 'FAILED') {
      console.log(`❌ MOMO payment failed: ${referenceId}`);
      
      // Handle failed payment
      // TODO: Update request status, notify user
    }
    
  } catch (error) {
    console.error('❌ Error handling MOMO webhook:', error);
  }
}

// Export types for TypeScript
export interface MomoRequest {
  referenceId: string;
  externalId: string;
  userId: number;
  amount: number;
  phone: string;
  status: 'pending' | 'successful' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface MomoWebhookData {
  referenceId: string;
  status: 'SUCCESSFUL' | 'FAILED';
  amount: string;
  currency: string;
  financialTransactionId: string;
  externalId: string;
}
