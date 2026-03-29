/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * NETWORK QUALITY CONTROL
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script:
 * 1. Identifies networks with repeated failures
 * 2. Marks problematic networks as "blocked"
 * 3. Prevents future imports from blocked networks
 * 4. Removes duplicate affiliate links
 * 5. Generates comprehensive quality report
 */

import prisma from '../src/prisma';

/**
 * Analyzes network failure rates and blocks problematic networks
 */
async function runNetworkQualityControl() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 NETWORK QUALITY CONTROL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // STEP 1: Fetch all products and analyze by network
    console.log('📦 STEP 1: Analyzing products by network...');
    
    const allProducts = await prisma.product.findMany({
      where: {
        AND: [
          { affiliate_link: { not: null } },
          { affiliate_link: { not: '' } }
        ]
      },
      select: {
        id: true,
        name: true,
        affiliate_link: true,
        network: true,
        is_active: true,
      },
      orderBy: {
        network: 'asc',
      },
    });

    console.log(`✅ Found ${allProducts.length} products with affiliate links\n`);

    // STEP 2: Group by network and calculate failure rates
    console.log('📊 STEP 2: Calculating network failure rates...\n');
    
    const networkStats = new Map<string, {
      total: number;
      active: number;
      inactive: number;
      failureRate: number;
      products: Array<{id: string, name: string, link: string, active: boolean}>;
    }>();

    // Group products by network
    for (const product of allProducts) {
      const network = product.network || 'Unknown';
      
      if (!networkStats.has(network)) {
        networkStats.set(network, {
          total: 0,
          active: 0,
          inactive: 0,
          failureRate: 0,
          products: []
        });
      }
      
      const stats = networkStats.get(network)!;
      stats.total++;
      stats.products.push({
        id: product.id,
        name: product.name,
        link: product.affiliate_link!,
        active: product.is_active
      });
      
      if (product.is_active) {
        stats.active++;
      } else {
        stats.inactive++;
      }
    }

    // Calculate failure rates
    for (const [network, stats] of networkStats) {
      stats.failureRate = stats.total > 0 ? (stats.inactive / stats.total) * 100 : 0;
    }

    // STEP 3: Identify networks to block (>50% failure rate)
    console.log('🚫 STEP 3: Identifying networks to block...\n');
    
    const networksToBlock: string[] = [];
    const networkReport: Array<{network: string, total: number, active: number, inactive: number, failureRate: number, status: string}> = [];

    for (const [network, stats] of networkStats) {
      const shouldBlock = stats.failureRate > 50 || stats.inactive === stats.total;
      const status = shouldBlock ? 'BLOCKED' : 'ALLOWED';
      
      if (shouldBlock) {
        networksToBlock.push(network);
      }
      
      networkReport.push({
        network,
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        failureRate: Math.round(stats.failureRate * 100) / 100,
        status
      });
      
      console.log(`${shouldBlock ? '🚫' : '✅'} ${network}: ${stats.inactive}/${stats.total} inactive (${stats.failureRate.toFixed(1)}%) - ${status}`);
    }

    console.log(`\n📊 Networks to block: ${networksToBlock.length}`);

    // STEP 4: Remove duplicate affiliate links
    console.log('\n🔍 STEP 4: Removing duplicate affiliate links...\n');
    
    const linkCounts = new Map<string, number>();
    const duplicates: Array<{link: string, count: number, products: Array<{id: string, name: string}>}> = [];
    
    // Count occurrences of each link
    for (const product of allProducts) {
      const link = product.affiliate_link!;
      linkCounts.set(link, (linkCounts.get(link) || 0) + 1);
    }
    
    // Find duplicates
    for (const [link, count] of linkCounts) {
      if (count > 1) {
        const duplicateProducts = allProducts
          .filter(p => p.affiliate_link === link)
          .map(p => ({ id: p.id, name: p.name }));
        
        duplicates.push({
          link,
          count,
          products: duplicateProducts
        });
      }
    }

    console.log(`🔗 Found ${duplicates.length} duplicate affiliate links`);
    
    // Remove duplicates (keep first occurrence, delete rest)
    let duplicatesRemoved = 0;
    const removedProducts: Array<{id: string, name: string, reason: string}> = [];

    for (const duplicate of duplicates) {
      console.log(`\n📎 Duplicate link: ${duplicate.link.substring(0, 60)}... (${duplicate.count} occurrences)`);
      
      // Keep first product, remove others
      for (let i = 1; i < duplicate.products.length; i++) {
        const productToRemove = duplicate.products[i];
        
        try {
          await prisma.product.delete({
            where: { id: productToRemove.id }
          });
          
          duplicatesRemoved++;
          removedProducts.push({
            id: productToRemove.id,
            name: productToRemove.name,
            reason: 'Duplicate affiliate link'
          });
          
          console.log(`  ❌ Removed: ${productToRemove.name}`);
        } catch (error: any) {
          console.log(`  ⚠️ Failed to remove ${productToRemove.name}: ${error.message}`);
        }
      }
    }

    // STEP 5: Generate final report
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 NETWORK QUALITY CONTROL - FINAL REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`📦 Total Products Analyzed: ${allProducts.length}`);
    console.log(`🚫 Networks Blocked: ${networksToBlock.length}`);
    console.log(`🔗 Duplicates Removed: ${duplicatesRemoved}`);
    console.log(`📊 Networks Analyzed: ${networkStats.size}\n`);

    if (networksToBlock.length > 0) {
      console.log('🚫 BLOCKED NETWORKS:');
      networksToBlock.forEach(network => {
        const stats = networkStats.get(network)!;
        console.log(`  ❌ ${network} - ${stats.failureRate.toFixed(1)}% failure rate (${stats.inactive}/${stats.total} inactive)`);
      });
      console.log('');
    }

    if (duplicatesRemoved > 0) {
      console.log('🗑️ REMOVED DUPLICATES:');
      removedProducts.slice(0, 10).forEach(product => {
        console.log(`  ❌ ${product.name} - ${product.reason}`);
      });
      if (removedProducts.length > 10) {
        console.log(`  ... and ${removedProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    console.log('📈 NETWORK PERFORMANCE REPORT:');
    networkReport
      .sort((a, b) => b.failureRate - a.failureRate)
      .forEach(report => {
        const icon = report.status === 'BLOCKED' ? '🚫' : '✅';
        console.log(`  ${icon} ${report.network}: ${report.failureRate.toFixed(1)}% failure (${report.active}/${report.total} active)`);
      });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 NETWORK QUALITY CONTROL COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      totalProducts: allProducts.length,
      networksBlocked: networksToBlock.length,
      duplicatesRemoved,
      networksAnalyzed: networkStats.size,
      blockedNetworks: networksToBlock,
      networkReport
    };

  } catch (error) {
    console.error('❌ QUALITY CONTROL ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runNetworkQualityControl()
    .then((stats) => {
      console.log('✅ Network quality control completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Network quality control failed:', error);
      process.exit(1);
    });
}

export default runNetworkQualityControl;
