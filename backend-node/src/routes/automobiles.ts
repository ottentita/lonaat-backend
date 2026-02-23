import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const brand = req.query.brand as string;
    const status = req.query.status as string || 'approved';

    const where: any = {};
    if (status !== 'all') where.status = status;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    const [automobiles, total] = await Promise.all([
      prisma.automobile.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          seller: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.automobile.count({ where })
    ]);

    res.json({
      automobiles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    console.error('List automobiles error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const where: any = { seller_id: req.user?.id };
    if (status && status !== 'all') where.status = status;

    const [automobiles, total] = await Promise.all([
      prisma.automobile.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.automobile.count({ where })
    ]);

    res.json({
      automobiles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.isAdmin ? undefined : req.user?.id;

    const where = userId ? { seller_id: userId } : {};

    const [total, approved, sold, pending] = await Promise.all([
      prisma.automobile.count({ where }),
      prisma.automobile.count({ where: { ...where, status: 'approved' } }),
      prisma.automobile.count({ where: { ...where, status: 'sold' } }),
      prisma.automobile.count({ where: { ...where, status: 'pending' } })
    ]);

    const soldAutos = await prisma.automobile.findMany({
      where: { ...where, status: 'sold' },
      select: { price: true }
    });

    const revenue = soldAutos.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

    res.json({
      total,
      approved,
      sold,
      pending,
      revenue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const automobile = await prisma.automobile.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!automobile) {
      return res.status(404).json({ error: 'Automobile not found' });
    }

    await prisma.automobile.update({
      where: { id },
      data: { views: { increment: 1 } }
    });

    res.json(automobile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, brand, model, year, mileage,
      fuel_type, transmission, condition,
      price, currency, location, images, description
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const automobile = await prisma.automobile.create({
      data: {
        title,
        brand,
        model,
        year: year ? parseInt(year) : null,
        mileage: mileage ? parseInt(mileage) : null,
        fuel_type,
        transmission,
        condition,
        price: price ? Number(price) : null,
        currency: currency || 'USD',
        location,
        images,
        description,
        seller_id: req.user?.id,
        listing_type: 'direct',
        status: 'pending'
      }
    });

    res.status(201).json(automobile);
  } catch (error: any) {
    console.error('Create automobile error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.automobile.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Automobile not found' });
    }

    if (!req.user?.isAdmin && existing.seller_id !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      title, brand, model, year, mileage,
      fuel_type, transmission, condition,
      price, currency, location, images, description
    } = req.body;

    const updated = await prisma.automobile.update({
      where: { id },
      data: {
        title,
        brand,
        model,
        year: year ? parseInt(year) : undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        fuel_type,
        transmission,
        condition,
        price: price ? Number(price) : undefined,
        currency,
        location,
        images,
        description
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'sold', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await prisma.automobile.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Automobile not found' });
    }

    if (!req.user?.isAdmin && existing.seller_id !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.user?.isAdmin && status === 'approved') {
      return res.status(403).json({ error: 'Only admins can approve listings' });
    }

    const updated = await prisma.automobile.update({
      where: { id },
      data: { status }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.automobile.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Automobile not found' });
    }

    if (!req.user?.isAdmin && existing.seller_id !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.automobile.delete({ where: { id } });

    res.json({ success: true, message: 'Automobile deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/affiliate/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { network, items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    let imported = 0;
    for (const item of items) {
      try {
        await prisma.automobile.create({
          data: {
            title: item.title || `${item.brand} ${item.model}`,
            brand: item.brand,
            model: item.model,
            year: item.year ? parseInt(item.year) : null,
            price: item.price ? Number(item.price) : null,
            currency: item.currency || 'USD',
            images: item.images || (item.image ? [item.image] : null),
            description: item.description,
            location: item.location,
            affiliate_network: network,
            affiliate_url: item.url || item.affiliate_url,
            listing_type: 'affiliate',
            status: 'approved',
            seller_id: req.user?.id
          }
        });
        imported++;
      } catch (e) {
        console.error('Import item error:', e);
      }
    }

    res.json({ success: true, imported, total: items.length });
  } catch (error: any) {
    console.error('Affiliate import error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/track/click/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const automobile = await prisma.automobile.findUnique({ where: { id } });

    if (!automobile) {
      return res.status(404).json({ error: 'Automobile not found' });
    }

    await prisma.automobile.update({
      where: { id },
      data: { clicks: { increment: 1 } }
    });

    if (automobile.affiliate_url) {
      return res.redirect(automobile.affiliate_url);
    }

    res.json({ success: true, message: 'Click tracked' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
