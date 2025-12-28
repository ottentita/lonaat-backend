import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { searchAffiliateOffers } from "../services/affiliateSearch";

const router = Router();
const prisma = new PrismaClient();

router.get("/search", async (req: Request, res: Response) => {
  const { network, query, q } = req.query;
  const searchQuery = (query || q) as string;

  if (!network || !searchQuery) {
    return res.status(400).json({ message: "network and query required" });
  }

  try {
    const offers = await searchAffiliateOffers(
      String(network),
      String(searchQuery)
    );

    return res.json({ offers });
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
