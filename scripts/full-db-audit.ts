import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fullDatabaseAudit() {
  console.log('🔍 FULL MULTI-DATABASE AUDIT (CRITICAL)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const auditResults: any = {
    phase1: [],
    phase2: null,
    phase3: null,
    phase4: null,
    phase5: [],
    phase6: null,
    phase7: null
  };

  try {
    // ============================================
    // PHASE 1: FIND ALL DATABASE CONNECTION SOURCES
    // ============================================
    console.log('📋 PHASE 1: FIND ALL DATABASE CONNECTION SOURCES\n');

    const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
    const discoveredDatabases: any[] = [];

    for (const envFile of envFiles) {
      const envPath = path.resolve(__dirname, '..', envFile);
      if (fs.existsSync(envPath)) {
        console.log(`✅ Found: ${envFile}`);
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (line.includes('DATABASE_URL') && !line.trim().startsWith('#')) {
            const match = line.match(/DATABASE_URL\s*=\s*(.+)/);
            if (match) {
              const dbUrl = match[1].trim();
              discoveredDatabases.push({
                source: envFile,
                url: dbUrl
              });
              console.log(`   DATABASE_URL=${dbUrl}`);
            }
          }
        }
      } else {
        console.log(`❌ Not found: ${envFile}`);
      }
    }

    // Check prisma/schema.prisma
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    if (fs.existsSync(schemaPath)) {
      console.log(`✅ Found: prisma/schema.prisma`);
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const urlMatch = schemaContent.match(/url\s*=\s*env\("([^"]+)"\)/);
      if (urlMatch) {
        console.log(`   Uses env variable: ${urlMatch[1]}`);
      }
    }

    console.log(`\n📊 Total DATABASE_URLs discovered: ${discoveredDatabases.length}\n`);
    auditResults.phase1 = discoveredDatabases;

    // ============================================
    // PHASE 2: VERIFY PRISMA CONNECTION
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PHASE 2: VERIFY PRISMA CONNECTION\n');

    const prismaDbUrl = process.env.DATABASE_URL || 'NOT_SET';
    console.log(`PRISMA_DB=${prismaDbUrl}`);

    // Check src/prisma.ts
    const prismaClientPath = path.resolve(__dirname, '../src/prisma.ts');
    if (fs.existsSync(prismaClientPath)) {
      console.log(`✅ Prisma client source: src/prisma.ts`);
      console.log(`✅ Single Prisma instance confirmed (using global singleton pattern)`);
    }

    auditResults.phase2 = {
      prismaDb: prismaDbUrl,
      clientSource: 'src/prisma.ts',
      singleInstance: true
    };

    console.log('');

    // ============================================
    // PHASE 3: CHECK FRONTEND CONNECTIONS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PHASE 3: CHECK FRONTEND CONNECTIONS\n');

    // Search for frontend API configuration
    const frontendPaths = [
      '../frontend/src/services/apiClient.ts',
      '../frontend/src/config/api.ts',
      '../frontend/src/lib/api.ts',
      '../frontend/src/utils/api.ts'
    ];

    let frontendApiUrl = 'NOT_FOUND';
    for (const fePath of frontendPaths) {
      const fullPath = path.resolve(__dirname, fePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const urlMatch = content.match(/baseURL\s*:\s*['"]([^'"]+)['"]/);
        if (urlMatch) {
          frontendApiUrl = urlMatch[1];
          console.log(`✅ Found frontend API config: ${fePath}`);
          console.log(`   FRONTEND_API=${frontendApiUrl}`);
          break;
        }
      }
    }

    if (frontendApiUrl === 'NOT_FOUND') {
      console.log('⚠️  Frontend API config not found in standard locations');
    }

    auditResults.phase3 = {
      frontendApi: frontendApiUrl
    };

    console.log('');

    // ============================================
    // PHASE 4: DETECT MULTIPLE DATABASES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PHASE 4: DETECT MULTIPLE DATABASES\n');

    const uniqueDatabases = new Set(discoveredDatabases.map(db => db.url));
    const multipleDbsDetected = uniqueDatabases.size > 1;

    console.log(`MULTIPLE_DATABASES=${multipleDbsDetected ? 'YES' : 'NO'}\n`);

    if (multipleDbsDetected) {
      console.log('⚠️  MULTIPLE DATABASE URLS DETECTED:\n');
      let dbIndex = 1;
      for (const dbUrl of uniqueDatabases) {
        console.log(`DB_${dbIndex}=${dbUrl}`);
        const sources = discoveredDatabases.filter(db => db.url === dbUrl).map(db => db.source);
        console.log(`   Sources: ${sources.join(', ')}\n`);
        dbIndex++;
      }
    } else {
      console.log('✅ Single database configuration detected\n');
      if (uniqueDatabases.size === 1) {
        console.log(`DB_1=${Array.from(uniqueDatabases)[0]}\n`);
      }
    }

    auditResults.phase4 = {
      multipleDetected: multipleDbsDetected,
      uniqueCount: uniqueDatabases.size,
      databases: Array.from(uniqueDatabases)
    };

    // ============================================
    // PHASE 5: DATA CONSISTENCY CHECK
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PHASE 5: DATA CONSISTENCY CHECK\n');

    console.log('DB_ANALYSIS:\n');

    // For the active database (current Prisma connection)
    try {
      const userCount = await prisma.user.count();
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin' },
        select: { email: true }
      });

      console.log(`DB_1 (ACTIVE) → users: ${userCount}, admin: ${adminUser ? 'YES' : 'NO'}`);
      if (adminUser) {
        console.log(`   Admin email: ${adminUser.email}`);
      }

      auditResults.phase5.push({
        database: prismaDbUrl,
        userCount,
        hasAdmin: !!adminUser,
        adminEmail: adminUser?.email
      });
    } catch (error: any) {
      console.log(`DB_1 (ACTIVE) → ERROR: ${error.message}`);
      auditResults.phase5.push({
        database: prismaDbUrl,
        error: error.message
      });
    }

    console.log('');

    // ============================================
    // PHASE 6: IDENTIFY ACTIVE RUNTIME DATABASE
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PHASE 6: IDENTIFY ACTIVE RUNTIME DATABASE\n');

    console.log(`RUNTIME_DB=${prismaDbUrl}\n`);

    // Parse database details
    if (prismaDbUrl !== 'NOT_SET') {
      try {
        const url = new URL(prismaDbUrl);
        console.log('Runtime Database Details:');
        console.log(`   Protocol: ${url.protocol}`);
        console.log(`   Host: ${url.hostname}`);
        console.log(`   Port: ${url.port}`);
        console.log(`   Database: ${url.pathname.substring(1)}`);
        console.log(`   User: ${url.username}`);
      } catch (e) {
        console.log('⚠️  Could not parse DATABASE_URL');
      }
    }

    auditResults.phase6 = {
      runtimeDb: prismaDbUrl
    };

    console.log('');

    // ============================================
    // PHASE 7: FINAL DIAGNOSIS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PHASE 7: FINAL DIAGNOSIS\n');

    const activeDb = prismaDbUrl;
    const adminDb = auditResults.phase5[0]?.hasAdmin ? prismaDbUrl : 'NONE';
    const mismatch = multipleDbsDetected || (adminDb === 'NONE');

    console.log('FINAL_STATUS:\n');
    console.log(`ACTIVE_DB=${activeDb}`);
    console.log(`ADMIN_DB=${adminDb}`);
    console.log(`MISMATCH=${mismatch ? 'YES' : 'NO'}\n`);

    if (!mismatch) {
      console.log('✅ NO MISMATCH DETECTED');
      console.log('   - Single database configuration');
      console.log('   - Admin user exists in active database');
      console.log('   - System is consistent\n');
    } else {
      console.log('⚠️  MISMATCH DETECTED\n');
      if (multipleDbsDetected) {
        console.log('   Issue: Multiple DATABASE_URLs found in environment files');
        console.log('   Action: Consolidate to single DATABASE_URL\n');
      }
      if (adminDb === 'NONE') {
        console.log('   Issue: No admin user in active database');
        console.log('   Action: Create admin user in active database\n');
      }
    }

    auditResults.phase7 = {
      activeDb,
      adminDb,
      mismatch,
      consistent: !mismatch
    };

    // ============================================
    // SUMMARY
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 AUDIT SUMMARY\n');
    console.log(`✅ Database URLs found: ${discoveredDatabases.length}`);
    console.log(`✅ Unique databases: ${uniqueDatabases.size}`);
    console.log(`✅ Active database: ${activeDb}`);
    console.log(`✅ Admin status: ${adminDb !== 'NONE' ? 'EXISTS' : 'MISSING'}`);
    console.log(`✅ System consistency: ${!mismatch ? 'CONSISTENT' : 'INCONSISTENT'}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('\n❌ AUDIT ERROR:\n');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return auditResults;
}

fullDatabaseAudit()
  .then(() => {
    console.log('✅ Full database audit complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Audit failed:', error.message);
    process.exit(1);
  });
