import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

const LISTING_FEES = {
  house: { sale: 50000, rent: 25000 },
  land: { sale: 30000, rent: 15000 },
  apartment: { sale: 40000, rent: 20000 },
  commercial: { sale: 75000, rent: 50000 },
  rental: { sale: 25000, rent: 15000 },
  guest_house: { sale: 100000, rent: 75000 }
};

const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs allowed'));
    }
  }
});

function calculateListingFee(propertyType: string, transactionType: string): number {
  const fees = LISTING_FEES[propertyType as keyof typeof LISTING_FEES] || LISTING_FEES.house;
  return fees[transactionType as keyof typeof fees] || fees.sale;
}

router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;
    const {
      title,
      description,
      property_type,
      transaction_type,
      price,
      location,
      region,
      city,
      bedrooms,
      bathrooms,
      area_sqft,
      images
    } = req.body;

    if (!title || !property_type || !transaction_type || !price) {
      return res.status(400).json({ error: 'Title, property type, transaction type, and price are required' });
    }

    const listingFee = isAdmin ? 0 : calculateListingFee(property_type, transaction_type);

    const property = await prisma.realEstateProperty.create({
      data: {
        user_id: userId,
        title,
        description,
        property_type,
        transaction_type,
        price: parseFloat(price),
        currency: 'XAF',
        location,
        region,
        city,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        area_sqft: area_sqft ? parseInt(area_sqft) : null,
        images: images || [],
        listing_fee: listingFee,
        status: isAdmin ? 'approved' : 'pending',
        is_paid: isAdmin,
        approved_at: isAdmin ? new Date() : null,
        approved_by: isAdmin ? userId : null,
        is_active: isAdmin
      }
    });

    if (isAdmin) {
      await prisma.notification.create({
        data: {
          user_id: userId,
          title: 'Property Listed',
          message: `Your property "${title}" is now live (admin auto-approval).`,
          type: 'success'
        }
      });
    }

    res.status(201).json({
      message: isAdmin ? 'Property created and auto-approved' : 'Property created. Please pay listing fee.',
      property,
      listing_fee: listingFee,
      requires_payment: !isAdmin
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { user_id: userId };
    if (status) where.status = status;

    const properties = await prisma.realEstateProperty.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: Number(limit),
      skip,
      include: {
        property_payments: { orderBy: { created_at: 'desc' }, take: 1 },
        property_ads: { where: { is_active: true } }
      }
    });

    const total = await prisma.realEstateProperty.count({ where });

    res.json({
      properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

router.get('/listing/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const property = await prisma.realEstateProperty.findUnique({
      where: { id: Number(id) },
      include: {
        property_payments: { orderBy: { created_at: 'desc' } },
        property_ads: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.user_id !== req.user!.id && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ property });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get property' });
  }
});

router.put('/update/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: Number(id) }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.user_id !== userId && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'You can only edit your own properties' });
    }

    const {
      title,
      description,
      property_type,
      transaction_type,
      price,
      location,
      region,
      city,
      bedrooms,
      bathrooms,
      area_sqft,
      images
    } = req.body;

    const updated = await prisma.realEstateProperty.update({
      where: { id: Number(id) },
      data: {
        title: title || property.title,
        description: description !== undefined ? description : property.description,
        property_type: property_type || property.property_type,
        transaction_type: transaction_type || property.transaction_type,
        price: price ? parseFloat(price) : property.price,
        location: location || property.location,
        region: region || property.region,
        city: city || property.city,
        bedrooms: bedrooms !== undefined ? parseInt(bedrooms) : property.bedrooms,
        bathrooms: bathrooms !== undefined ? parseInt(bathrooms) : property.bathrooms,
        area_sqft: area_sqft !== undefined ? parseInt(area_sqft) : property.area_sqft,
        images: images || property.images
      }
    });

    res.json({ message: 'Property updated', property: updated });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: Number(id) }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.user_id !== userId && !req.user!.isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own properties' });
    }

    await prisma.propertyAd.deleteMany({ where: { property_id: Number(id) } });
    await prisma.propertyPayment.deleteMany({ where: { property_id: Number(id) } });
    await prisma.realEstateProperty.delete({ where: { id: Number(id) } });

    res.json({ message: 'Property deleted' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

router.post('/:id/pay', authMiddleware, upload.single('receipt'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: Number(id) }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.user_id !== userId) {
      return res.status(403).json({ error: 'You can only pay for your own properties' });
    }

    if (property.is_paid) {
      return res.status(400).json({ error: 'Property listing fee already paid' });
    }

    const pendingPayment = await prisma.propertyPayment.findFirst({
      where: { property_id: Number(id), status: 'pending' }
    });

    if (pendingPayment) {
      return res.status(400).json({ error: 'A payment is already pending for this property' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Receipt file is required' });
    }

    const payment = await prisma.propertyPayment.create({
      data: {
        user_id: userId,
        property_id: Number(id),
        amount: property.listing_fee || 0,
        currency: 'XAF',
        payment_method: 'bank_transfer',
        payment_type: 'listing_fee',
        receipt_url: `/uploads/receipts/${req.file.filename}`,
        receipt_filename: req.file.filename,
        status: 'pending'
      }
    });

    res.json({
      message: 'Payment receipt uploaded. Awaiting admin approval.',
      payment
    });
  } catch (error) {
    console.error('Pay property error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

router.post('/:id/boost', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.isAdmin;

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: Number(id) }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'You can only boost your own properties' });
    }

    if (property.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved properties can be boosted' });
    }

    const activeAd = await prisma.propertyAd.findFirst({
      where: {
        property_id: Number(id),
        is_active: true,
        boost_end: { gt: new Date() }
      }
    });

    if (activeAd) {
      return res.status(400).json({ error: 'Property already has an active boost' });
    }

    const BOOST_COST = 10;

    if (!isAdmin) {
      const wallet = await prisma.creditWallet.findUnique({
        where: { user_id: userId }
      });

      if (!wallet || wallet.credits < BOOST_COST) {
        return res.status(400).json({
          error: 'Insufficient credits',
          required: BOOST_COST,
          available: wallet?.credits || 0
        });
      }

      await prisma.creditWallet.update({
        where: { user_id: userId },
        data: {
          credits: { decrement: BOOST_COST },
          total_spent: { increment: BOOST_COST }
        }
      });
    }

    const boostEnd = new Date();
    boostEnd.setHours(boostEnd.getHours() + 24);

    const adBoost = await prisma.adBoost.create({
      data: {
        user_id: userId,
        boost_type: 'property',
        credits_spent: isAdmin ? 0 : BOOST_COST,
        status: 'active',
        expires_at: boostEnd,
        is_admin_campaign: isAdmin,
        auto_boost: true,
        boost_intensity: 1,
        campaign_config: { property_id: Number(id), type: 'real_estate' }
      }
    });

    const propertyAd = await prisma.propertyAd.create({
      data: {
        property_id: Number(id),
        campaign_id: adBoost.id,
        boost_start: new Date(),
        boost_end: boostEnd,
        is_active: true,
        is_admin: isAdmin
      }
    });

    res.json({
      message: isAdmin ? 'Property boosted for FREE (admin)' : 'Property boosted successfully',
      property_ad: propertyAd,
      boost_end: boostEnd,
      credits_spent: isAdmin ? 0 : BOOST_COST
    });
  } catch (error) {
    console.error('Boost property error:', error);
    res.status(500).json({ error: 'Failed to boost property' });
  }
});

router.get('/marketplace', async (req, res) => {
  try {
    const { property_type, transaction_type, region, city, min_price, max_price, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      status: 'approved',
      is_active: true
    };

    if (property_type) where.property_type = property_type;
    if (transaction_type) where.transaction_type = transaction_type;
    if (region) where.region = region;
    if (city) where.city = city;
    if (min_price) where.price = { ...where.price, gte: parseFloat(min_price as string) };
    if (max_price) where.price = { ...where.price, lte: parseFloat(max_price as string) };

    const properties = await prisma.realEstateProperty.findMany({
      where,
      orderBy: [
        { is_featured: 'desc' },
        { created_at: 'desc' }
      ],
      take: Number(limit),
      skip,
      select: {
        id: true,
        title: true,
        description: true,
        property_type: true,
        transaction_type: true,
        price: true,
        currency: true,
        location: true,
        region: true,
        city: true,
        bedrooms: true,
        bathrooms: true,
        area_sqft: true,
        images: true,
        image_url: true,
        is_featured: true,
        created_at: true
      }
    });

    const total = await prisma.realEstateProperty.count({ where });

    res.json({
      properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Marketplace error:', error);
    res.status(500).json({ error: 'Failed to get properties' });
  }
});

router.get('/fees', authMiddleware, (req, res) => {
  res.json({
    listing_fees: LISTING_FEES,
    currency: 'XAF',
    payment_method: 'bank_transfer',
    bank_details: {
      bank_name: 'Afriland First Bank',
      account_number: '1234567890',
      account_name: 'Lonaat Real Estate',
      swift_code: 'AFRIFRCM'
    }
  });
});

export default router;
