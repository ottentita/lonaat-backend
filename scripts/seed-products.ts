/**
 * SEED PRODUCTS SCRIPT - POPULATE DATABASE WITH REAL PRODUCTS
 * Creates sample products for marketplace testing and launch
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductData {
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  affiliateLink: string;
  network: string;
  category: string;
  isActive: boolean;
}

const sampleProducts: ProductData[] = [
  {
    name: "Crypto Trading Masterclass",
    description: "Complete cryptocurrency trading course for beginners and advanced traders. Learn technical analysis, risk management, and profitable strategies.",
    price: 15000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1621504450251-40d6fea5b3b5?w=400&h=300&fit=crop",
    affiliateLink: "https://digistore24.com/redir/307327/MYLEAD/",
    network: "digistore24",
    category: "Trading",
    isActive: true
  },
  {
    name: "AI Marketing Automation Suite",
    description: "Revolutionary AI-powered marketing tools that automate content creation, social media posting, and campaign optimization.",
    price: 10000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
    affiliateLink: "https://warriorplus.com/o2/a/xlhc5l0/0",
    network: "warriorplus",
    category: "Marketing",
    isActive: true
  },
  {
    name: "E-commerce Dropshipping Blueprint",
    description: "Step-by-step guide to building a profitable dropshipping business from scratch. Includes supplier lists and marketing strategies.",
    price: 12000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop",
    affiliateLink: "https://www.jvzoo.com/products/123456",
    network: "jvzoo",
    category: "E-commerce",
    isActive: true
  },
  {
    name: "Social Media Influencer Course",
    description: "Build your personal brand and monetize your social media presence. Learn content creation, engagement strategies, and sponsorship deals.",
    price: 8000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop",
    affiliateLink: "https://warriorplus.com/o2/a/abc123/0",
    network: "warriorplus",
    category: "Social Media",
    isActive: true
  },
  {
    name: "Web Development Bootcamp",
    description: "Learn full-stack web development from zero to hero. HTML, CSS, JavaScript, React, Node.js, and deployment strategies.",
    price: 20000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop",
    affiliateLink: "https://digistore24.com/redir/307328/MYLEAD/",
    network: "digistore24",
    category: "Programming",
    isActive: true
  },
  {
    name: "Forex Trading System",
    description: "Professional forex trading system with proven strategies. Includes indicators, risk management, and trading psychology.",
    price: 18000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
    affiliateLink: "https://www.jvzoo.com/products/234567",
    network: "jvzoo",
    category: "Trading",
    isActive: true
  },
  {
    name: "YouTube Automation Secrets",
    description: "Automate your YouTube channel growth with AI tools and proven strategies. Learn content creation, optimization, and monetization.",
    price: 9000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1606137544475-8b9e6c5b7e2f?w=400&h=300&fit=crop",
    affiliateLink: "https://warriorplus.com/o2/a/def456/0",
    network: "warriorplus",
    category: "YouTube",
    isActive: true
  },
  {
    name: "Affiliate Marketing Mastery",
    description: "Complete guide to affiliate marketing success. Learn niche selection, traffic generation, and conversion optimization.",
    price: 7000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
    affiliateLink: "https://digistore24.com/redir/307329/MYLEAD/",
    network: "digistore24",
    category: "Affiliate Marketing",
    isActive: true
  },
  {
    name: "Mobile App Development Course",
    description: "Build native mobile apps for iOS and Android. Learn React Native, Firebase integration, and app store deployment.",
    price: 25000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop",
    affiliateLink: "https://www.jvzoo.com/products/345678",
    network: "jvzoo",
    category: "Programming",
    isActive: true
  },
  {
    name: "Email Marketing Automation",
    description: "Build automated email marketing systems that generate sales on autopilot. Learn list building, sequence creation, and optimization.",
    price: 11000,
    currency: "XAF",
    imageUrl: "https://images.unsplash.com/photo-1586953208448-957e6588cdaf?w=400&h=300&fit=crop",
    affiliateLink: "https://warriorplus.com/o2/a/ghi789/0",
    network: "warriorplus",
    category: "Email Marketing",
    isActive: true
  }
];

async function seedProducts() {
  try {
    console.log('🌱 SEEDING PRODUCTS TO DATABASE...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Clear existing products (optional - remove if you want to keep existing)
    console.log('🗑️  Clearing existing products...');
    await prisma.products.deleteMany({});
    console.log('✅ Existing products cleared');
    
    // Insert sample products
    console.log(`📦 Inserting ${sampleProducts.length} sample products...`);
    
    const createdProducts = await prisma.products.createMany({
      data: sampleProducts.map(product => ({
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        affiliateLink: product.affiliateLink,
        network: product.network,
        category: product.category,
        isActive: product.isActive,
        createdAt: new Date()
      })),
      skipDuplicates: false
    });
    
    console.log(`✅ Successfully created ${createdProducts.count} products`);
    
    // Verify insertion
    const totalProducts = await prisma.products.count();
    const activeProducts = await prisma.products.count({
      where: { isActive: true }
    });
    
    console.log('\n📊 DATABASE VERIFICATION:');
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Active Products: ${activeProducts}`);
    
    // Show sample of inserted products
    const sampleInserted = await prisma.products.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        price: true,
        network: true,
        category: true,
        isActive: true
      }
    });
    
    console.log('\n📋 SAMPLE INSERTED PRODUCTS:');
    sampleInserted.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} (${product.network}) - ${product.price} XAF`);
    });
    
    console.log('\n🎉 PRODUCT SEEDING COMPLETED SUCCESSFULLY!');
    console.log('🚀 Marketplace is now ready for testing');
    
  } catch (error) {
    console.error('❌ PRODUCT SEEDING FAILED:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 'P2002') {
      console.error('💡 This might be a duplicate constraint error');
      console.error('💡 Try clearing existing products first');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('\n✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedProducts;
