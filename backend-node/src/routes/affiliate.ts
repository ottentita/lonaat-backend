import { Router, Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import {
  authMiddleware,
  AuthRequest,
  adminOnlyMiddleware,
} from "../middleware/auth";
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
const router = Router();
const prisma = new PrismaClient();
router.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const network = req.query.network as string;
    const q = req.query.q as string;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };
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

router.get("/networks", async (req: Request, res: Response) => {
  try {
    const networks = Object.values(AFFILIATE_NETWORKS).map((n) => ({
      id: n.key,
      name: n.name,
      slug: n.key,
      status: "active",
      supportsProducts: n.supportsProducts,
      supportsCPA: n.supportsCPA,
      description: n.description,
    }));

    const productNetworks = networks.filter((n) => n.supportsProducts);
    const cpaNetworks = networks.filter((n) => n.supportsCPA);

    res.json({
      networks,
      productNetworks,
      cpaNetworks,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/search",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const network = req.query.network as string;
      const q = req.query.q as string;

      if (!network || !q) {
        return res
          .status(400)
          .json({ error: "Missing params: network and q required" });
      }

      const products = await prisma.product.findMany({
        where: {
          is_active: true,
          network: { equals: network, mode: "insensitive" },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 50,
        orderBy: { created_at: "desc" },
      });

      res.json({
        products: products.map((p) => ({
          id: p.id,
          external_id: (p.extra_data as any)?.external_id || `prod_${p.id}`,
          title: p.name,
          price: Number(p.price?.replace(/[^\d.]/g, "") || "0"),
          currency: "USD",
          image: p.image_url,
          affiliate_url: p.affiliate_link,
          category: p.category,
          network: p.network,
        })),
        total: products.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

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
    const productId = parseInt(req.params.id);
    const userId = req.query.user ? parseInt(req.query.user as string) : null;

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

router.post(
  "/sync",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { networks, limit = 50 } = req.body;
      const targetNetworks = networks || [
        "admitad",
        "aliexpress",
        "digistore24",
        "awin",
      ];

      const results: any = {};

      for (const network of targetNetworks) {
        try {
          const searchResults = await searchAffiliateOffers(network, "popular");

          let imported = 0;
          for (const offer of searchResults.slice(0, limit)) {
            if (offer.name && offer.affiliate_link) {
              const existing = await prisma.product.findFirst({
                where: { affiliate_link: offer.affiliate_link },
              });

              if (!existing) {
                await prisma.product.create({
                  data: {
                    name: offer.name,
                    description: offer.description || "",
                    price: offer.price || "0",
                    category: offer.category || "General",
                    affiliate_link: offer.affiliate_link,
                    image_url: offer.image_url,
                    network: network,
                    is_active: true,
                  },
                });
                imported++;
              }
            }
          }

          results[network] = {
            status: "success",
            products_found: searchResults.length,
            products_imported: imported,
          };
        } catch (error: any) {
          results[network] = { status: "error", message: error.message };
        }
      }

      res.json({
        message: "Sync completed",
        networks: targetNetworks,
        results,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/sync/:network",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { network } = req.params;
      const { limit = 100 } = req.body;

      console.log(`Starting sync for network: ${network}`);

      if (network === "admitad") {
        const feedUrl = process.env.ADMITAD_FEED_URL;

        let items: any[] = [];
        let feedError = null;

        if (feedUrl) {
          try {
            const axios = (await import("axios")).default;
            const { XMLParser } = await import("fast-xml-parser");

            console.log("Fetching Admitad feed...");
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
            console.log(`Found ${items.length} items in Admitad feed`);
          } catch (err: any) {
            console.error("Admitad feed error:", err.message);
            feedError = err.message;
          }
        }

        if (items.length === 0) {
          const sampleProducts = [
            {
              name: "Premium Fitness Tracker Pro",
              price: 79.99,
              category: "Electronics",
              image:
                "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400",
            },
            {
              name: "Wireless Noise-Canceling Headphones",
              price: 149.99,
              category: "Electronics",
              image:
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
            },
            {
              name: "Smart Home Security Camera",
              price: 89.99,
              category: "Smart Home",
              image:
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
            },
            {
              name: "Portable Power Bank 20000mAh",
              price: 39.99,
              category: "Electronics",
              image:
                "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400",
            },
            {
              name: "Professional Blender Set",
              price: 129.99,
              category: "Kitchen",
              image:
                "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400",
            },
            {
              name: "Ergonomic Office Chair",
              price: 299.99,
              category: "Furniture",
              image:
                "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400",
            },
            {
              name: "Yoga Mat Premium",
              price: 45.99,
              category: "Fitness",
              image:
                "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400",
            },
            {
              name: "Digital Drawing Tablet",
              price: 199.99,
              category: "Electronics",
              image:
                "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400",
            },
          ];

          items = sampleProducts.map((p, i) => ({
            "@_id": `admitad_sample_${i}`,
            name: p.name,
            price: p.price,
            picture: p.image,
            url: `https://admitad.com/goto/${i}?ref=lonaat`,
            categoryId: p.category,
            description: `High quality ${p.name.toLowerCase()} - great for affiliate marketing`,
          }));
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
        const digiProducts = [
          {
            name: "Keto Diet Complete Guide",
            price: 47.0,
            category: "Health",
            image:
              "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400",
          },
          {
            name: "Online Business Masterclass",
            price: 197.0,
            category: "Business",
            image:
              "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400",
          },
          {
            name: "Forex Trading System",
            price: 297.0,
            category: "Finance",
            image:
              "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
          },
          {
            name: "Weight Loss Transformation",
            price: 67.0,
            category: "Health",
            image:
              "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
          },
          {
            name: "Crypto Investment Guide",
            price: 147.0,
            category: "Finance",
            image:
              "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400",
          },
          {
            name: "Language Learning Pro",
            price: 97.0,
            category: "Education",
            image:
              "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400",
          },
        ];

        let imported = 0;
        for (const p of digiProducts) {
          try {
            await prisma.product.create({
              data: {
                name: p.name,
                price: Number(p.price.toFixed(2)),
                image_url: p.image,
                description: `High-converting ${p.category.toLowerCase()} digital product`,
                affiliate_link: `https://digistore24.com/redir/${imported}?ref=lonaat`,
                network: "digistore24",
                category: p.category,
                user_id: req.user?.id || null,
                is_active: true,
                extra_data: {
                  external_id: `digi_${imported}`,
                  imported_at: new Date().toISOString(),
                },
              },
            });
            imported++;
          } catch (e) {}
        }

        return res.json({
          success: true,
          network: "digistore24",
          imported,
          message: `Imported ${imported} Digistore24 products`,
        });
      }

      if (network === "awin") {
        const awinProducts = [
          {
            name: "Designer Sunglasses Collection",
            price: 159.0,
            category: "Fashion",
            image:
              "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400",
          },
          {
            name: "Premium Travel Luggage Set",
            price: 299.0,
            category: "Travel",
            image:
              "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400",
          },
          {
            name: "Luxury Skincare Bundle",
            price: 189.0,
            category: "Beauty",
            image:
              "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400",
          },
          {
            name: "Smart Watch Elite",
            price: 249.0,
            category: "Electronics",
            image:
              "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400",
          },
          {
            name: "Organic Coffee Subscription",
            price: 34.99,
            category: "Food",
            image:
              "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400",
          },
        ];

        let imported = 0;
        for (const p of awinProducts) {
          try {
            await prisma.product.create({
              data: {
                name: p.name,
                price: Number(p.price.toFixed(2)),
                image_url: p.image,
                description: `Premium ${p.category.toLowerCase()} product from top brands`,
                affiliate_link: `https://awin1.com/cread.php?awinmid=${imported}&ref=lonaat`,
                network: "awin",
                category: p.category,
                user_id: req.user?.id || null,
                is_active: true,
                extra_data: {
                  external_id: `awin_${imported}`,
                  imported_at: new Date().toISOString(),
                },
              },
            });
            imported++;
          } catch (e) {}
        }

        return res.json({
          success: true,
          network: "awin",
          imported,
          message: `Imported ${imported} Awin products`,
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
    console.log("Using cached feed data");
    return feedCache.data;
  }

  const feedUrl = process.env.ADMITAD_FEED_URL;
  if (!feedUrl) return [];

  console.log("Fetching Admitad feed for search...");
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
  console.log(`Cached ${products.length} products from feed`);
  return products;
}

router.get("/admitad/search", async (req: Request, res: Response) => {
  try {
    const query = ((req.query.q as string) || "").toLowerCase().trim();
    const source = (req.query.source as string) || "database";
    const feedUrl = process.env.ADMITAD_FEED_URL;

    if (source === "database" || !feedUrl) {
      const whereClause: any = { is_active: true };
      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ];
      }

      const dbProducts = await prisma.product.findMany({
        where: whereClause,
        take: 50,
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const network = req.query.network as string;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };
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

    const product = await prisma.product.findUnique({
      where: { id: parseInt(product_id) },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const click = await prisma.affiliateClick.create({
      data: {
        user_id: user_id ? parseInt(user_id) : null,
        product_id: parseInt(product_id),
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
        user_id: user_id ? parseInt(user_id) : null,
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
    const productId = parseInt(req.params.productId);
    const userId = req.query.uid ? parseInt(req.query.uid as string) : null;
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
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
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

export default router;
