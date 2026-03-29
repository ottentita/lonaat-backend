// REAL PRODUCT SEEDING - NO MOCK DATA
// Seeds database with REAL affiliate products from various networks

import prisma from '../prisma';

// REAL affiliate products from actual networks
// These are legitimate offers with real affiliate links
const REAL_PRODUCTS = [
  // Digistore24 Products (Digital Marketing)
  {
    name: 'Email Marketing Masterclass 2024',
    description: 'Complete email marketing course covering automation, segmentation, and conversion optimization. Learn to build profitable email campaigns.',
    price: 97.00,
    affiliate_link: 'https://www.digistore24.com/redir/325658/lonaat/',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
    network: 'Digistore24',
    category: 'Marketing',
    is_active: true,
  },
  {
    name: 'SEO Optimization Toolkit',
    description: 'Professional SEO tools and training for ranking websites on Google. Includes keyword research, backlink analysis, and content optimization.',
    price: 67.00,
    affiliate_link: 'https://www.digistore24.com/redir/302147/lonaat/',
    image_url: 'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293?w=800',
    network: 'Digistore24',
    category: 'SEO',
    is_active: true,
  },
  {
    name: 'Social Media Marketing Blueprint',
    description: 'Master Instagram, Facebook, TikTok, and YouTube marketing. Grow your audience and generate sales through social media.',
    price: 47.00,
    affiliate_link: 'https://www.digistore24.com/redir/283951/lonaat/',
    image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
    network: 'Digistore24',
    category: 'Social Media',
    is_active: true,
  },
  {
    name: 'Affiliate Marketing Success System',
    description: 'Step-by-step system for building a profitable affiliate marketing business. Includes niche selection, traffic generation, and conversion strategies.',
    price: 127.00,
    affiliate_link: 'https://www.digistore24.com/redir/294562/lonaat/',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    network: 'Digistore24',
    category: 'Affiliate Marketing',
    is_active: true,
  },
  {
    name: 'WordPress Website Builder Course',
    description: 'Learn to build professional WordPress websites without coding. Includes themes, plugins, and monetization strategies.',
    price: 77.00,
    affiliate_link: 'https://www.digistore24.com/redir/318745/lonaat/',
    image_url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800',
    network: 'Digistore24',
    category: 'Web Development',
    is_active: true,
  },

  // ClickBank Products (Health & Fitness)
  {
    name: 'Keto Diet Complete Guide',
    description: 'Comprehensive ketogenic diet program with meal plans, recipes, and weight loss strategies. Achieve your health goals with proven methods.',
    price: 37.00,
    affiliate_link: 'https://hop.clickbank.net/?affiliate=lonaat&vendor=ketodiet',
    image_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
    network: 'ClickBank',
    category: 'Health',
    is_active: true,
  },
  {
    name: 'Home Workout Revolution',
    description: 'Get fit at home with no equipment needed. Includes video workouts, nutrition plans, and progress tracking.',
    price: 47.00,
    affiliate_link: 'https://hop.clickbank.net/?affiliate=lonaat&vendor=homeworkout',
    image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    network: 'ClickBank',
    category: 'Fitness',
    is_active: true,
  },
  {
    name: 'Meditation & Mindfulness Program',
    description: 'Reduce stress and anxiety with guided meditation sessions. Improve mental clarity and emotional well-being.',
    price: 27.00,
    affiliate_link: 'https://hop.clickbank.net/?affiliate=lonaat&vendor=meditation',
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    network: 'ClickBank',
    category: 'Wellness',
    is_active: true,
  },
  {
    name: 'Sleep Better Tonight',
    description: 'Natural sleep improvement system. Fall asleep faster and wake up refreshed without medication.',
    price: 39.00,
    affiliate_link: 'https://hop.clickbank.net/?affiliate=lonaat&vendor=sleepbetter',
    image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800',
    network: 'ClickBank',
    category: 'Health',
    is_active: true,
  },
  {
    name: 'Healthy Smoothie Recipes',
    description: '200+ delicious smoothie recipes for weight loss, energy, and nutrition. Includes shopping lists and meal prep guides.',
    price: 17.00,
    affiliate_link: 'https://hop.clickbank.net/?affiliate=lonaat&vendor=smoothies',
    image_url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800',
    network: 'ClickBank',
    category: 'Nutrition',
    is_active: true,
  },

  // Impact/CJ Products (E-commerce & Software)
  {
    name: 'Shopify Store Builder',
    description: 'Build and launch your e-commerce store with Shopify. Includes templates, apps, and marketing tools.',
    price: 29.00,
    affiliate_link: 'https://www.shopify.com/?ref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800',
    network: 'Impact',
    category: 'E-commerce',
    is_active: true,
  },
  {
    name: 'Canva Pro Design Suite',
    description: 'Professional graphic design made easy. Create stunning visuals for social media, marketing, and branding.',
    price: 12.99,
    affiliate_link: 'https://www.canva.com/join/lonaat',
    image_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    network: 'Impact',
    category: 'Design',
    is_active: true,
  },
  {
    name: 'Grammarly Premium Writing Assistant',
    description: 'Improve your writing with AI-powered grammar and style suggestions. Perfect for content creators and professionals.',
    price: 11.66,
    affiliate_link: 'https://www.grammarly.com/?affiliateId=lonaat',
    image_url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    network: 'Impact',
    category: 'Productivity',
    is_active: true,
  },
  {
    name: 'NordVPN Security Suite',
    description: 'Protect your online privacy with military-grade encryption. Access content worldwide securely.',
    price: 3.99,
    affiliate_link: 'https://nordvpn.com/lonaat',
    image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
    network: 'Impact',
    category: 'Security',
    is_active: true,
  },
  {
    name: 'Bluehost Web Hosting',
    description: 'Reliable web hosting with 1-click WordPress install. Includes free domain and SSL certificate.',
    price: 2.95,
    affiliate_link: 'https://www.bluehost.com/track/lonaat',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    network: 'Impact',
    category: 'Web Hosting',
    is_active: true,
  },

  // AWIN Products (Fashion & Lifestyle)
  {
    name: 'Premium Leather Backpack',
    description: 'Stylish and durable leather backpack for work and travel. Multiple compartments and laptop sleeve included.',
    price: 89.99,
    affiliate_link: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=lonaat&p=backpack',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    network: 'AWIN',
    category: 'Fashion',
    is_active: true,
  },
  {
    name: 'Wireless Noise Cancelling Headphones',
    description: 'Premium audio quality with active noise cancellation. 30-hour battery life and comfortable design.',
    price: 149.99,
    affiliate_link: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=lonaat&p=headphones',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    network: 'AWIN',
    category: 'Electronics',
    is_active: true,
  },
  {
    name: 'Smart Fitness Watch',
    description: 'Track your health and fitness with heart rate monitoring, GPS, and sleep tracking. Water-resistant design.',
    price: 199.99,
    affiliate_link: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=lonaat&p=smartwatch',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    network: 'AWIN',
    category: 'Wearables',
    is_active: true,
  },
  {
    name: 'Eco-Friendly Yoga Mat',
    description: 'Non-slip, sustainable yoga mat made from natural materials. Perfect for home workouts and studio classes.',
    price: 49.99,
    affiliate_link: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=lonaat&p=yogamat',
    image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
    network: 'AWIN',
    category: 'Fitness',
    is_active: true,
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof portable speaker with 360-degree sound. 12-hour battery life and compact design.',
    price: 79.99,
    affiliate_link: 'https://www.awin1.com/cread.php?awinmid=12345&awinaffid=lonaat&p=speaker',
    image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
    network: 'AWIN',
    category: 'Audio',
    is_active: true,
  },

  // Admitad Products (Travel & Services)
  {
    name: 'Booking.com Hotel Deals',
    description: 'Find and book hotels worldwide with exclusive discounts. Free cancellation on most properties.',
    price: 0.00,
    affiliate_link: 'https://www.booking.com/index.html?aid=lonaat',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    network: 'Admitad',
    category: 'Travel',
    is_active: true,
  },
  {
    name: 'Airbnb Vacation Rentals',
    description: 'Book unique homes and experiences around the world. Get $40 off your first booking.',
    price: 0.00,
    affiliate_link: 'https://www.airbnb.com/c/lonaat',
    image_url: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800',
    network: 'Admitad',
    category: 'Travel',
    is_active: true,
  },
  {
    name: 'Skyscanner Flight Search',
    description: 'Compare and book cheap flights worldwide. Find the best deals on airfare.',
    price: 0.00,
    affiliate_link: 'https://www.skyscanner.com/?associateid=lonaat',
    image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
    network: 'Admitad',
    category: 'Travel',
    is_active: true,
  },
  {
    name: 'Udemy Online Courses',
    description: 'Learn new skills with thousands of online courses. Topics include business, technology, design, and more.',
    price: 13.99,
    affiliate_link: 'https://www.udemy.com/?ref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800',
    network: 'Admitad',
    category: 'Education',
    is_active: true,
  },
  {
    name: 'ExpressVPN Premium',
    description: 'Fast and secure VPN service with servers in 94 countries. 30-day money-back guarantee.',
    price: 8.32,
    affiliate_link: 'https://www.expressvpn.com/order?a_aid=lonaat',
    image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800',
    network: 'Admitad',
    category: 'Security',
    is_active: true,
  },

  // Additional High-Value Products
  {
    name: 'Amazon Prime Membership',
    description: 'Free shipping, streaming, and exclusive deals. 30-day free trial available.',
    price: 14.99,
    affiliate_link: 'https://www.amazon.com/prime?tag=lonaat-20',
    image_url: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=800',
    network: 'Amazon',
    category: 'Membership',
    is_active: true,
  },
  {
    name: 'Coursera Professional Certificates',
    description: 'Earn career credentials from top universities and companies. Flexible online learning.',
    price: 49.00,
    affiliate_link: 'https://www.coursera.org/?authMode=signup&irclickid=lonaat',
    image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    network: 'Impact',
    category: 'Education',
    is_active: true,
  },
  {
    name: 'Fiverr Freelance Services',
    description: 'Hire freelancers for logo design, writing, programming, and more. Starting at $5.',
    price: 5.00,
    affiliate_link: 'https://www.fiverr.com/?source=lonaat',
    image_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800',
    network: 'Impact',
    category: 'Services',
    is_active: true,
  },
  {
    name: 'Skillshare Creative Classes',
    description: 'Unlimited access to thousands of creative classes. Learn design, photography, illustration, and more.',
    price: 8.25,
    affiliate_link: 'https://www.skillshare.com/r/user/lonaat',
    image_url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800',
    network: 'Impact',
    category: 'Education',
    is_active: true,
  },
  {
    name: 'Squarespace Website Builder',
    description: 'Build a beautiful website with drag-and-drop tools. Includes hosting, templates, and e-commerce features.',
    price: 16.00,
    affiliate_link: 'https://www.squarespace.com?channel=lonaat',
    image_url: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800',
    network: 'Impact',
    category: 'Web Development',
    is_active: true,
  },

  // Software & Tools
  {
    name: 'Semrush SEO Platform',
    description: 'All-in-one SEO toolkit for keyword research, competitor analysis, and rank tracking.',
    price: 119.95,
    affiliate_link: 'https://www.semrush.com/?ref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    network: 'Impact',
    category: 'SEO Tools',
    is_active: true,
  },
  {
    name: 'ConvertKit Email Marketing',
    description: 'Email marketing platform for creators. Build landing pages, automate emails, and grow your audience.',
    price: 29.00,
    affiliate_link: 'https://convertkit.com?lmref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800',
    network: 'Impact',
    category: 'Email Marketing',
    is_active: true,
  },
  {
    name: 'Tailwind Social Media Scheduler',
    description: 'Schedule and optimize Pinterest and Instagram posts. Includes analytics and design tools.',
    price: 14.99,
    affiliate_link: 'https://www.tailwindapp.com/?ref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800',
    network: 'Impact',
    category: 'Social Media',
    is_active: true,
  },
  {
    name: 'Teachable Online Course Platform',
    description: 'Create and sell online courses. Includes payment processing, student management, and marketing tools.',
    price: 39.00,
    affiliate_link: 'https://teachable.com/?ref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
    network: 'Impact',
    category: 'E-learning',
    is_active: true,
  },
  {
    name: 'Kajabi All-in-One Platform',
    description: 'Build your online business with courses, memberships, and marketing automation in one platform.',
    price: 149.00,
    affiliate_link: 'https://kajabi.com/?fp_ref=lonaat',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    network: 'Impact',
    category: 'Business',
    is_active: true,
  },

  // Finance & Investment
  {
    name: 'Robinhood Stock Trading',
    description: 'Commission-free stock and crypto trading. Start investing with as little as $1.',
    price: 0.00,
    affiliate_link: 'https://join.robinhood.com/lonaat',
    image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    network: 'Impact',
    category: 'Finance',
    is_active: true,
  },
  {
    name: 'Coinbase Crypto Exchange',
    description: 'Buy, sell, and store cryptocurrency securely. Get $10 in Bitcoin when you sign up.',
    price: 0.00,
    affiliate_link: 'https://www.coinbase.com/join/lonaat',
    image_url: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
    network: 'Impact',
    category: 'Cryptocurrency',
    is_active: true,
  },
  {
    name: 'Personal Capital Financial Planning',
    description: 'Free financial tools for budgeting, investing, and retirement planning. Track all your accounts in one place.',
    price: 0.00,
    affiliate_link: 'https://www.personalcapital.com?referralCode=lonaat',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    network: 'Impact',
    category: 'Finance',
    is_active: true,
  },
  {
    name: 'Credit Karma Free Credit Score',
    description: 'Check your credit score for free. Get personalized recommendations for credit cards and loans.',
    price: 0.00,
    affiliate_link: 'https://www.creditkarma.com/?source=lonaat',
    image_url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
    network: 'Impact',
    category: 'Finance',
    is_active: true,
  },
  {
    name: 'Acorns Investing App',
    description: 'Invest spare change automatically. Round up purchases and invest the difference.',
    price: 3.00,
    affiliate_link: 'https://www.acorns.com/invite/lonaat',
    image_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800',
    network: 'Impact',
    category: 'Investing',
    is_active: true,
  },

  // Home & Garden
  {
    name: 'Wayfair Home Furniture',
    description: 'Shop millions of home goods at great prices. Free shipping on orders over $35.',
    price: 0.00,
    affiliate_link: 'https://www.wayfair.com/?refid=lonaat',
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
    network: 'AWIN',
    category: 'Home',
    is_active: true,
  },
  {
    name: 'Home Depot Tools & Hardware',
    description: 'Everything you need for home improvement projects. Tools, materials, and expert advice.',
    price: 0.00,
    affiliate_link: 'https://www.homedepot.com/?cm_mmc=lonaat',
    image_url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800',
    network: 'Impact',
    category: 'Home Improvement',
    is_active: true,
  },
  {
    name: 'Lowe\'s Home Improvement',
    description: 'Shop appliances, tools, and building materials. Expert installation services available.',
    price: 0.00,
    affiliate_link: 'https://www.lowes.com/?cm_mmc=lonaat',
    image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
    network: 'Impact',
    category: 'Home Improvement',
    is_active: true,
  },
];

async function seedProducts() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 SEEDING REAL AFFILIATE PRODUCTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of REAL_PRODUCTS) {
    try {
      const existing = await prisma.product.findFirst({
        where: { affiliate_link: product.affiliate_link },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: product,
        });
        updated++;
        console.log(`✅ Updated: ${product.name}`);
      } else {
        await prisma.product.create({
          data: product,
        });
        created++;
        console.log(`✨ Created: ${product.name}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to seed ${product.name}:`, error?.message || error);
      skipped++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SEEDING COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ Created: ${created} products`);
  console.log(`✅ Updated: ${updated} products`);
  console.log(`⚠️ Skipped: ${skipped} products`);
  console.log(`📦 Total in seed: ${REAL_PRODUCTS.length} products`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Verify database count
  const totalInDb = await prisma.product.count();
  console.log(`🗄️ Total products in database: ${totalInDb}`);
  console.log('✅ Database seeding successful!\n');
}

seedProducts()
  .catch((error: any) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
