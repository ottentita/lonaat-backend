// Public Affiliate Data
// Fallback products from public affiliate marketplaces (real structure)

import { AffiliateProduct } from './affiliateConnectors';

// Amazon Associates public products (mock structure)
const amazonProducts: AffiliateProduct[] = [
  {
    id: 'az1',
    title: 'Apple AirPods Pro (2nd Generation)',
    description: 'Active Noise Cancellation, Transparency mode, Adaptive Audio, Personalized Spatial Audio',
    price: 249.0,
    commission: 0.04,
    affiliate_link: 'https://amazon.com/dp/B0CHX2QJQ2?tag=lonaat-20',
    image: 'https://images.unsplash.com/photo-1603732553216-3c8a545a4f3a?w=400',
    category: 'Electronics',
    network: 'amazon',
    source: 'public',
    external_id: 'B0CHX2QJQ2',
    currency: 'USD'
  },
  {
    id: 'az2',
    title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker',
    description: '14 Smart Programs, 6 Quart Capacity, Stainless Steel',
    price: 89.99,
    commission: 0.04,
    affiliate_link: 'https://amazon.com/dp/B00FLYWNYQ?tag=lonaat-20',
    image: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400',
    category: 'Kitchen',
    network: 'amazon',
    source: 'public',
    external_id: 'B00FLYWNYQ',
    currency: 'USD'
  },
  {
    id: 'az3',
    title: 'Sony WH-1000XM5 Wireless Premium Noise Canceling Headphones',
    description: 'Industry Leading Noise Canceling with Auto Noise Canceling Optimizer',
    price: 399.99,
    commission: 0.04,
    affiliate_link: 'https://amazon.com/dp/B09JB7V8QZ?tag=lonaat-20',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    category: 'Electronics',
    network: 'amazon',
    source: 'public',
    external_id: 'B09JB7V8QZ',
    currency: 'USD'
  }
];

// ShareASale public products (mock structure)
const shareasaleProducts: AffiliateProduct[] = [
  {
    id: 'sas1',
    title: 'Bluehost Web Hosting',
    description: 'Professional web hosting with free SSL, 1-click WordPress install, 24/7 support',
    price: 2.95,
    commission: 65.0,
    affiliate_link: 'https://www.shareasale.com/r.cfm?b=123&u=123456&urllink=&afftrack=lonaat',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    category: 'Web Hosting',
    network: 'shareasale',
    source: 'public',
    external_id: 'bluehost_basic',
    currency: 'USD'
  },
  {
    id: 'sas2',
    title: 'Wix Website Builder',
    description: 'Create a professional website with Wix drag-and-drop builder',
    price: 16.0,
    commission: 25.0,
    affiliate_link: 'https://www.shareasale.com/r.cfm?b=456&u=123456&urllink=&afftrack=lonaat',
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400',
    category: 'Website Builder',
    network: 'shareasale',
    source: 'public',
    external_id: 'wix_premium',
    currency: 'USD'
  }
];

// CJ Affiliate public products (mock structure)
const cjProducts: AffiliateProduct[] = [
  {
    id: 'cj1',
    title: 'Grammarly Premium',
    description: 'Advanced grammar checker, tone detector, plagiarism checker',
    price: 12.0,
    commission: 20.0,
    affiliate_link: 'https://www.jdoqocy.com/click-123456-123456?url=https%3A%2F%2Fwww.grammarly.com',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    category: 'Software',
    network: 'commissionjunction',
    source: 'public',
    external_id: 'grammarly_premium',
    currency: 'USD'
  },
  {
    id: 'cj2',
    title: 'Skillshare Online Classes',
    description: 'Access thousands of creative classes and workshops',
    price: 19.0,
    commission: 40.0,
    affiliate_link: 'https://www.jdoqocy.com/click-123456-123456?url=https%3A%2F%2Fwww.skillshare.com',
    image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400',
    category: 'Education',
    network: 'commissionjunction',
    source: 'public',
    external_id: 'skillshare_premium',
    currency: 'USD'
  }
];

// Rakuten Advertising public products (mock structure)
const rakutenProducts: AffiliateProduct[] = [
  {
    id: 'rak1',
    title: 'Nike Air Max 270 Running Shoes',
    description: 'Comfortable running shoes with Max Air unit for cushioning',
    price: 150.0,
    commission: 0.08,
    affiliate_link: 'https://click.linksynergy.com/deeplink?id=123&mid=123&u1=lonaat&murl=https://www.nike.com',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    category: 'Footwear',
    network: 'rakuten',
    source: 'public',
    external_id: 'nike_airmax_270',
    currency: 'USD'
  },
  {
    id: 'rak2',
    title: 'Adidas Ultraboost 22 Running Shoes',
    description: 'Energy-returning running shoes with responsive cushioning',
    price: 190.0,
    commission: 0.08,
    affiliate_link: 'https://click.linksynergy.com/deeplink?id=456&mid=456&u1=lonaat&murl=https://www.adidas.com',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
    category: 'Footwear',
    network: 'rakuten',
    source: 'public',
    external_id: 'adidas_ultraboost_22',
    currency: 'USD'
  }
];

// eBay Partner Network public products (mock structure)
const ebayProducts: AffiliateProduct[] = [
  {
    id: 'eb1',
    title: 'Canon EOS R5 Mirrorless Camera',
    description: '45MP full-frame mirrorless camera with 8K video recording',
    price: 3899.0,
    commission: 0.04,
    affiliate_link: 'https://rover.ebay.com/rover/1/123-123-123-123/?mpre=https://www.ebay.com/itm/123',
    image: 'https://images.unsplash.com/photo-1516035069373-cc9790e4754c?w=400',
    category: 'Electronics',
    network: 'ebay',
    source: 'public',
    external_id: 'canon_eosr5',
    currency: 'USD'
  },
  {
    id: 'eb2',
    title: 'Dyson V15 Detect Cordless Vacuum Cleaner',
    description: 'Laser dust detection, powerful suction, 60-minute runtime',
    price: 749.99,
    commission: 0.04,
    affiliate_link: 'https://rover.ebay.com/rover/1/123-123-123-123/?mpre=https://www.ebay.com/itm/456',
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
    category: 'Home Appliances',
    network: 'ebay',
    source: 'public',
    external_id: 'dyson_v15',
    currency: 'USD'
  }
];

// All public products
export const publicProducts: AffiliateProduct[] = [
  ...amazonProducts,
  ...shareasaleProducts,
  ...cjProducts,
  ...rakutenProducts,
  ...ebayProducts
];

// Get public products by network
export function getPublicProductsByNetwork(network?: string): AffiliateProduct[] {
  if (!network) return publicProducts;
  return publicProducts.filter(p => p.network === network);
}

// Get available public networks
export function getPublicNetworks() {
  const networks = [...new Set(publicProducts.map(p => p.network))];
  return networks.map(name => ({
    name,
    slug: name.toLowerCase(),
    productCount: publicProducts.filter(p => p.network === name).length
  }));
}
