/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * UPDATE PRODUCT AFFILIATE LINKS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script:
 * 1. Fetches all products ordered by ID ascending
 * 2. Assigns provided affiliate links sequentially to products
 * 3. Validates all links are HTTPS only
 * 4. Updates database with new affiliate links and is_valid=true
 * 5. Generates report of updated vs skipped products
 */

import prisma from '../src/prisma';

// Provided dataset of affiliate links
const AFFILIATE_LINKS = [
  "https://jvz5.com/c/3378503/426415/",
  "https://www.advancedbionutritionals.com/DS24/Advanced-Amino/Muscle-Mass-Loss/HD.htm#aff=lonaat",
  "https://ingeniuswave.com/DSvsl/#aff=Haraplsodha",
  "https://uswaterrevolution.com/#aff=lonaat",
  "https://heikoboos.com/save-money#aff=lonaat",
  "https://heikoboos.com/10-mega-plr-video-courses#aff=lonaat",
  "https://www.checkout-ds24.com/redir/651003/lonaat/",
  "https://www.checkout-ds24.com/redir/606273/lonaat/",
  "https://clickdesigns.com/dg/cd/#aff=lonaat",
  "https://www.checkout-ds24.com/redir/606481/lonaat/",
  "https://www.checkout-ds24.com/redir/598501/lonaat/",
  "https://betterdailyguide.site/ds24/digital-products-academy#aff=lonaat",
  "https://pinealguardianvip.com/ds/indexts.php#aff=lonaat",
  "https://mdrnremedy.com/#aff=lonaat",
  "https://secure.nervefresh24.com/index-nf-ds#aff=lonaat",
  "https://theneuroprime.com/ds/go/indexvs.php#aff=lonaat",
  "https://dentalsugarhack.vip/discovery#aff=lonaat",
  "https://www.digistore24.com/redir/466293/lonaat/",
  "https://www.digistore24.com/redir/501717/lonaat/",
  "https://zeneara.com/ds/go/indexvs.php#aff=lonaat",
  "https://www.advancedbionutritionals.com/DS24/Advanced-Joint/Beat-Joint-Pain-With-Cucumbers.htm#aff=lonaat",
  "https://www.digistore24.com/redir/442614/lonaat/",
  "https://renewyourhair.com/ds24c/#aff=lonaat",
  "https://betterdailyguide.site/ds24/the-first-time-chicken-keepers-checklist#aff=lonaat",
  "https://betterdailyguide.site/sleep-hacking#aff=lonaat",
  "https://jointpainhack.com/digi/add-to-cart/#aff=lonaat",
  "https://www.digistore24.com/redir/419540/lonaat/",
  "https://theneurovera.com/ds/go/indexts.php#aff=lonaat",
  "https://weightlossover40.site/#aff=lonaat",
  "https://millenia-xpose.mykajabi.com/millenia-xpose-s-mens-mental-health-5680d530-79b9-40fe-86c1-2998722f7157#aff=lonaat",
  "https://skin-reset.evaglow.beauty/#aff=lonaat"
];

/**
 * Validates that a link starts with https://
 */
function isValidHttpsLink(link: string): boolean {
  return link.startsWith('https://');
}

/**
 * Updates affiliate links for all products
 */
async function updateAffiliateLinks() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 UPDATING PRODUCT AFFILIATE LINKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // STEP 1: Validate all provided links
    console.log('🔍 STEP 1: Validating provided affiliate links...');
    
    const validLinks = AFFILIATE_LINKS.filter(link => {
      const isValid = isValidHttpsLink(link);
      if (!isValid) {
        console.log(`❌ Invalid link (not HTTPS): ${link}`);
      }
      return isValid;
    });

    const invalidLinks = AFFILIATE_LINKS.length - validLinks.length;
    
    console.log(`✅ Valid links: ${validLinks.length}`);
    if (invalidLinks > 0) {
      console.log(`❌ Invalid links: ${invalidLinks}`);
    }
    console.log('');

    // STEP 2: Fetch all products ordered by ID ascending
    console.log('📦 STEP 2: Fetching all products...');
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        affiliate_link: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`✅ Found ${products.length} products\n`);

    // STEP 3: Update products with affiliate links
    console.log('🔧 STEP 3: Updating products with affiliate links...\n');
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updatedProducts: {id: string, name: string, link: string}[] = [];
    const skippedProducts: {id: string, name: string, reason: string}[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;
      
      // Check if we have a link available for this product
      if (i >= validLinks.length) {
        console.log(`${progress} ⚠️ Skipped: ${product.name} - No affiliate link available`);
        skippedCount++;
        skippedProducts.push({
          id: product.id,
          name: product.name,
          reason: 'No affiliate link available'
        });
        continue;
      }

      const affiliateLink = validLinks[i];
      
      console.log(`${progress} Updating: ${product.name}`);
      console.log(`  📎 New link: ${affiliateLink}`);

      try {
        // Update product with new affiliate link
        await prisma.product.update({
          where: { id: product.id },
          data: {
            affiliate_link: affiliateLink,
          },
        });

        updatedCount++;
        updatedProducts.push({
          id: product.id,
          name: product.name,
          link: affiliateLink
        });
        
        console.log(`  ✅ Updated successfully`);
      } catch (error: any) {
        console.log(`  ❌ Update failed: ${error.message}`);
        skippedCount++;
        skippedProducts.push({
          id: product.id,
          name: product.name,
          reason: `Database error: ${error.message}`
        });
      }
      
      console.log('');
    }

    // STEP 4: Generate final report
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 UPDATE COMPLETE - FINAL REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📦 Total Products: ${products.length}`);
    console.log(`🔗 Available Links: ${validLinks.length}`);
    console.log(`✅ Products Updated: ${updatedCount}`);
    console.log(`⚠️ Products Skipped: ${skippedCount}`);
    console.log(`❌ Invalid Links: ${invalidLinks}`);
    console.log(`📈 Update Success Rate: ${products.length > 0 ? ((updatedCount / products.length) * 100).toFixed(2) : '0.00'}%\n`);

    if (updatedProducts.length > 0) {
      console.log('✅ UPDATED PRODUCTS:');
      updatedProducts.slice(0, 10).forEach(product => {
        console.log(`  📦 ${product.name}`);
        console.log(`     📎 ${product.link}`);
      });
      if (updatedProducts.length > 10) {
        console.log(`  ... and ${updatedProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    if (skippedProducts.length > 0) {
      console.log('⚠️ SKIPPED PRODUCTS:');
      skippedProducts.slice(0, 10).forEach(product => {
        console.log(`  📦 ${product.name} - ${product.reason}`);
      });
      if (skippedProducts.length > 10) {
        console.log(`  ... and ${skippedProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 AFFILIATE LINK UPDATE COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      totalProducts: products.length,
      availableLinks: validLinks.length,
      updatedCount,
      skippedCount,
      invalidLinks,
      successRate: products.length > 0 ? ((updatedCount / products.length) * 100).toFixed(2) : '0.00',
    };

  } catch (error) {
    console.error('❌ UPDATE ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  updateAffiliateLinks()
    .then((stats) => {
      console.log('✅ Affiliate link update completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Affiliate link update failed:', error);
      process.exit(1);
    });
}

export default updateAffiliateLinks;
