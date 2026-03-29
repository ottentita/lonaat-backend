/**
 * COMMISSION VERIFICATION SCRIPT
 * 
 * Queries the database to verify commission records
 * READ-ONLY operation - does not modify any data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCommissions() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COMMISSION VERIFICATION REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  console.log('Timestamp:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Query latest 5 commission records
    const commissions = await prisma.$queryRaw`
      SELECT id, user_id, network, amount, status, external_ref, created_at
      FROM commissions
      ORDER BY id DESC
      LIMIT 5
    `;

    console.log('📋 LATEST COMMISSION RECORDS:\n');

    if (!commissions || commissions.length === 0) {
      console.log('❌ NO COMMISSION RECORDS FOUND\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Commission system status: BROKEN');
      console.log('Reason: No commissions in database');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    // Display results in table format
    console.log('ID | user_id | network | amount | status | external_ref | created_at');
    console.log('─'.repeat(100));
    
    commissions.forEach(c => {
      const id = String(c.id).padEnd(5);
      const userId = String(c.user_id || 'NULL').padEnd(8);
      const network = String(c.network || 'NULL').padEnd(15);
      const amount = String(c.amount?.toFixed(2) || '0.00').padEnd(10);
      const status = String(c.status || 'NULL').padEnd(10);
      const externalRef = String(c.external_ref || 'NULL').substring(0, 20).padEnd(20);
      const createdAt = c.created_at ? new Date(c.created_at).toISOString().substring(0, 19) : 'NULL';
      
      console.log(`${id} | ${userId} | ${network} | ${amount} | ${status} | ${externalRef} | ${createdAt}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VALIDATION CHECKS:\n');

    // Validation checks
    const hasRecords = commissions.length > 0;
    const allHaveUserId = commissions.every(c => c.user_id !== null && c.user_id !== undefined);
    const allAmountsPositive = commissions.every(c => c.amount > 0);
    const allHaveExternalRef = commissions.every(c => c.external_ref !== null && c.external_ref !== undefined && c.external_ref !== '');
    const networks = [...new Set(commissions.map(c => c.network))];

    console.log(`✓ Are there any records? ${hasRecords ? 'YES' : 'NO'} (${commissions.length} records)`);
    console.log(`✓ Do all records have user_id populated? ${allHaveUserId ? 'YES' : 'NO'}`);
    console.log(`✓ Are amounts greater than 0? ${allAmountsPositive ? 'YES' : 'NO'}`);
    console.log(`✓ Are external_ref values present? ${allHaveExternalRef ? 'YES' : 'NO'}`);
    console.log(`✓ Networks generating commissions: ${networks.join(', ')}`);

    // Calculate statistics
    const totalAmount = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const avgAmount = totalAmount / commissions.length;
    const statusCounts = commissions.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 STATISTICS:');
    console.log(`   Total commissions shown: ${commissions.length}`);
    console.log(`   Total amount: $${totalAmount.toFixed(2)}`);
    console.log(`   Average amount: $${avgAmount.toFixed(2)}`);
    console.log(`   Status breakdown:`, statusCounts);

    // Determine system status
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let systemStatus = 'WORKING';
    let issues = [];

    if (!hasRecords) {
      systemStatus = 'BROKEN';
      issues.push('No commission records found');
    } else {
      if (!allHaveUserId) {
        systemStatus = 'PARTIAL';
        issues.push('Some records missing user_id');
      }
      if (!allAmountsPositive) {
        systemStatus = 'PARTIAL';
        issues.push('Some records have invalid amounts');
      }
      if (!allHaveExternalRef) {
        systemStatus = 'PARTIAL';
        issues.push('Some records missing external_ref (not traceable)');
      }
    }

    console.log(`Commission system status: ${systemStatus}`);
    if (issues.length > 0) {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ All validation checks passed');
      console.log('✅ Commission system is working correctly');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ ERROR QUERYING DATABASE:', error.message);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Commission system status: BROKEN');
    console.log('Reason: Database query failed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyCommissions()
  .then(() => {
    console.log('\n✅ Verification complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
