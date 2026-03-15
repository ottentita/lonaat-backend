const fs = require('fs');
const fetch = global.fetch || require('node-fetch');

const BASE = 'http://localhost:4000';

async function run() {
  try {
    const creds = JSON.parse(fs.readFileSync('login.json','utf8'));

    // 1) login
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    const loginBody = await loginRes.json();
    if (!loginBody.token) throw new Error('Login failed: ' + JSON.stringify(loginBody));
    const token = loginBody.token;
    console.log('Logged in, token length:', token.length);

    // 2) create payment
    const createBody = JSON.parse(fs.readFileSync('payment_create.json','utf8'));
    const createRes = await fetch(`${BASE}/api/payment/crypto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(createBody)
    });
    const createJson = await createRes.json();
    console.log('Create payment response:', createJson);
    if (!createJson.reference) throw new Error('No reference returned');
    const reference = createJson.reference;

    // 3) submit txHash (user submits)
    const confirmRes = await fetch(`${BASE}/api/payment/crypto/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ reference, txHash: 'FAKE_HASH_FOR_TEST', planId: createBody.planId })
    });
    const confirmJson = await confirmRes.json();
    console.log('Confirm (submit txHash) response:', confirmJson);

    // 4) admin approve (same token since admin user)
    const approveRes = await fetch(`${BASE}/api/payment/crypto/admin-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ reference, planId: createBody.planId })
    });
    const approveJson = await approveRes.json();
    console.log('Admin approve response:', approveJson);

    // 5) check user plan and tokenBalance
    const checkRes = await fetch(`${BASE}/api/user/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const me = await checkRes.json();
    console.log('User after approval:', me);

  } catch (err) {
    console.error('E2E error', err);
    process.exit(1);
  }
}

run();
