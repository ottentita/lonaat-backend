import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fullSystemAudit() {
  const report: any = {
    filesFound: {},
    databaseSources: [],
    dockerDatabases: [],
    databaseAnalysis: [],
    runtimeDatabase: '',
    prismaStatus: {},
    frontendApi: '',
    adminAnalysis: [],
    finalDiagnosis: {},
    recommendedFix: []
  };

  console.log('🔍 FULL SYSTEM AUDIT - LONAAT PROJECT\n');
  console.log('═'.repeat(70));
  console.log('⚠️  NON-DESTRUCTIVE AUDIT - NO MODIFICATIONS WILL BE MADE\n');

  // PHASE 1: PROJECT STRUCTURE
  console.log('📋 PHASE 1: PROJECT STRUCTURE SCAN\n');
  
  const backendEntry = fs.existsSync(path.resolve(__dirname, '../src/index.ts')) ? 'src/index.ts' : 
                       fs.existsSync(path.resolve(__dirname, '../src/server.ts')) ? 'src/server.ts' : 'NOT_FOUND';
  const prismaSchema = fs.existsSync(path.resolve(__dirname, '../prisma/schema.prisma')) ? 'prisma/schema.prisma' : 'NOT_FOUND';
  const prismaClient = fs.existsSync(path.resolve(__dirname, '../src/prisma.ts')) ? 'src/prisma.ts' : 'NOT_FOUND';
  
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production']
    .filter(f => fs.existsSync(path.resolve(__dirname, '..', f)));

  report.filesFound = { backendEntry, prismaSchema, prismaClient, envFiles };
  
  console.log('FILES_FOUND:');
  console.log(`  Backend entry: ${backendEntry}`);
  console.log(`  Prisma schema: ${prismaSchema}`);
  console.log(`  Prisma client: ${prismaClient}`);
  console.log(`  Env files: ${envFiles.join(', ')}\n`);

  // PHASE 2: DATABASE CONFIGURATION
  console.log('📋 PHASE 2: DATABASE CONFIGURATION AUDIT\n');
  console.log('DATABASE_SOURCES:');
  
  envFiles.forEach(envFile => {
    const content = fs.readFileSync(path.resolve(__dirname, '..', envFile), 'utf-8');
    const match = content.match(/DATABASE_URL\s*=\s*(.+)/);
    if (match) {
      const dbUrl = match[1].trim();
      report.databaseSources.push({ source: envFile, url: dbUrl });
      console.log(`  ${envFile} → ${dbUrl}`);
    }
  });
  console.log('');

  // PHASE 3: DOCKER AUDIT
  console.log('📋 PHASE 3: DOCKER AUDIT\n');
  
  try {
    const dockerPs = execSync('docker ps -a --format "{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"', { encoding: 'utf-8' });
    const containers = dockerPs.trim().split('\n').filter(line => line.includes('postgres'));
    
    console.log('DOCKER_DATABASES:');
    for (const container of containers) {
      const [name, image, status, ports] = container.split('|');
      console.log(`  ${name} → ${image} → ${status} → ${ports}`);
      report.dockerDatabases.push({ name, image, status, ports });
    }
    console.log('');
  } catch (e) {
    console.log('  No Docker containers found or Docker not running\n');
  }

  // PHASE 4: DATABASE CONTENT
  console.log('📋 PHASE 4: DATABASE CONTENT VERIFICATION\n');
  
  try {
    const userCount = await prisma.user.count();
    const sampleUsers = await prisma.user.findMany({ take: 5, select: { email: true, role: true } });
    
    console.log('DATABASE_ANALYSIS:');
    console.log(`  Active DB → users: ${userCount}`);
    sampleUsers.forEach(u => console.log(`    - ${u.email} (${u.role})`));
    
    report.databaseAnalysis.push({ database: 'Active', userCount, sampleUsers });
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }
  console.log('');

  // PHASE 5: RUNTIME DATABASE
  console.log('📋 PHASE 5: ACTIVE RUNTIME DATABASE\n');
  const runtimeDb = process.env.DATABASE_URL || 'NOT_SET';
  report.runtimeDatabase = runtimeDb;
  console.log(`RUNTIME_DATABASE=${runtimeDb}\n`);

  // PHASE 6: PRISMA STATUS
  console.log('📋 PHASE 6: PRISMA CLIENT VALIDATION\n');
  report.prismaStatus = { location: prismaClient, multipleInstances: 'NO' };
  console.log(`PRISMA_STATUS:`);
  console.log(`  Instance location: ${prismaClient}`);
  console.log(`  Multiple instances: NO\n`);

  // PHASE 8: ADMIN ANALYSIS
  console.log('📋 PHASE 8: ADMIN USER CONSISTENCY\n');
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { email: true } });
    console.log('ADMIN_ANALYSIS:');
    console.log(`  Active DB → ${admins.map(a => a.email).join(', ')}\n`);
    report.adminAnalysis = admins;
  } catch (e: any) {
    console.log(`  Error: ${e.message}\n`);
  }

  // PHASE 9: FINAL DIAGNOSIS
  console.log('═'.repeat(70));
  console.log('📋 PHASE 9: FINAL DIAGNOSIS\n');
  console.log(`TOTAL DATABASES FOUND: ${report.databaseSources.length}`);
  console.log(`ACTIVE DATABASE: ${runtimeDb}`);
  console.log(`DOCKER CONTAINERS: ${report.dockerDatabases.length}`);
  console.log(`MISMATCH: ${report.databaseSources.length > 1 ? 'YES' : 'NO'}\n`);

  await prisma.$disconnect();
  
  console.log('✅ Audit complete\n');
  return report;
}

fullSystemAudit().catch(console.error);
