// Environment Variable Validator
// Validates required environment variables on startup

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET'
];

const OPTIONAL_ENV_VARS = [
  'APP_URL',
  'DIGISTORE_API_KEY',
  'AWIN_TOKEN',
  'OPENAI_API_KEY',
  'ORANGE_API_KEY',
  'MTN_MOMO_BASE_URL',
  'MTN_MOMO_SUBSCRIPTION_KEY',
  'MTN_MOMO_API_USER',
  'MTN_MOMO_API_KEY',
  'MTN_MOMO_CALLBACK_URL'
];

export function validateEnvVariables(): void {
  console.log('🔍 Validating environment variables...');

  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check optional but recommended variables
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n⚠️  Application cannot start without these variables.');
    console.error('   Please add them to your .env file.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  MISSING OPTIONAL ENVIRONMENT VARIABLES:');
    warnings.forEach(v => console.warn(`   - ${v}`));
    console.warn('   Some features may not work without these.\n');
  }

  console.log('✅ All required environment variables present\n');
}
