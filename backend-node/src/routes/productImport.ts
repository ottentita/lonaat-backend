import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { searchAffiliateOffers } from "../services/affiliateSearch";

const router = Router();
const prisma = new PrismaClient();

router.get("/search", async (req: Request, res: Response) => {
  const { network, query, q, save } = req.query;
  const searchQuery = (query || q) as string;

  if (!searchQuery) {
    return res.status(400).json({ message: "query required" });
  }

  try {
    const offers = await searchAffiliateOffers(
      network ? String(network) : "all",
      String(searchQuery)
    );

    if (save === "true" && offers.length > 0) {
      await prisma.product.createMany({
        data: offers.map((o: any) => ({
          name: o.name,
          description: o.description || "",
          price: o.price?.toString() || null,
          network: o.network || "unknown",
          affiliate_link: o.affiliate_link || null,
          image_url: o.image_url || null,
          category: o.category || null,
          is_active: true
        })),
        skipDuplicates: true
      });
    }

    return res.json({ offers, saved: save === "true" });
  } catch (err: any) {
    console.error("Affiliate search error:", err.message);
    return res.status(500).json({ message: err.message });
  }
});

router.post("/import", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { products } = req.body;

  if (!Array.isArray(products)) {
    return res.status(400).json({ message: "products array required" });
  }

  await prisma.product.createMany({
    data: products.map((p: any) => ({
      name: p.name,
      description: p.description,
      price: p.price?.toString() || null,
      network: p.network,
      user_id: req.user?.id || null,
      is_active: true
    })),
    skipDuplicates: true
  });

  res.json({ message: "Products imported successfully" });
});

export default router;
