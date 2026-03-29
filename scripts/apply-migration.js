// Apply manual migration without resetting schema
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('📦 Applying normalized financial models migration...');
  
  try {
    // Create Wallet table
    console.log('Creating Wallet table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Wallet" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL UNIQUE,
        "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Wallet_userId_idx" ON "Wallet"("userId")`;
    console.log('✅ Wallet table created');
    
    // Create Transaction table
    console.log('Creating Transaction table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Transaction" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "type" TEXT NOT NULL,
        "source" TEXT NOT NULL,
        "referenceId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Transaction_source_idx" ON "Transaction"("source")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Transaction_referenceId_idx" ON "Transaction"("referenceId")`;
    console.log('✅ Transaction table created');
    
    // Create Commission table
    console.log('Creating Commission table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Commission" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "productId" INTEGER NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Commission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Commission_userId_idx" ON "Commission"("userId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Commission_productId_idx" ON "Commission"("productId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Commission_status_idx" ON "Commission"("status")`;
    console.log('✅ Commission table created');
    
    console.log('\n✅ Migration applied successfully!');
    console.log('✅ New tables created: Wallet, Transaction, Commission');
    console.log('✅ Existing tables: UNTOUCHED');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('\n🎉 Done! Run: npx prisma generate');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
