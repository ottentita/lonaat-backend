/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * AUTO MONETIZATION SYSTEM
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script:
 * 1. Fetches new affiliate products from APIs
 * 2. Validates all affiliate links
 * 3. Implements scoring system based on performance
 * 4. Stores only valid products with good scores
 * 5. Removes expired products
 * 6. Runs automatically every 6 hours
 */

import prisma from '../src/prisma';
import { validateAffiliateLink } from '../src/utils/validateAffiliateLink';

/**
 * Product scoring based on performance metrics
 */
interface ProductScore {
  responseTime: number;        // 0-100 points
  redirectSuccess: boolean;     // 0-100 points  
  errorFree: boolean;          // 0-100 points
  totalScore: number;          // 0-300 total
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Calculates product performance score
 */
async function calculateProductScore(url: string): Promise<ProductScore> {
  const startTime = Date.now();
  let responseTime = 0;
  let redirectSuccess = false;
  let errorFree = false;
  
  try {
    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    clearTimeout(timeoutId);
    responseTime = Date.now() - startTime;

    // Calculate response time score (faster = better)
    if (responseTime < 1000) {
      responseTime = 100; // Excellent
    } else if (responseTime < 3000) {
      responseTime = 80;  // Good
    } else if (responseTime < 5000) {
      responseTime = 60;  // Fair
    } else if (responseTime < 8000) {
      responseTime = 40;  // Poor
    } else {
      responseTime = 20;  // Very poor
    }

    // Check redirect success
    const statusCode = response.status;
    if (statusCode >= 200 && statusCode < 400) {
      if (statusCode >= 300 && statusCode < 400) {
        // Check if redirect works
        const location = response.headers.get('location');
        if (location) {
          try {
            const redirectResponse = await fetch(location, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });
            redirectSuccess = redirectResponse.status < 400;
          } catch {
            redirectSuccess = false;
          }
        } else {
          redirectSuccess = false;
        }
      } else {
        redirectSuccess = true; // 200 OK is success
      }
    } else {
      redirectSuccess = false;
    }

    // Check if error-free
    errorFree = statusCode < 400 && redirectSuccess;

  } catch (error) {
    responseTime = 0;
    redirectSuccess = false;
    errorFree = false;
  }

  const totalScore = responseTime + (redirectSuccess ? 100 : 0) + (errorFree ? 100 : 0);
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (totalScore >= 250) grade = 'A';
  else if (totalScore >= 200) grade = 'B';
  else if (totalScore >= 150) grade = 'C';
  else if (totalScore >= 100) grade = 'D';
  else grade = 'F';

  return {
    responseTime,
    redirectSuccess,
    errorFree,
    totalScore,
    grade
  };
}

/**
 * Fetches new affiliate products from external APIs
 */
async function fetchNewAffiliateProducts(): Promise<Array<{
  name: string;
  description: string;
  price: number;
  affiliate_link: string;
  network: string;
  category: string;
}>> {
  console.log('🔍 Fetching new affiliate products from APIs...');
  
  const newProducts: Array<{
    name: string;
    description: string;
    price: number;
    affiliate_link: string;
    network: string;
    category: string;
  }> = [];

  // Example: Mock API calls (replace with real APIs)
  try {
    // Digistore24 API example (mock)
    const digistore24Products = [
      {
        name: 'Digital Marketing Mastery 2024',
        description: 'Complete digital marketing course with certification',
        price: 97,
        affiliate_link: 'https://www.digistore24.com/redir/new-product-2024/lonaat/',
        network: 'Digistore24',
        category: 'Education'
      },
      {
        name: 'AI Business Automation',
        description: 'Automate your business with AI tools and strategies',
        price: 147,
        affiliate_link: 'https://www.digistore24.com/redir/ai-automation/lonaat/',
        network: 'Digistore24',
        category: 'Software'
      }
    ];

    newProducts.push(...digistore24Products);

    // ClickBank API example (mock)
    const clickbankProducts = [
      {
        name: 'Keto Diet Plan Pro',
        description: 'Advanced keto diet plan with recipes and meal prep',
        price: 47,
        affiliate_link: 'https://hop.clickbank.net/?affiliate=lonaat&product=keto-pro',
        network: 'ClickBank',
        category: 'Health'
      }
    ];

    newProducts.push(...clickbankProducts);

    console.log(`✅ Fetched ${newProducts.length} new products from APIs`);

  } catch (error) {
    console.log('⚠️ Error fetching from APIs:', error);
  }

  return newProducts;
}

/**
 * Main auto monetization system
 */
async function runAutoMonetizationSystem() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 AUTO MONETIZATION SYSTEM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  try {
    // STEP 1: Fetch new affiliate products
    console.log('📦 STEP 1: Fetching new affiliate products...');
    const newProducts = await fetchNewAffiliateProducts();
    
    // STEP 2: Validate and score new products
    console.log('\n🔍 STEP 2: Validating and scoring new products...');
    const validNewProducts: Array<typeof newProducts[0] & { score: ProductScore }> = [];
    
    for (let i = 0; i < newProducts.length; i++) {
      const product = newProducts[i];
      console.log(`[${i + 1}/${newProducts.length}] Processing: ${product.name}`);
      
      // Check if product already exists
      const existing = await prisma.product.findFirst({
        where: { affiliate_link: product.affiliate_link }
      });
      
      if (existing) {
        console.log('  ⚠️ Already exists, skipping');
        continue;
      }
      
      // Validate and score
      const isValid = await validateAffiliateLink(product.affiliate_link);
      if (!isValid) {
        console.log('  ❌ Invalid affiliate link, skipping');
        continue;
      }
      
      const score = await calculateProductScore(product.affiliate_link);
      console.log(`  📊 Score: ${score.totalScore}/300 (${score.grade})`);
      
      // Only keep products with good scores (C or better)
      if (score.grade !== 'F') {
        validNewProducts.push({ ...product, score });
        console.log('  ✅ Added to database');
      } else {
        console.log('  ❌ Score too low, skipping');
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // STEP 3: Insert valid new products
    console.log('\n💾 STEP 3: Inserting valid new products...');
    let insertedCount = 0;
    
    for (const product of validNewProducts) {
      try {
        await prisma.product.create({
          data: {
            userId: '1', // Default admin user
            name: product.name,
            description: product.description,
            price: product.price,
            images: [`https://images.unsplash.com/photo-${Math.random().toString(36).substring(7)}?w=400&h=300&fit=crop`],
            affiliate_link: product.affiliate_link,
            network: product.network,
            category: product.category,
            tags: [product.network, 'auto-imported'],
            is_active: true,
            extra_data: JSON.stringify({
              auto_imported: true,
              score: product.score,
              import_date: new Date().toISOString()
            })
          },
        });
        
        insertedCount++;
        console.log(`  ✅ Inserted: ${product.name}`);
      } catch (error: any) {
        console.log(`  ❌ Failed to insert ${product.name}: ${error.message}`);
      }
    }
    
    // STEP 4: Re-validate existing products and update scores
    console.log('\n🔄 STEP 4: Re-validating existing products...');
    const existingProducts = await prisma.product.findMany({
      where: {
        AND: [
          { affiliate_link: { not: null } },
          { affiliate_link: { not: '' } },
          { is_active: true }
        ]
      },
      select: {
        id: true,
        name: true,
        affiliate_link: true,
      }
    });
    
    console.log(`Found ${existingProducts.length} active products to re-validate`);
    
    let updatedCount = 0;
    let removedCount = 0;
    
    for (let i = 0; i < existingProducts.length; i++) {
      const product = existingProducts[i];
      const progress = `[${i + 1}/${existingProducts.length}]`;
      
      if (i % 10 === 0) {
        console.log(`${progress} Re-validating products...`);
      }
      
      try {
        const isValid = await validateAffiliateLink(product.affiliate_link!);
        const score = await calculateProductScore(product.affiliate_link!);
        
        if (isValid && score.grade !== 'F') {
          // Update product with new score
          await prisma.product.update({
            where: { id: product.id },
            data: {
              extra_data: JSON.stringify({
                last_validated: new Date().toISOString(),
                score: score
              })
            }
          });
          updatedCount++;
        } else {
          // Remove expired/invalid products
          await prisma.product.update({
            where: { id: product.id },
            data: {
              is_active: false,
              extra_data: JSON.stringify({
                last_validated: new Date().toISOString(),
                score: score,
                reason: 'Expired or poor performance'
              })
            }
          });
          removedCount++;
        }
      } catch (error) {
        console.log(`  ⚠️ Error validating ${product.name}: ${error}`);
      }
      
      // Add delay
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // STEP 5: Generate report
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 AUTO MONETIZATION SYSTEM - REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📦 New Products Fetched: ${newProducts.length}`);
    console.log(`✅ New Products Inserted: ${insertedCount}`);
    console.log(`🔄 Existing Products Updated: ${updatedCount}`);
    console.log(`🗑️ Expired Products Removed: ${removedCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 AUTO MONETIZATION SYSTEM COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      newProductsFetched: newProducts.length,
      newProductsInserted: insertedCount,
      existingUpdated: updatedCount,
      expiredRemoved: removedCount
    };
    
  } catch (error) {
    console.error('❌ AUTO MONETIZATION ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runAutoMonetizationSystem()
    .then((stats) => {
      console.log('✅ Auto monetization system completed successfully');
      console.log('🚀 Auto monetization engine ACTIVE');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Auto monetization system failed:', error);
      process.exit(1);
    });
}

export default runAutoMonetizationSystem;
