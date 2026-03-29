/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MONETIZATION VALIDATION ENGINE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script:
 * 1. Validates all affiliate links in the database
 * 2. Detects working vs broken affiliate products
 * 3. Updates database with validation results
 * 4. Soft deletes invalid products (is_active = false)
 * 5. Generates comprehensive validation report
 */

import prisma from '../src/prisma';

/**
 * Validates an affiliate link by checking if it's working and sellable
 */
async function validateAffiliateLink(url: string): Promise<{isValid: boolean, reason: string, statusCode?: number}> {
  console.log(`  🔍 Validating: ${url}`);
  
  try {
    // Basic URL validation
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, reason: 'Invalid protocol' };
    }

    // Make HTTP request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // Don't follow redirects automatically
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      }
    });

    clearTimeout(timeoutId);

    const statusCode = response.status;
    console.log(`    📊 Status: ${statusCode}`);

    // VALID responses
    if (statusCode === 200) {
      // Check if page contains real content (not error page)
      const text = await response.text();
      
      // Check for error indicators
      const errorIndicators = [
        'product not found',
        'product cannot be sold',
        'referral code invalid',
        'invalid affiliate',
        'link expired',
        'page not found',
        '404 error',
        'product unavailable',
        'sale ended',
        'offer expired'
      ];

      const hasError = errorIndicators.some(indicator => 
        text.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasError) {
        return { isValid: false, reason: 'Page contains error indicators', statusCode };
      }

      // Check for valid content indicators
      const validIndicators = [
        'add to cart',
        'buy now',
        'purchase',
        'order now',
        'checkout',
        'price',
        '$',
        'payment',
        'credit card',
        'secure checkout'
      ];

      const hasValidContent = validIndicators.some(indicator => 
        text.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasValidContent) {
        return { isValid: true, reason: 'Valid product page with purchase options', statusCode };
      }

      // If no clear indicators, assume valid (better than false negative)
      return { isValid: true, reason: 'Valid page (no error indicators found)', statusCode };
    }

    // REDIRECT responses (3xx) - follow them to check final destination
    if (statusCode >= 300 && statusCode < 400) {
      const location = response.headers.get('location');
      if (location) {
        console.log(`    🔄 Following redirect to: ${location}`);
        
        try {
          const redirectResponse = await fetch(location, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
          });

          if (redirectResponse.status === 200) {
            const redirectText = await redirectResponse.text();
            
            // Check redirect destination for errors
            const errorIndicators = [
              'product not found',
              'product cannot be sold',
              'referral code invalid',
              'invalid affiliate',
              'link expired'
            ];

            const hasError = errorIndicators.some(indicator => 
              redirectText.toLowerCase().includes(indicator.toLowerCase())
            );

            if (hasError) {
              return { isValid: false, reason: 'Redirect leads to error page', statusCode };
            }

            return { isValid: true, reason: 'Valid redirect to working page', statusCode };
          }
        } catch (redirectError) {
          return { isValid: false, reason: 'Redirect failed', statusCode };
        }
      }
    }

    // INVALID responses
    if (statusCode === 404) {
      return { isValid: false, reason: 'Page not found (404)', statusCode };
    }

    if (statusCode >= 400) {
      return { isValid: false, reason: `HTTP error ${statusCode}`, statusCode };
    }

    // Other status codes - assume invalid for safety
    return { isValid: false, reason: `Unexpected status code: ${statusCode}`, statusCode };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { isValid: false, reason: 'Request timeout' };
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { isValid: false, reason: 'Network error - domain not found' };
    }
    return { isValid: false, reason: `Network error: ${error.message}` };
  }
}

/**
 * Main validation engine
 */
async function runMonetizationValidation() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 MONETIZATION VALIDATION ENGINE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // STEP 1: Fetch all products with affiliate links
    console.log('📦 STEP 1: Fetching products with affiliate links...');
    
    const products = await prisma.product.findMany({
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
        is_active: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`✅ Found ${products.length} products with affiliate links\n`);

    // STEP 2: Validate each product
    console.log('🔍 STEP 2: Validating affiliate links...\n');
    
    let totalChecked = 0;
    let totalValid = 0;
    let totalInvalid = 0;
    const validProducts: {id: string, name: string, link: string, reason: string}[] = [];
    const invalidProducts: {id: string, name: string, link: string, reason: string, statusCode?: number}[] = [];
    const softDeletedProducts: string[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;
      
      console.log(`${progress} Checking: ${product.name}`);
      totalChecked++;

      const validation = await validateAffiliateLink(product.affiliate_link!);
      
      if (validation.isValid) {
        totalValid++;
        validProducts.push({
          id: product.id,
          name: product.name,
          link: product.affiliate_link!,
          reason: validation.reason
        });
        
        // Update database - ensure active
        await prisma.product.update({
          where: { id: product.id },
          data: {
            is_active: true,
          },
        });
        
        console.log(`    ✅ VALID: ${validation.reason}`);
      } else {
        totalInvalid++;
        invalidProducts.push({
          id: product.id,
          name: product.name,
          link: product.affiliate_link!,
          reason: validation.reason,
          statusCode: validation.statusCode
        });
        
        // Update database - soft delete
        await prisma.product.update({
          where: { id: product.id },
          data: {
            is_active: false, // Soft delete
          },
        });
        
        softDeletedProducts.push(product.name);
        console.log(`    ❌ INVALID: ${validation.reason}`);
      }
      
      console.log('');
      
      // Add delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // STEP 3: Generate final report
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VALIDATION COMPLETE - FINAL REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📦 Total Products Checked: ${totalChecked}`);
    console.log(`✅ Valid Products: ${totalValid}`);
    console.log(`❌ Invalid Products: ${totalInvalid}`);
    console.log(`🗑️ Products Soft Deleted: ${softDeletedProducts.length}`);
    console.log(`📈 Validation Success Rate: ${((totalValid / totalChecked) * 100).toFixed(2)}%\n`);

    if (validProducts.length > 0) {
      console.log('✅ VALID PRODUCTS (working and sellable):');
      validProducts.slice(0, 10).forEach(product => {
        console.log(`  📦 ${product.name}`);
        console.log(`     📎 ${product.link}`);
        console.log(`     ✅ ${product.reason}`);
      });
      if (validProducts.length > 10) {
        console.log(`  ... and ${validProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    if (invalidProducts.length > 0) {
      console.log('❌ INVALID PRODUCTS (broken or unsellable):');
      invalidProducts.slice(0, 10).forEach(product => {
        console.log(`  📦 ${product.name}`);
        console.log(`     📎 ${product.link}`);
        console.log(`     ❌ ${product.reason} ${product.statusCode ? `(Status: ${product.statusCode})` : ''}`);
      });
      if (invalidProducts.length > 10) {
        console.log(`  ... and ${invalidProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    if (softDeletedProducts.length > 0) {
      console.log('🗑️ SOFT DELETED PRODUCTS (set to inactive):');
      softDeletedProducts.slice(0, 10).forEach(name => {
        console.log(`  ❌ ${name}`);
      });
      if (softDeletedProducts.length > 10) {
        console.log(`  ... and ${softDeletedProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 MONETIZATION VALIDATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      totalChecked,
      totalValid,
      totalInvalid,
      softDeletedCount: softDeletedProducts.length,
      successRate: ((totalValid / totalChecked) * 100).toFixed(2),
    };

  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runMonetizationValidation()
    .then((stats) => {
      console.log('✅ Validation system completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Validation system failed:', error);
      process.exit(1);
    });
}

export default runMonetizationValidation;
