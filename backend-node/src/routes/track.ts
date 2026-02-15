import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Track click and redirect
router.get("/click/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const offer = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!offer || !offer.affiliate_link) {
      return res.status(404).send("Offer not found");
    }

    // Save click
    await prisma.click.create({
      data: {
        productId: String(productId),
        campaignId: "default-campaign",
        source: "web",
      },
    });

    // Redirect to affiliate link
    return res.redirect(offer.affiliate_link);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Tracking error");
  }
});

export default router;
