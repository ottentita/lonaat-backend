import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/search", async (req: Request, res: Response) => {
  const { network, query } = req.query;

  if (!network || !query) {
    return res.status(400).json({ message: "network and query required" });
  }

  const offers = [
    {
      name: `${query} Pro`,
      description: "Auto-imported affiliate product",
      price: "49",
      network,
      is_active: true
    },
    {
      name: `${query} Plus`,
      description: "Affiliate offer from network",
      price: "79",
      network,
      is_active: true
    }
  ];

  return res.json({ offers });
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
