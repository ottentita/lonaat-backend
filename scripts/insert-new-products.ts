/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * INSERT NEW PRODUCTS FROM AFFILIATE LINKS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This script:
 * 1. Creates NEW product entries using provided affiliate links
 * 2. Auto-generates product details from links
 * 3. Detects network from domain
 * 4. Inserts only new products (no duplicates)
 * 5. Generates comprehensive report
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
 * Generate product name from URL
 */
function generateProductName(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    // Extract name from domain and path
    if (domain.includes('jvz5')) return 'JVZoo Affiliate Product';
    if (domain.includes('advancedbionutritionals')) return 'Advanced Bio Nutritionals';
    if (domain.includes('ingeniuswave')) return 'Ingenius Wave';
    if (domain.includes('uswaterrevolution')) return 'US Water Revolution';
    if (domain.includes('heikoboos')) return 'Heiko Boos Product';
    if (domain.includes('checkout-ds24')) return 'Digistore24 Product';
    if (domain.includes('clickdesigns')) return 'Click Designs';
    if (domain.includes('betterdailyguide')) return 'Better Daily Guide';
    if (domain.includes('pinealguardianvip')) return 'Pineal Guardian';
    if (domain.includes('mdrnremedy')) return 'Modern Remedy';
    if (domain.includes('nervefresh24')) return 'Nerve Fresh';
    if (domain.includes('theneuroprime')) return 'Neuro Prime';
    if (domain.includes('dentalsugarhack')) return 'Dental Sugar Hack';
    if (domain.includes('digistore24')) return 'Digistore24 Product';
    if (domain.includes('zeneara')) return 'Zeneara';
    if (domain.includes('renewyourhair')) return 'Renew Your Hair';
    if (domain.includes('jointpainhack')) return 'Joint Pain Hack';
    if (domain.includes('theneurovera')) return 'Neuro Vera';
    if (domain.includes('weightlossover40')) return 'Weight Loss Over 40';
    if (domain.includes('millenia-xpose')) return 'Millenia Xpose';
    if (domain.includes('skin-reset')) return 'Skin Reset';
    
    // Fallback: use domain name
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
  } catch {
    return 'Affiliate Product';
  }
}

/**
 * Detect network from URL
 */
function detectNetwork(url: string): string {
  if (url.includes('jvz5.com')) return 'JVZoo';
  if (url.includes('digistore24.com') || url.includes('checkout-ds24.com')) return 'Digistore24';
  if (url.includes('kajabi.com')) return 'Kajabi';
  if (url.includes('advancedbionutritionals.com')) return 'Advanced Bio Nutritionals';
  if (url.includes('mykajabi.com')) return 'Kajabi';
  return 'Unknown';
}

/**
 * Generate random price between 10-200
 */
function generateRandomPrice(): number {
  return Math.floor(Math.random() * (200 - 10 + 1)) + 10;
}

/**
 * Generate placeholder image URL
 */
function generatePlaceholderImage(): string {
  const seed = Math.random().toString(36).substring(7);
  return `https://images.unsplash.com/photo-${seed}?w=400&h=300&fit=crop`;
}

/**
 * Insert new products from affiliate links
 */
async function insertNewProducts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 INSERTING NEW PRODUCTS FROM AFFILIATE LINKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // STEP 1: Get existing affiliate links to check for duplicates
    console.log('🔍 STEP 1: Checking for existing affiliate links...');
    
    const existingProducts = await prisma.product.findMany({
      select: {
        affiliate_link: true,
      },
    });

    const existingLinks = new Set(existingProducts.map(p => p.affiliate_link).filter(Boolean));
    console.log(`✅ Found ${existingLinks.size} existing affiliate links\n`);

    // STEP 2: Filter out duplicates
    console.log('🔧 STEP 2: Filtering out duplicate links...');
    
    const newLinks = AFFILIATE_LINKS.filter(link => !existingLinks.has(link));
    const duplicateCount = AFFILIATE_LINKS.length - newLinks.length;
    
    console.log(`📊 Total links provided: ${AFFILIATE_LINKS.length}`);
    console.log(`✅ New links to insert: ${newLinks.length}`);
    console.log(`⚠️ Duplicate links skipped: ${duplicateCount}\n`);

    // STEP 3: Insert new products
    console.log('📦 STEP 3: Inserting new products...\n');
    
    let insertedCount = 0;
    let skippedCount = duplicateCount;
    const insertedProducts: {name: string, link: string, network: string, price: number}[] = [];
    const skippedProducts: {link: string, reason: string}[] = [];

    // Add skipped duplicates to list
    AFFILIATE_LINKS.forEach(link => {
      if (existingLinks.has(link)) {
        skippedProducts.push({
          link,
          reason: 'Already exists in database'
        });
      }
    });

    for (let i = 0; i < newLinks.length; i++) {
      const link = newLinks[i];
      const progress = `[${i + 1}/${newLinks.length}]`;
      
      console.log(`${progress} Inserting: ${link}`);

      try {
        const productName = generateProductName(link);
        const network = detectNetwork(link);
        const price = generateRandomPrice();
        const imageUrl = generatePlaceholderImage();
        
        // Create new product
        const newProduct = await prisma.product.create({
          data: {
            userId: '1', // Default admin user
            name: productName,
            description: 'Affiliate product',
            price: price,
            images: [imageUrl],
            affiliate_link: link,
            category: 'Affiliate',
            tags: [network],
            isActive: true,
            is_valid: true,
          },
        });

        insertedCount++;
        insertedProducts.push({
          name: productName,
          link: link,
          network: network,
          price: price
        });
        
        console.log(`  ✅ Inserted: ${productName} (ID: ${newProduct.id})`);
        console.log(`  💰 Price: $${price}`);
        console.log(`  🌐 Network: ${network}`);
      } catch (error: any) {
        console.log(`  ❌ Insert failed: ${error.message}`);
        skippedCount++;
        skippedProducts.push({
          link,
          reason: `Database error: ${error.message}`
        });
      }
      
      console.log('');
    }

    // STEP 4: Get final product count
    const finalProductCount = await prisma.product.count();

    // STEP 5: Generate final report
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 INSERTION COMPLETE - FINAL REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`📦 Products Inserted: ${insertedCount}`);
    console.log(`⚠️ Products Skipped: ${skippedCount}`);
    console.log(`📊 New Total Products: ${finalProductCount}`);
    console.log(`📈 Insertion Success Rate: ${newLinks.length > 0 ? ((insertedCount / newLinks.length) * 100).toFixed(2) : '0.00'}%\n`);

    if (insertedProducts.length > 0) {
      console.log('✅ INSERTED PRODUCTS:');
      insertedProducts.slice(0, 10).forEach(product => {
        console.log(`  📦 ${product.name}`);
        console.log(`     💰 $${product.price}`);
        console.log(`     🌐 ${product.network}`);
        console.log(`     📎 ${product.link}`);
      });
      if (insertedProducts.length > 10) {
        console.log(`  ... and ${insertedProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    if (skippedProducts.length > 0) {
      console.log('⚠️ SKIPPED LINKS:');
      skippedProducts.slice(0, 10).forEach(product => {
        console.log(`  📎 ${product.link.substring(0, 60)}... - ${product.reason}`);
      });
      if (skippedProducts.length > 10) {
        console.log(`  ... and ${skippedProducts.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 PRODUCT INSERTION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      insertedCount,
      skippedCount,
      finalProductCount,
      successRate: newLinks.length > 0 ? ((insertedCount / newLinks.length) * 100).toFixed(2) : '0.00',
    };

  } catch (error) {
    console.error('❌ INSERTION ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  insertNewProducts()
    .then((stats) => {
      console.log('✅ Product insertion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Product insertion failed:', error);
      process.exit(1);
    });
}

export default insertNewProducts;
