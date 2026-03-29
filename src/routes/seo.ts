/**
 * SEO ROUTES - Sitemap and robots.txt for search engine indexing
 * Provides SEO endpoints for better search engine visibility
 */

import { Router, Response } from 'express';
import prisma from '../prisma';

const router = Router();

/**
 * GET /sitemap.xml - Generate sitemap for SEO
 * Helps search engines discover and index products
 */
router.get('/sitemap.xml', async (req: any, res: Response) => {
  try {
    console.log('🗺️ Generating sitemap.xml');

    // Get all active and approved products
    const products = await prisma.products.findMany({
      where: {
        isActive: true,
        isApproved: true
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        createdAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Get categories for category pages
    const categories = await prisma.products.groupBy({
      by: ['category'],
      where: {
        isActive: true,
        isApproved: true,
        category: {
          not: null
        }
      },
      _count: { id: true }
    });

    // Get networks for network pages
    const networks = await prisma.products.groupBy({
      by: ['network'],
      where: {
        isActive: true,
        isApproved: true,
        network: {
          not: null
        }
      },
      _count: { id: true }
    });

    // Generate sitemap XML
    const baseUrl = process.env.BASE_URL || 'https://lonaat.com';
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Products listing page -->
  <url>
    <loc>${baseUrl}/products</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Add category pages
    categories.forEach(category => {
      const slug = category.category.toLowerCase().replace(/\s+/g, '-');
      sitemap += `
  <url>
    <loc>${baseUrl}/products?category=${encodeURIComponent(category.category)}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add network pages
    networks.forEach(network => {
      const slug = network.network.toLowerCase().replace(/\s+/g, '-');
      sitemap += `
  <url>
    <loc>${baseUrl}/products?network=${encodeURIComponent(network.network)}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add product pages
    products.forEach(product => {
      const slug = generateSlug(product.name);
      const lastMod = product.updatedAt ? product.updatedAt.toISOString().split('T')[0] : currentDate;
      
      sitemap += `
  <url>
    <loc>${baseUrl}/products/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += '\n</urlset>';

    console.log(`✅ Sitemap generated with ${products.length} products, ${categories.length} categories, ${networks.length} networks`);

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);

  } catch (error: any) {
    console.error('❌ Sitemap generation failed:', error);
    res.status(500).set('Content-Type', 'application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>'
    );
  }
});

/**
 * GET /robots.txt - Generate robots.txt for SEO
 * Tells search engines which pages to crawl and index
 */
router.get('/robots.txt', async (req: any, res: Response) => {
  try {
    console.log('🤖 Generating robots.txt');

    const baseUrl = process.env.BASE_URL || 'https://lonaat.com';

    const robotsTxt = `User-agent: *
Allow: /
Allow: /products
Allow: /products/*
Disallow: /api/
Disallow: /admin/
Disallow: /track/
Disallow: /_next/
Disallow: /login
Disallow: /dashboard

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (optional, adjust based on server capacity)
Crawl-delay: 1

# Popular search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

# Block unwanted bots
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /
`;

    console.log('✅ Robots.txt generated');

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);

  } catch (error: any) {
    console.error('❌ Robots.txt generation failed:', error);
    res.status(500).set('Content-Type', 'text/plain').send('Error generating robots.txt');
  }
});

/**
 * GET /seo/stats - SEO statistics for monitoring
 */
router.get('/stats', async (req: any, res: Response) => {
  try {
    console.log('📊 Generating SEO statistics');

    const [
      totalProducts,
      activeProducts,
      approvedProducts,
      categories,
      networks,
      recentProducts
    ] = await Promise.all([
      prisma.products.count(),
      prisma.products.count({ where: { isActive: true } }),
      prisma.products.count({ where: { isActive: true, isApproved: true } }),
      prisma.products.groupBy({
        by: ['category'],
        where: { isActive: true, isApproved: true, category: { not: null } },
        _count: { id: true }
      }),
      prisma.products.groupBy({
        by: ['network'],
        where: { isActive: true, isApproved: true, network: { not: null } },
        _count: { id: true }
      }),
      prisma.products.count({
        where: {
          isActive: true,
          isApproved: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    const stats = {
      overview: {
        totalProducts,
        activeProducts,
        approvedProducts,
        recentProducts,
        approvalRate: totalProducts > 0 ? Math.round((approvedProducts / totalProducts) * 100) : 0
      },
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.id,
        slug: c.category.toLowerCase().replace(/\s+/g, '-')
      })),
      networks: networks.map(n => ({
        name: n.network,
        count: n._count.id,
        slug: n.network.toLowerCase().replace(/\s+/g, '-')
      })),
      seo: {
        sitemapUrl: `${process.env.BASE_URL || 'https://lonaat.com'}/sitemap.xml`,
        robotsUrl: `${process.env.BASE_URL || 'https://lonaat.com'}/robots.txt`,
        totalUrls: approvedProducts + categories.length + networks.length + 2 // +2 for homepage and products listing
      }
    };

    console.log('✅ SEO statistics generated');

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ SEO statistics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SEO statistics'
    });
  }
});

/**
 * GET /seo/health - SEO health check
 */
router.get('/health', async (req: any, res: Response) => {
  try {
    const issues: string[] = [];
    
    // Check if there are approved products
    const approvedCount = await prisma.products.count({
      where: { isActive: true, isApproved: true }
    });
    
    if (approvedCount === 0) {
      issues.push('No approved products found');
    }

    // Check if products have descriptions
    const productsWithoutDescription = await prisma.products.count({
      where: {
        isActive: true,
        isApproved: true,
        OR: [
          { description: null },
          { description: '' }
        ]
      }
    });

    if (productsWithoutDescription > 0) {
      issues.push(`${productsWithoutDescription} products without descriptions`);
    }

    // Check if products have images
    const productsWithoutImages = await prisma.products.count({
      where: {
        isActive: true,
        isApproved: true,
        OR: [
          { imageUrl: null },
          { imageUrl: '' }
        ]
      }
    });

    if (productsWithoutImages > 0) {
      issues.push(`${productsWithoutImages} products without images`);
    }

    const health = {
      healthy: issues.length === 0,
      issues,
      approvedProducts: approvedCount,
      score: Math.max(0, 100 - (issues.length * 20)) // Simple scoring
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error: any) {
    console.error('❌ SEO health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Helper function
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default router;
