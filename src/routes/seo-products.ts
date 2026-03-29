/**
 * SEO PRODUCTS ROUTES - SEO-friendly product URLs for traffic
 * Handles SEO-optimized product pages and discovery
 */

import { Router, Response } from 'express';
import { productCacheService } from '../services/productCache.service';
import prisma from '../prisma';

const router = Router();

/**
 * GET /products/:slug - SEO-friendly product URL
 * Example: /products/crypto-trading-masterclass
 */
router.get('/products/:slug', async (req: any, res: Response) => {
  try {
    const slug = req.params.slug;
    
    if (!slug || slug.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product slug'
      });
    }

    console.log(`🔍 SEO Product lookup: ${slug}`);

    // Convert slug to searchable format
    const searchTerms = slug
      .replace(/-/g, ' ')
      .split(' ')
      .filter(term => term.length > 2)
      .map(term => term.toLowerCase());

    if (searchTerms.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search terms'
      });
    }

    // Try to find product by exact name match first
    const exactName = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    let product = await prisma.products.findFirst({
      where: {
        name: {
          equals: exactName,
          mode: 'insensitive'
        },
        isActive: true,
        isApproved: true
      }
    });

    // If no exact match, try partial search
    if (!product) {
      product = await prisma.products.findFirst({
        where: {
          AND: [
            { isActive: true },
            { isApproved: true },
            {
              OR: searchTerms.map(term => ({
                OR: [
                  { name: { contains: term, mode: 'insensitive' } },
                  { description: { contains: term, mode: 'insensitive' } },
                  { category: { contains: term, mode: 'insensitive' } }
                ]
              }))
            }
          ]
        },
        orderBy: [
          { commission: 'desc' },
          { clicks: 'desc' }
        ]
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        suggestions: await getProductSuggestions(searchTerms)
      });
    }

    // Get related products for cross-selling
    const relatedProducts = await getRelatedProducts(product.id, product.category, product.network);

    // Generate SEO metadata
    const seoMetadata = generateSEOMetadata(product, slug);

    console.log(`✅ SEO Product found: ${product.name} (${product.id})`);

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          title: product.name,
          description: product.description,
          price: Number(product.price) || 0,
          affiliateLink: product.affiliateLink,
          network: product.network,
          category: product.category,
          imageUrl: product.imageUrl,
          commission: product.commission || 0,
          commissionRate: product.price && product.commission ? 
            Math.round((product.commission / Number(product.price)) * 100) : 0,
          clicks: product.clicks || 0,
          views: product.views || 0,
          createdAt: product.createdAt
        },
        relatedProducts,
        seo: seoMetadata,
        trackingUrl: `/api/track/click/${product.id}`,
        seoUrl: `/products/${slug}`
      }
    });

  } catch (error: any) {
    console.error('❌ SEO product lookup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /products - Product listing with SEO optimization
 */
router.get('/products', async (req: any, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string;
    const network = req.query.network as string;
    const sort = req.query.sort as string || 'commission'; // commission, clicks, price, name
    const order = req.query.order as string || 'desc';
    
    const skip = (page - 1) * limit;

    console.log(`🔍 SEO Product listing: page=${page}, category=${category}, network=${network}, sort=${sort}`);

    // Build where clause
    const where: any = {
      isActive: true,
      isApproved: true
    };

    if (category) {
      where.category = {
        contains: category,
        mode: 'insensitive'
      };
    }

    if (network) {
      where.network = {
        contains: network,
        mode: 'insensitive'
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sort) {
      case 'commission':
        orderBy = { commission: order };
        break;
      case 'clicks':
        orderBy = { clicks: order };
        break;
      case 'price':
        orderBy = { price: order };
        break;
      case 'name':
        orderBy = { name: order };
        break;
      case 'created':
        orderBy = { createdAt: order };
        break;
      default:
        orderBy = { commission: 'desc' };
    }

    // Get products and total count
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          affiliateLink: true,
          network: true,
          category: true,
          imageUrl: true,
          commission: true,
          clicks: true,
          views: true,
          createdAt: true
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.products.count({ where })
    ]);

    // Get available categories and networks for filtering
    const [categories, networks] = await Promise.all([
      prisma.products.groupBy({
        by: ['category'],
        where: { isActive: true, isApproved: true },
        _count: { id: true }
      }),
      prisma.products.groupBy({
        by: ['network'],
        where: { isActive: true, isApproved: true },
        _count: { id: true }
      })
    ]);

    // Transform products for frontend
    const transformedProducts = products.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      commission: p.commission || 0,
      commissionRate: p.price && p.commission ? 
        Math.round((p.commission / Number(p.price)) * 100) : 0,
      seoUrl: `/products/${generateSlug(p.name)}`,
      trackingUrl: `/api/track/click/${p.id}`
    }));

    // Generate SEO metadata for listing page
    const seoMetadata = generateListingSEOMetadata(category, network, page);

    console.log(`✅ SEO Product listing: ${products.length} products found`);

    res.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          categories: categories.map(c => ({ name: c.category, count: c._count.id })),
          networks: networks.map(n => ({ name: n.network, count: n._count.id }))
        },
        seo: seoMetadata
      }
    });

  } catch (error: any) {
    console.error('❌ SEO product listing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /products/search - Product search with SEO
 */
router.get('/products/search', async (req: any, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const skip = (page - 1) * limit;
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

    console.log(`🔍 SEO Product search: "${query}" (${searchTerms.length} terms)`);

    // Build search query
    const where: any = {
      isActive: true,
      isApproved: true,
      OR: searchTerms.map(term => ({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { category: { contains: term, mode: 'insensitive' } },
          { network: { contains: term, mode: 'insensitive' } }
        ]
      }))
    };

    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          affiliateLink: true,
          network: true,
          category: true,
          imageUrl: true,
          commission: true,
          clicks: true,
          views: true,
          createdAt: true
        },
        orderBy: [
          { commission: 'desc' },
          { clicks: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.products.count({ where })
    ]);

    // Transform products
    const transformedProducts = products.map(p => ({
      ...p,
      price: Number(p.price) || 0,
      commission: p.commission || 0,
      commissionRate: p.price && p.commission ? 
        Math.round((p.commission / Number(p.price)) * 100) : 0,
      seoUrl: `/products/${generateSlug(p.name)}`,
      trackingUrl: `/api/track/click/${p.id}`
    }));

    // Generate SEO metadata for search results
    const seoMetadata = generateSearchSEOMetadata(query, page, total);

    console.log(`✅ SEO Product search: ${products.length} results for "${query}"`);

    res.json({
      success: true,
      data: {
        query,
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        seo: seoMetadata
      }
    });

  } catch (error: any) {
    console.error('❌ SEO product search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper functions

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function getRelatedProducts(productId: number, category?: string, network?: string) {
  const where: any = {
    id: { not: productId },
    isActive: true,
    isApproved: true
  };

  if (category) {
    where.category = category;
  }

  const related = await prisma.products.findMany({
    where,
    select: {
      id: true,
      name: true,
      price: true,
      commission: true,
      imageUrl: true,
      network: true,
      category: true
    },
    orderBy: { commission: 'desc' },
    take: 6
  });

  return related.map(p => ({
    ...p,
    price: Number(p.price) || 0,
    commission: p.commission || 0,
    seoUrl: `/products/${generateSlug(p.name)}`,
    trackingUrl: `/api/track/click/${p.id}`
  }));
}

async function getProductSuggestions(searchTerms: string[]) {
  const suggestions = await prisma.products.findMany({
    where: {
      isActive: true,
      isApproved: true,
      OR: searchTerms.map(term => ({
        name: { contains: term, mode: 'insensitive' }
      }))
    },
    select: {
      id: true,
      name: true,
      category: true
    },
    take: 5
  });

  return suggestions.map(p => ({
    name: p.name,
    url: `/products/${generateSlug(p.name)}`,
    category: p.category
  }));
}

function generateSEOMetadata(product: any, slug: string) {
  return {
    title: `${product.name} - ${product.category} | Lonaat Marketplace`,
    description: product.description || `Buy ${product.name} for ${product.price} XAF. ${product.commission}% commission available.`,
    keywords: [product.name, product.category, product.network, 'affiliate', 'marketplace'],
    og: {
      title: product.name,
      description: product.description || `Get ${product.name} at ${product.price} XAF`,
      image: product.imageUrl,
      url: `/products/${slug}`
    },
    canonical: `/products/${slug}`
  };
}

function generateListingSEOMetadata(category?: string, network?: string, page = 1) {
  const title = category 
    ? `${category} Products - Page ${page} | Lonaat Marketplace`
    : network 
    ? `${network} Products - Page ${page} | Lonaat Marketplace`
    : `All Products - Page ${page} | Lonaat Marketplace`;

  const description = category
    ? `Browse ${category.toLowerCase()} products on Lonaat Marketplace. Page ${page} with best affiliate offers.`
    : network
    ? `Browse ${network.toLowerCase()} products on Lonaat Marketplace. Page ${page} with top commissions.`
    : `Browse all products on Lonaat Marketplace. Page ${page} with best affiliate deals.`;

  return {
    title,
    description,
    keywords: ['marketplace', 'affiliate', 'products', category, network].filter(Boolean),
    canonical: category 
      ? `/products?category=${category}&page=${page}`
      : network
      ? `/products?network=${network}&page=${page}`
      : `/products?page=${page}`
  };
}

function generateSearchSEOMetadata(query: string, page: number, total: number) {
  return {
    title: `Search Results for "${query}" - Page ${page} | Lonaat Marketplace`,
    description: `Found ${total} products matching "${query}". Browse search results on Lonaat Marketplace.`,
    keywords: [query, 'search', 'marketplace', 'products'],
    canonical: `/products/search?q=${encodeURIComponent(query)}&page=${page}`
  };
}

export default router;
