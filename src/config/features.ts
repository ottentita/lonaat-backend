// Feature Flags - Control optional functionality
export const MTN_ENABLED = 
  !!process.env.MTN_MOMO_BASE_URL &&
  !!process.env.MTN_MOMO_SUBSCRIPTION_KEY &&
  !!process.env.MTN_MOMO_API_USER &&
  !!process.env.MTN_MOMO_API_KEY &&
  !!process.env.MTN_MOMO_CALLBACK_URL;

export const AFFILIATE_NETWORKS_ENABLED = 
  !!process.env.ADMITAD_CLIENT_ID ||
  !!process.env.JVZOO_API_KEY ||
  !!process.env.WARRIORPLUS_API_KEY ||
  !!process.env.DIGISTORE_API_KEY;

export const OPENAI_ENABLED = !!process.env.OPENAI_API_KEY;

export const ORANGE_MONEY_ENABLED = !!process.env.ORANGE_API_KEY;

console.log('🚀 FEATURE FLAGS:');
console.log(`   MTN MOMO: ${MTN_ENABLED ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Affiliate Networks: ${AFFILIATE_NETWORKS_ENABLED ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   OpenAI: ${OPENAI_ENABLED ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`   Orange Money: ${ORANGE_MONEY_ENABLED ? '✅ ENABLED' : '❌ DISABLED'}`);
