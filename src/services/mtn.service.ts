import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';

export async function getMTNToken(): Promise<string> {
  // DEBUG: Verify environment variables are loaded
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ENV CHECK:');
  console.log('CWD:', process.cwd());
  console.log('MTN_USER_ID:', process.env.MTN_USER_ID || 'UNDEFINED');
  console.log('MTN_API_KEY:', process.env.MTN_API_KEY || 'UNDEFINED');
  console.log('MTN_SUBSCRIPTION_KEY:', process.env.MTN_SUBSCRIPTION_KEY || 'UNDEFINED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const userId = process.env.MTN_USER_ID;
  const apiKey = process.env.MTN_API_KEY;
  const subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY;

  if (!userId || !apiKey || !subscriptionKey) {
    console.warn("⚠️ MTN MOMO disabled - missing env variables");
    throw new Error('MTN MOMO service unavailable - missing configuration');
  }

  const basicAuth = Buffer.from(`${userId}:${apiKey}`).toString('base64');

  const response = await fetch(`${BASE_URL}/disbursement/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('MTN TOKEN ERROR:', data);
    throw new Error('Failed to get MTN token');
  }

  return data.access_token;
}

export async function sendMTNPayment(
  amount: string,
  phone: string
): Promise<string> {
  console.log('💸 INITIATING MTN PAYMENT');
  console.log(`   Amount: ${amount} XAF`);
  console.log(`   Phone: ${phone}`);

  const token = await getMTNToken();
  const referenceId = uuidv4();

  console.log(`   Reference ID: ${referenceId}`);

  const response = await fetch(
    `${BASE_URL}/disbursement/v1_0/transfer`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY!,
      },
      body: JSON.stringify({
        amount,
        currency: 'XAF', // Cameroon currency
        externalId: referenceId,
        payee: {
          partyIdType: 'MSISDN',
          partyId: phone,
        },
        payerMessage: 'Withdrawal payout',
        payeeNote: 'You received money',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ MTN TRANSFER ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Status: ${response.status}`);
    console.error(`   Error: ${error}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw new Error('MTN transfer failed');
  }

  console.log('✅ MTN PAYMENT SUCCESSFUL');
  console.log(`   Reference ID: ${referenceId}`);

  return referenceId;
}
