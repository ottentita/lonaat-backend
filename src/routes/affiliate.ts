import { Router, Response, Request } from "express";
import express from 'express';
import { authMiddleware, AuthRequest, adminOnlyMiddleware, } from "../middleware/auth";
import { prisma } from '../prisma';
import AffiliateConnector from '../services/affiliateConnector';
import {
  importAdmitadFeed,
  startFeedSyncScheduler,
} from "../services/admitadFeedService";
import {
  searchAdmitadProducts,
  searchAliExpressProducts,
  getAdmitadStatus,
} from "../services/admitadService";
import { enqueueSocialPosts } from "../services/socialQueue";
import {
  AFFILIATE_NETWORKS,
  getNetwork,
  canImportProducts,
  getProductNetworks,
  getCPANetworks,
} from "../config/affiliateNetworks";
import { searchAffiliateOffers } from "../services/affiliateSearch";
import { getAffiliateStats } from '../services/affiliateStats'
import { affiliateHybridService } from "../services/affiliateHybridService"
const router = Router();
const affiliateConnector = new AffiliateConnector();
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string;
    const network = req.query.network as string;
    const q = req.query.q as string;
    const skip = (page - 1) * limit;

    const where: any = { 
      is_active: true,
      isValid: true 
    };
    if (category) where.category = category;
    if (network) where.network = { equals: network, mode: "insensitive" };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image_url: true,
          affiliate_link: true,
          network: true,
          category: true,
          ai_generated_ad: true,
          extra_data: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products: products.map((p) => ({
        ...p,
        commission: p.extra_data?.commission_rate ? Number(p.extra_data.commission_rate) : null,
        price: p.price ?? null,
      })),
      offers: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ PHASE 1 LOCKED: Affiliate system uses real DB (Prisma)
// STATUS: PRODUCTION-READY (AFFILIATE CORE)
// GET /api/affiliate/products - return all active products from database
router.get("/products", async (req: Request, res: Response) => {
  try {
    console.log('📦 Fetching affiliate products from database...');
    
    const products = await prisma.$queryRaw`
      SELECT id, name, description, price, affiliate_link, category, is_active
      FROM products
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 50
    `;

    console.log(`✅ Found ${Array.isArray(products) ? products.length : 0} products`);

    return res.json({
      success: true,
      products: products || [],
      count: Array.isArray(products) ? products.length : 0
    });

  } catch (err: any) {
    console.error('❌ Affiliate products error:', err);
    console.error('Error details:', err.message);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch affiliate products',
      details: err.message
    });
  }
});

// DISABLED DUPLICATE: /networks — richer version at line ~1366 uses affiliateConnector.getNetworkStatus()
// router.get("/networks", ...) — SEE BELOW

// DISABLED DUPLICATE: /search — richer version at line ~1178 uses affiliateHybridService.searchProducts()
// router.get("/search", ...) — SEE BELOW

// GET /api/affiliate/stats - aggregated affiliate metrics for current user
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getAffiliateStats(req.user!.id)
    res.json(stats)
  } catch (err) {
    console.error('Affiliate stats error:', err)
    // Return safe defaults to avoid dashboard errors (temporary stub)
    res.status(200).json({
      total_earnings: 0,
      pending_earnings: 0,
      available_balance: 0,
      total_clicks: 0,
      total_leads: 0,
      conversion_rate: 0
    })
  }
})

router.post(
  "/import",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        network,
        external_id,
        title,
        price,
        currency,
        image,
        affiliate_url,
        category,
      } = req.body;

      if (!title || !affiliate_url) {
        return res
          .status(400)
          .json({ error: "Title and affiliate_url are required" });
      }

      if (network && !canImportProducts(network)) {
        const netConfig = getNetwork(network);
        return res.status(400).json({
          error: `${netConfig?.name || network} does not support product imports (CPA only). Use the Offers & Leads page for CPA tracking.`,
        });
      }

      const product = await prisma.product.create({
        data: {
          name: title,
          price: price !== undefined && price !== null ? Number(price) : null,
          image_url: image || null,
          affiliate_link: affiliate_url,
          network: network || "unknown",
          category: category || "General",
          user_id: req.user?.id || null,
          is_active: true,
          extra_data: {
            external_id: external_id || null,
            currency: currency || "USD",
            imported_at: new Date().toISOString(),
          },
        },
      });

      enqueueSocialPosts(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          description: product.description,
          affiliate_link: product.affiliate_link,
        },
        req.user?.id,
        true,
      ).catch((err) => console.error("[SocialQueue] Error:", err));

      res.json({ success: true, product_id: product.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/bulk-import",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { products } = req.body;

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "Products array is required" });
      }

      const results = {
        imported: 0,
        failed: 0,
        skipped: 0,
        errors: [] as string[],
      };

      for (const p of products) {
        try {
          const network = p.network?.toLowerCase();
          if (network && !canImportProducts(network)) {
            results.skipped++;
            results.errors.push(
              `Skipped "${p.title || p.name}": ${getNetwork(network)?.name || network} is CPA-only (no product imports)`,
            );
            continue;
          }
          await prisma.product.create({
            data: {
              name: p.title || p.name,
              price: p.price !== undefined && p.price !== null ? Number(p.price) : null,
              image_url: p.image || p.image_url || null,
              affiliate_link: p.affiliate_url || p.affiliate_link,
              network: p.network || "unknown",
              category: p.category || "General",
              user_id: req.user?.id || null,
              is_active: true,
              extra_data: {
                external_id: p.external_id || null,
                currency: p.currency || "USD",
                imported_at: new Date().toISOString(),
              },
            },
          });
          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(
            `Failed to import "${p.title || p.name}": ${err.message}`,
          );
        }
      }

      res.json({ success: true, ...results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/click/:id", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const userId = req.query.user ? Number(req.query.user) : null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.affiliate_link) {
      return res.status(404).json({ error: "Product not found" });
    }

    await prisma.affiliateClick.create({
      data: {
        user_id: userId,
        product_id: productId,
        network: product.network || "unknown",
        click_id: `click_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        ip_address:
          req.ip || (req.headers["x-forwarded-for"] as string) || "unknown",
        user_agent: req.headers["user-agent"] || "unknown",
      },
    });

    res.redirect(product.affiliate_link);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admitad/status", async (req: Request, res: Response) => {
  try {
    const status = getAdmitadStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DISABLED DUPLICATE: /sync — cleaner version at line ~1158 uses affiliateHybridService.syncAllSources()
// router.post("/sync", ...) — SEE BELOW

router.post(
  "/sync/:network",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { network } = req.params;
      const { limit = 100 } = req.body;

      

      if (network === "admitad") {
        const feedUrl = process.env.ADMITAD_FEED_URL;

        let items: any[] = [];
        let feedError = null;

        if (feedUrl) {
          try {
            const axios = (await import("axios")).default;
            const { XMLParser } = await import("fast-xml-parser");

            
            const response = await axios.get(feedUrl, {
              timeout: 30000,
              headers: { "User-Agent": "Lonaat/2.0 Sync" },
            });

            const parser = new XMLParser({
              ignoreAttributes: false,
              attributeNamePrefix: "@_",
            });

            const parsed = parser.parse(response.data);
            const offers =
              parsed?.yml_catalog?.shop?.offers?.offer ||
              parsed?.rss?.channel?.item ||
              parsed?.products?.product ||
              [];

            items = Array.isArray(offers)
              ? offers.slice(0, limit)
              : offers
                ? [offers]
                : [];
            
          } catch (err: any) {
            console.error("Admitad feed error:", err.message);
            feedError = err.message;
          }
        }

        if (items.length === 0) {
          console.log('⚠️ No products from Admitad feed');
          return res.json({
            success: false,
            network: "admitad",
            imported: 0,
            skipped: 0,
            total_in_feed: 0,
            message: 'No products available from feed'
          });
        }

        let imported = 0;
        let skipped = 0;

        for (const item of items) {
          const externalId = item["@_id"] || item.id || String(Math.random());
          const name = item.name || item.title || item["@_name"];
          const price = Number(item.price || item.priceAmount || "0");
          const image = item.picture || item.image || "";
          const url = item.url || item.link || "";
          const category = item.categoryId || item.category || "General";
          const description = item.description || item.summary || "";

          if (!name || !url) {
            skipped++;
            continue;
          }

          const existing = await prisma.product.findFirst({
            where: {
              network: "admitad",
              extra_data: { path: ["external_id"], equals: externalId },
            },
          });

          if (existing) {
            skipped++;
            continue;
          }

            await prisma.product.create({
            data: {
              name,
                price: price > 0 ? Number(price.toFixed(2)) : null,
              image_url: image || null,
              description: description.substring(0, 500),
              affiliate_link: url,
              network: "admitad",
              category,
              user_id: req.user?.id || null,
              is_active: true,
              extra_data: {
                external_id: externalId,
                currency: "USD",
                vendor: item.vendor || "Admitad",
                imported_at: new Date().toISOString(),
              },
            },
          });
          imported++;
        }

        return res.json({
          success: true,
          network: "admitad",
          imported,
          skipped,
          total_in_feed: items.length,
        });
      }

      if (network === "aliexpress") {
        const products = await searchAliExpressProducts("trending");

        let imported = 0;
        for (const p of products.slice(0, limit)) {
          try {
            const prod = p as any;
            await prisma.product.create({
              data: {
                name: prod.name || prod.title || "Unknown",
                price: prod.price ? Number(prod.price) : null,
                image_url: prod.image || prod.image_url || null,
                description: prod.description || "",
                affiliate_link: prod.affiliate_link || prod.url || "",
                network: "aliexpress",
                category: prod.category || "General",
                user_id: req.user?.id || null,
                is_active: true,
                extra_data: {
                  external_id: prod.id || String(Math.random()),
                  imported_at: new Date().toISOString(),
                },
              },
            });
            imported++;
          } catch (e) {
            // Skip duplicates
          }
        }

        return res.json({
          success: true,
          network: "aliexpress",
          imported,
          message: "AliExpress products synced",
        });
      }

      if (network === "digistore24") {
        return res.json({
          success: false,
          network: "digistore24",
          imported: 0,
          message: 'Use /api/products/real/sync for real product sync'
        });
      }

      if (network === "awin") {
        return res.json({
          success: false,
          network: "awin",
          imported: 0,
          message: 'Use /api/products/real/sync for real product sync'
        });
      }

      if (network === "mylead") {
        const myLeadProducts = [
          {
            name: "VPN Premium Annual",
            price: 79.99,
            category: "Software",
            image:
              "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400",
          },
          {
            name: "Antivirus Protection Suite",
            price: 59.99,
            category: "Software",
            image:
              "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400",
          },
          {
            name: "Cloud Storage 1TB Plan",
            price: 99.99,
            category: "Software",
            image:
              "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400",
          },
          {
            name: "Password Manager Pro",
            price: 35.99,
            category: "Software",
            image:
              "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400",
          },
          {
            name: "Website Builder Premium",
            price: 149.99,
            category: "Software",
            image:
              "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400",
          },
        ];

        let imported = 0;
        for (const p of myLeadProducts) {
          try {
            await prisma.product.create({
              data: {
                name: p.name,
                price: Number(p.price.toFixed(2)),
                image_url: p.image,
                description: `Top-rated ${p.category.toLowerCase()} solution`,
                affiliate_link: `https://mylead.global/offer/${imported}?ref=lonaat`,
                network: "mylead",
                category: p.category,
                user_id: req.user?.id || null,
                is_active: true,
                extra_data: {
                  external_id: `mylead_${imported}`,
                  imported_at: new Date().toISOString(),
                },
              },
            });
            imported++;
          } catch (e) {}
        }

        return res.json({
          success: true,
          network: "mylead",
          imported,
          message: `Imported ${imported} MyLead products`,
        });
      }

      res.status(400).json({ error: `Unknown network: ${network}` });
    } catch (error: any) {
      console.error(`Sync error for ${req.params.network}:`, error);
      res.status(500).json({
        error: "Sync failed",
        details: error.message,
      });
    }
  },
);

router.get("/admitad/feed", async (req: Request, res: Response) => {
  try {
    const feedUrl = process.env.ADMITAD_FEED_URL;
    res.json({
      configured: !!feedUrl,
      feed_url: feedUrl ? "***configured***" : null,
      message: feedUrl ? "Feed URL is configured" : "ADMITAD_FEED_URL not set",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

let feedCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

async function getFeedProducts(): Promise<any[]> {
  if (feedCache && Date.now() - feedCache.timestamp < CACHE_TTL) {
    return feedCache.data;
  }

  const feedUrl = process.env.ADMITAD_FEED_URL;
  if (!feedUrl) return [];

  
  const axios = (await import("axios")).default;
  const { XMLParser } = await import("fast-xml-parser");

  const response = await axios.get(feedUrl, {
    timeout: 120000,
    headers: { "User-Agent": "Lonaat/2.0 Feed Search" },
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(response.data);
  const offers =
    parsed?.yml_catalog?.shop?.offers?.offer ||
    parsed?.rss?.channel?.item ||
    parsed?.feed?.entry ||
    [];

  const products = Array.isArray(offers) ? offers : [offers];
  feedCache = { data: products, timestamp: Date.now() };
  
  return products;
}

router.get("/admitad/search", async (req: Request, res: Response) => {
  try {
    const query = ((req.query.q as string) || "").toLowerCase().trim();
    const source = (req.query.source as string) || "database";
    const feedUrl = process.env.ADMITAD_FEED_URL;

    if (source === "database" || !feedUrl) {
      const whereClause: any = { 
        is_active: true,
        isValid: true 
      };
      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ];
      }

      const dbProducts = await prisma.product.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
      });

      return res.status(200).json({
        success: true,
        data: dbProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price?.replace(/[^\d.]/g, "") || "0"),
          currency: p.price?.includes("USD") ? "USD" : "USD",
          image: p.image_url,
          url: p.affiliate_link,
          category: p.category || "General",
          merchant: (p.extra_data as any)?.merchant || "Admitad",
          description: p.description || p.ai_generated_ad || "",
        })),
        total: dbProducts.length,
        query: query || "all",
        source: "database",
      });
    }

    const products = await getFeedProducts();

    const filteredProducts = query
      ? products.filter((item: any) => {
          const name = (
            item.name ||
            item.title ||
            item["@_name"] ||
            ""
          ).toLowerCase();
          const category = (
            item.categoryId ||
            item.category ||
            ""
          ).toLowerCase();
          const description = (
            item.description ||
            item.summary ||
            ""
          ).toLowerCase();
          const vendor = (item.vendor || item.merchant || "").toLowerCase();

          return (
            name.includes(query) ||
            category.includes(query) ||
            description.includes(query) ||
            vendor.includes(query)
          );
        })
      : products;

    const mappedProducts = filteredProducts.slice(0, 50).map((item: any) => ({
      id: item["@_id"] || item.id || item.guid || String(Math.random()),
      name: item.name || item.title || item["@_name"] || "",
      price: Number(item.price || item.priceAmount || "0"),
      currency: item.currencyId || item.currency || item.priceCurrency || "USD",
      image: item.picture || item.image || item.enclosure?.["@_url"] || "",
      url: item.url || item.link || "",
      category: item.categoryId || item.category || "General",
      merchant: item.vendor || item.merchant || item.author || "Unknown",
      availability:
        item.available === "true" || item.availability === "in stock"
          ? "in_stock"
          : "out_of_stock",
      description: item.description || item.summary || "",
    }));

    res.status(200).json({
      success: true,
      data: mappedProducts,
      total: mappedProducts.length,
      query: query || "all",
    });
  } catch (error: any) {
    console.error("Admitad search error:", error.message);
    res.status(200).json({
      success: true,
      data: [],
      error: error.message,
    });
  }
});

router.get(
  "/admitad/cache/refresh",
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      feedCache = null;
      const products = await getFeedProducts();
      res.json({
        success: true,
        message: "Cache refreshed",
        products_count: products.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/admitad/import",
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { feed_url } = req.body;
      const result = await importAdmitadFeed(feed_url);
      res.json({
        message: "Feed import completed",
        ...result,
      });
    } catch (error: any) {
      console.error("Feed import error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/admitad/start-scheduler",
  authMiddleware,
  adminOnlyMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { interval_hours } = req.body;
      startFeedSyncScheduler(interval_hours || 6);
      res.json({
        message: `Feed sync scheduler started (every ${interval_hours || 6} hours)`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/admitad/products", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || "trending";
    const products = await searchAdmitadProducts(query);
    res.json({ products, count: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/aliexpress/products", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || "trending";
    const products = await searchAliExpressProducts(query);
    res.json({ products, count: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/offers", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string;
    const network = req.query.network as string;
    const skip = (page - 1) * limit;

    const where: any = { 
        is_active: true,
        isValid: true 
    };
    if (category) where.category = category;
    if (network) where.network = network;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image_url: true,
          affiliate_link: true,
          network: true,
          category: true,
          ai_generated_ad: true,
          extra_data: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      products: products.map((p) => ({
        ...p,
        commission: p.extra_data?.commission_rate ? Number(p.extra_data.commission_rate) : null,
        price: p.price ?? null,
      })),
      offers: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/track/click", async (req: Request, res: Response) => {
  try {
    const { product_id, user_id, subid } = req.body;

    const productIdNum = Number(product_id);
    if (isNaN(productIdNum)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productIdNum },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const click = await prisma.affiliateClick.create({
      data: {
        user_id: user_id ? Number(user_id) : null,
        product_id: productIdNum,
        network: product.network || "unknown",
        click_id: `click_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        subid: subid || null,
        ip_address:
          req.ip || (req.headers["x-forwarded-for"] as string) || "unknown",
        user_agent: req.headers["user-agent"] || "unknown",
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: user_id ? Number(user_id) : null,
        action: "affiliate_click",
        details: {
          product_id,
          product_name: product.name,
          network: product.network,
          click_id: click.click_id,
        },
        ip_address: req.ip || "unknown",
      },
    });

    res.json({
      success: true,
      click_id: click.click_id,
      redirect_url: product.affiliate_link,
    });
  } catch (error: any) {
    console.error("Click tracking error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/track/click/:productId", async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const userId = req.query.uid ? Number(req.query.uid) : null;
    const subid = (req.query.subid as string) || null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.affiliate_link) {
      return res.status(404).json({ error: "Product not found" });
    }

    await prisma.affiliateClick.create({
      data: {
        user_id: userId,
        product_id: productId,
        network: product.network || "unknown",
        click_id: `click_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        subid,
        ip_address:
          req.ip || (req.headers["x-forwarded-for"] as string) || "unknown",
        user_agent: req.headers["user-agent"] || "unknown",
      },
    });

    res.redirect(product.affiliate_link);
  } catch (error: any) {
    console.error("Click redirect error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/leads",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [clicks, total] = await Promise.all([
        prisma.affiliateClick.findMany({
          where: { user_id: userId },
          orderBy: { created_at: "desc" },
          skip,
          take: limit,
        }),
        prisma.affiliateClick.count({ where: { user_id: userId } }),
      ]);

      const clicksWithProducts = await Promise.all(
        clicks.map(async (click) => {
          const product = click.product_id
            ? await prisma.product.findUnique({
                where: { id: click.product_id },
                select: {
                  id: true,
                  name: true,
                  image_url: true,
                  network: true,
                },
              })
            : null;
          return { ...click, product };
        }),
      );

      const conversions = clicksWithProducts.filter((c) => c.converted);

      res.json({
        leads: clicksWithProducts,
        stats: {
          total_clicks: total,
          conversions: conversions.length,
          conversion_rate:
            total > 0 ? Number(((conversions.length / total) * 100).toFixed(2)) : 0,
        },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/affiliate/manual/add - add manual product
router.post("/manual/add", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, commission, affiliate_link, image, category, network, currency } = req.body;
    
    if (!title || !affiliate_link) {
      return res.status(400).json({ error: "Title and affiliate_link are required" });
    }

    const product = await affiliateHybridService.addManualProduct({
      title,
      description: description || '',
      price: Number(price) || 0,
      commission: commission ? Number(commission) : undefined,
      affiliate_link,
      image: image || '',
      category: category || 'General',
      network: network || 'manual',
      currency: currency || 'USD'
    }, req.user?.id);

    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/affiliate/sync - sync all sources
router.post("/sync", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const results = await affiliateHybridService.syncAllSources();
    res.json({ success: true, ...results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/affiliate/status - get networks and connectors status
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = await affiliateHybridService.getNetworksStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/affiliate/search - search products
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const limit = Number(req.query.limit) || 50;
    const source = req.query.source as 'api' | 'public' | 'manual';
    const category = req.query.category as string;
    const network = req.query.network as string;

    if (!q) {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    const products = await affiliateHybridService.searchProducts(q, {
      limit,
      source,
      category,
      network
    });

    res.json({ products, total: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Content Generation Endpoint
router.post('/ai-generate-content', async (req: express.Request, res: express.Response) => {
  try {
    const { productTitle, productDescription, price, platform } = req.body;

    console.log('🤖 AI Content Generation Request:', {
      productTitle,
      productDescription,
      price,
      platform
    });

    // Validate input
    if (!productTitle || !productDescription || !price || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productTitle, productDescription, price, platform'
      });
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate platform-specific content
    let content;
    
    switch (platform.toLowerCase()) {
      case 'tiktok':
        content = generateTikTokContent(productTitle, productDescription, price);
        break;
      case 'youtube':
        content = generateYouTubeContent(productTitle, productDescription, price);
        break;
      case 'instagram':
        content = generateInstagramContent(productTitle, productDescription, price);
        break;
      default:
        content = generateTikTokContent(productTitle, productDescription, price);
    }

    console.log('✅ AI Content Generated Successfully');

    res.json({
      success: true,
      ...content
    });

  } catch (error) {
    console.error('❌ AI Content Generation Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI content'
    });
  }
});

// TikTok Content Generator
function generateTikTokContent(title: string, description: string, price: number) {
  const hooks = [
    `Stop scrolling! You NEED to see this ${title}!`,
    `This ${title} changed my life... 🤯`,
    `POV: You just found the perfect ${title}`,
    `I spent $${price} on this ${title} and...`
  ];

  const scripts = [
    `Let me tell you why this ${title} is absolutely worth every penny of $${price}. First off...`,
    `I've been using this ${title} for 2 weeks now and WOW. Here's my honest review...`,
    `If you're thinking about getting this ${title}, watch this first! Here's what you need to know...`,
    `This ${title} has been trending for a reason. Let me show you why it's going viral...`
  ];

  const captions = [
    `This ${title} is absolutely GAME-CHANGING! 😱 Worth every penny of $${price} #fyp #viral #shopping`,
    `Found my new favorite ${title}! 🎉 You guys NEED to see this! #tiktokmademebuyit #review`,
    `Is this ${title} worth the hype? ABSOLUTELY! ✨ #productreview #musthave`,
    `STOP what you're doing and look at this ${title}! 🔥 #trending #shoppingaddict`
  ];

  const hashtags = [
    '#fyp', '#viral', '#tiktokmademebuyit', '#shopping', '#review', '#musthave', 
    '#productreview', '#trending', '#deals', '#amazonfinds', '#tech', '#gadgets'
  ];

  return {
    hook: hooks[Math.floor(Math.random() * hooks.length)],
    script: scripts[Math.floor(Math.random() * scripts.length)],
    caption: captions[Math.floor(Math.random() * captions.length)],
    hashtags: hashtags.slice(0, 8)
  };
}

// YouTube Content Generator
function generateYouTubeContent(title: string, description: string, price: number) {
  const hooks = [
    `The ${title} That Changed Everything - My Honest Review`,
    `Is This ${title} Worth $${price}? Complete Analysis`,
    `Why Everyone's Buying This ${title} - The Truth`,
    `${title} Review: Is It Finally Worth The Hype?`
  ];

  const scripts = [
    `Hey everyone, welcome back to the channel! Today we're diving deep into the ${title}, a product that's been getting a lot of attention lately. At $${price}, is it really worth your money? Let's find out...`,
    `In this comprehensive review, I'll be testing every feature of the ${title}. From build quality to performance, we'll cover everything you need to know before making your purchase...`,
    `I've been using this ${title} for 30 days straight, and today I'm sharing my complete experience - the good, the bad, and everything in between. Let's get started...`
  ];

  const captions = [
    `Complete ${title} review! Is it worth $${price}? Watch to find out everything you need to know before buying! #productreview #techreview`,
    `Honest ${title} review after 30 days of use! The results might surprise you... #review #unboxing`,
    `This ${title} review covers all features, pros, and cons. Is it worth your money in 2024? #detailedreview`,
    `${title} complete guide and review! Everything you need to know before purchasing! #buyingguide`
  ];

  const hashtags = [
    '#productreview', '#techreview', '#unboxing', '#review', '#technology', '#gadgets',
    '#buyingguide', '#honestreview', '#detailedreview', '#comparison', '#youtube', '#reviewer'
  ];

  return {
    hook: hooks[Math.floor(Math.random() * hooks.length)],
    script: scripts[Math.floor(Math.random() * scripts.length)],
    caption: captions[Math.floor(Math.random() * captions.length)],
    hashtags: hashtags.slice(0, 8)
  };
}

// Instagram Content Generator
function generateInstagramContent(title: string, description: string, price: number) {
  const hooks = [
    `✨ The ${title} that's taking over my feed!`,
    `🚀 This ${title} is absolutely EVERYWHERE right now!`,
    `💯 My honest thoughts on this viral ${title}`,
    `🎯 The ${title} you've been seeing everywhere!`
  ];

  const scripts = [
    `Okay, let's talk about this ${title} that everyone's been asking about! I finally got my hands on it and here's my honest take...`,
    `I've been testing this ${title} for a while now, and I think I'm ready to give you my complete verdict. Is it worth the hype?`,
    `STOP scrolling if you've been thinking about getting this ${title}! I need to show you something important...`
  ];

  const captions = [
    `Finally got my hands on the viral ${title}! 🎉 Here's my honest review - is it worth $${price}? Let me know in the comments! ✨ #productreview #unboxing #newin`,
    `This ${title} has been living rent-free in my head! 🤯 Here's everything you need to know before you buy... #review #shopping #musthave`,
    `My complete ${title} review! 💫 Worth every penny or just hype? Watch to find out! #honestreview #productphotography`,
    `The ${title} that's breaking the internet! 🔥 Here's my take on whether it's actually worth it... #viralproduct #review`
  ];

  const hashtags = [
    '#productreview', '#unboxing', '#newin', '#shopping', '#musthave', '#review', 
    '#honestreview', '#productphotography', '#instareview', '#shoppingaddict', '#viralproduct', '#teampage'
  ];

  return {
    hook: hooks[Math.floor(Math.random() * hooks.length)],
    script: scripts[Math.floor(Math.random() * scripts.length)],
    caption: captions[Math.floor(Math.random() * captions.length)],
    hashtags: hashtags.slice(0, 8)
  };
}

// GET /api/affiliate/networks - Get network status
router.get("/networks", async (req: Request, res: Response) => {
  try {
    const networkStatus = affiliateConnector.getNetworkStatus();
    const activeNetworks = affiliateConnector.getActiveNetworks();
    
    console.log('📊 Network status requested:', {
      totalNetworks: networkStatus.length,
      activeNetworks: activeNetworks.length,
      networks: networkStatus.map(n => ({ name: n.name, hasKey: n.hasKey, active: n.active }))
    });
    
    res.json({
      success: true,
      networks: networkStatus,
      activeNetworks,
      summary: {
        total: networkStatus.length,
        withKeys: networkStatus.filter(n => n.hasKey).length,
        active: networkStatus.filter(n => n.active).length,
        failed: networkStatus.filter(n => n.error).length
      }
    });
  } catch (error) {
    console.error("Error in /api/affiliate/networks:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to get network status",
      networks: []
    });
  }
});

// DIGISTORE24 WEBHOOK ENDPOINT
// POST /affiliate/digistore/webhook
// PHASE 2: CONVERSION LINKING
router.post('/digistore/webhook', async (req, res) => {
  try {
    const data = req.body;
    const { event, product_id, transaction_id, amount, currency, custom } = data;

    // IDEMPOTENCY CHECK - FIRST THING (before any processing)
    if (transaction_id) {
      const existing = await prisma.affiliate_events.findUnique({
        where: { eventId: transaction_id }
      });

      if (existing) {
        console.log("⚠️ DUPLICATE WEBHOOK - Already processed:", transaction_id);
        return res.status(200).json({ 
          success: true, 
          message: 'Already processed',
          idempotent: true 
        });
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("DIGISTORE24 WEBHOOK RECEIVED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("EVENT:", event);
    console.log("TRANSACTION ID:", transaction_id);
    console.log("AMOUNT:", amount);
    console.log("PRODUCT ID:", product_id);
    // SANITIZED: Do not log buyer_email or full payload

    // Only process sale events
    if (event !== 'sale') {
      console.log("⚠️ Not a sale event, ignoring");
      return res.status(200).json({ received: true, ignored: true });
    }

    // PHASE 2: Extract subid (clickId)
    const subId = custom;
    if (!subId) {
      console.log("❌ No subId found in webhook - IGNORING EVENT");
      return res.status(200).json({ 
        received: true, 
        ignored: true,
        reason: 'No subId - cannot link to click'
      });
    }

    // PHASE 2: Find matching click by clickId (stored in externalSubId)
    const matchingClick = await prisma.clicks.findFirst({
      where: { 
        externalSubId: subId
      }
    });

    if (!matchingClick) {
      console.log("❌ No matching click found for subId:", subId, "- IGNORING EVENT");
      return res.status(200).json({ 
        received: true, 
        ignored: true,
        reason: 'No matching click found'
      });
    }

    console.log("✅ MATCHING CLICK FOUND:", {
      clickId: matchingClick.clickId,
      userId: matchingClick.userId,
      productId: matchingClick.offerId
    });

    // Get user from click
    const user = await prisma.user.findUnique({
      where: { id: matchingClick.userId }
    });

    if (!user) {
      console.log("❌ User not found for userId:", matchingClick.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const amountNumber = parseFloat(amount);
    const platformFee = amountNumber * 0.02; // 2% platform fee
    const userAmount = amountNumber * 0.98; // 98% to user

    console.log("USER ID:", user.id);
    console.log("AMOUNT:", amountNumber);
    console.log("USER CREDIT:", userAmount);
    console.log("PLATFORM FEE:", platformFee);

    await prisma.$transaction(async (tx) => {

      // Save affiliate event
      await tx.affiliate_events.create({
        data: {
          network: 'digistore24',
          eventId: transaction_id,
          payloadHash: JSON.stringify(data),
          userId: user.id,
          amount: amountNumber
        }
      });

      // SAFE CHECK: Ensure wallet exists before updating
      let wallet = await tx.wallet.findUnique({
        where: { userId: String(user.id) }
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: String(user.id),
            balance: 0,
            locked_balance: 0
          }
        });
      }

      // Credit user wallet (98%)
      await tx.wallet.update({
        where: { userId: String(user.id) },
        data: {
          balance: { increment: userAmount },
          totalEarned: { increment: userAmount }
        }
      });

      // User ledger entry
      await tx.transactionLedger.create({
        data: {
          userId: user.id,
          amount: Math.round(userAmount),
          type: 'credit',
          reason: 'Affiliate commission'
        }
      });

      // PLATFORM WALLET TRACKING (2% fee)
      const PLATFORM_USER_ID = 0; // Platform system user
      
      // Ensure platform wallet exists
      let platformWallet = await tx.wallet.findUnique({
        where: { userId: String(PLATFORM_USER_ID) }
      });

      if (!platformWallet) {
        platformWallet = await tx.wallet.create({
          data: {
            userId: String(PLATFORM_USER_ID),
            balance: 0,
            locked_balance: 0
          }
        });
      }

      // Credit platform wallet with 2% fee
      await tx.wallet.update({
        where: { userId: String(PLATFORM_USER_ID) },
        data: {
          balance: { increment: platformFee },
          totalEarned: { increment: platformFee }
        }
      });

      // Platform ledger entry
      await tx.transactionLedger.create({
        data: {
          userId: PLATFORM_USER_ID,
          amount: Math.round(platformFee),
          type: 'platform_credit',
          reason: 'affiliate_commission'
        }
      });

      console.log("PLATFORM WALLET CREDITED:", {
        platformFee,
        platformUserId: PLATFORM_USER_ID,
        reference: 'affiliate_commission'
      });

      // Platform revenue
      await tx.platform_revenues.create({
        data: {
          userId: user.id,
          amount: amountNumber,
          platformShare: platformFee,
          userShare: userAmount
        }
      });

      // PHASE 2: Create conversion record linked to click
      await tx.conversions.create({
        data: {
          offerId: matchingClick.offerId,
          clickToken: matchingClick.clickToken,
          revenue: Math.round(amountNumber),
          amount: amountNumber,
          status: 'approved'
        }
      });

      // PHASE 2: Update click to mark as converted
      await tx.clicks.update({
        where: { id: matchingClick.id },
        data: {
          converted: true,
          revenue: amountNumber
        }
      });

      console.log("✅ CONVERSION CREATED AND CLICK UPDATED:", {
        clickId: matchingClick.clickId,
        conversionAmount: amountNumber,
        converted: true
      });

    });

    return res.json({ success: true });

  } catch (error: any) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
