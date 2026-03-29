/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * STEP 6: SAFE DATABASE CLEANING - REVALIDATE ALL PRODUCTS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script:
 * 1. Marks all products as invalid (is_valid = false)
 * 2. Re-validates each product's affiliate link
 * 3. Updates is_valid = true only for products that pass validation
 * 4. Generates a report of valid vs invalid products
 */

import prisma from '../src/prisma';
import { validateAffiliateLink } from '../src/utils/validateAffiliateLink';

async function revalidateAllProducts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 STARTING PRODUCT REVALIDATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // STEP 1: Mark all products as invalid
    console.log('📝 STEP 1: Marking all products as invalid...');
    const markInvalidResult = await prisma.product.updateMany({
      data: {
        isValid: false,
      },
    });
    console.log(`✅ Marked ${markInvalidResult.count} products as invalid\n`);

    // STEP 2: Get all products
    console.log('📦 STEP 2: Fetching all products...');
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        affiliateLink: true,
      },
    });
    console.log(`✅ Found ${allProducts.length} products to validate\n`);

    // STEP 3: Validate each product
    console.log('🔍 STEP 3: Validating affiliate links...\n');
    
    let validCount = 0;
    let invalidCount = 0;
    const validProducts: string[] = [];
    const invalidProducts: string[] = [];

    for (let i = 0; i < allProducts.length; i++) {
      const product = allProducts[i];
      const progress = `[${i + 1}/${allProducts.length}]`;
      
      console.log(`${progress} Validating: ${product.name}`);
      
      if (!product.affiliateLink) {
        console.log(`  ❌ No affiliate link`);
        invalidCount++;
        invalidProducts.push(product.name);
        continue;
      }

      const isValid = await validateAffiliateLink(product.affiliateLink);
      
      if (isValid) {
        // Update product to mark as valid
        await prisma.product.update({
          where: { id: product.id },
          data: { isValid: true },
        });
        validCount++;
        validProducts.push(product.name);
        console.log(`  ✅ Valid`);
      } else {
        invalidCount++;
        invalidProducts.push(product.name);
        console.log(`  ❌ Invalid`);
      }

      // Add small delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // STEP 4: Generate report
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 REVALIDATION COMPLETE - FINAL REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`✅ Valid Products: ${validCount}`);
    console.log(`❌ Invalid Products: ${invalidCount}`);
    console.log(`📦 Total Products: ${allProducts.length}`);
    console.log(`📈 Success Rate: ${((validCount / allProducts.length) * 100).toFixed(2)}%\n`);

    if (validProducts.length > 0) {
      console.log('✅ VALID PRODUCTS:');
      validProducts.slice(0, 10).forEach(name => console.log(`  - ${name}`));
      if (validProducts.length > 10) {
        console.log(`  ... and ${validProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    if (invalidProducts.length > 0) {
      console.log('❌ INVALID PRODUCTS:');
      invalidProducts.slice(0, 10).forEach(name => console.log(`  - ${name}`));
      if (invalidProducts.length > 10) {
        console.log(`  ... and ${invalidProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 SYSTEM STATUS: STABLE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      total: allProducts.length,
      valid: validCount,
      invalid: invalidCount,
      successRate: ((validCount / allProducts.length) * 100).toFixed(2),
    };

  } catch (error) {
    console.error('❌ REVALIDATION ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  revalidateAllProducts()
    .then((stats) => {
      console.log('✅ Revalidation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Revalidation failed:', error);
      process.exit(1);
    });
}

export default revalidateAllProducts;
