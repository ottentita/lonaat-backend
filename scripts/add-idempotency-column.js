// Add idempotencyKey column to Transaction table
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addIdempotencyColumn() {
  console.log('📦 Adding idempotencyKey column to Transaction table...');
  
  try {
    // Add column with unique constraint
    await prisma.$executeRaw`
      ALTER TABLE "Transaction" 
      ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT UNIQUE
    `;
    
    // Add index for performance
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Transaction_idempotencyKey_idx" 
      ON "Transaction"("idempotencyKey")
    `;
    
    console.log('✅ idempotencyKey column added successfully');
    console.log('✅ Index created for idempotencyKey');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addIdempotencyColumn()
  .then(() => {
    console.log('\n🎉 Done! Run: npx prisma generate');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
