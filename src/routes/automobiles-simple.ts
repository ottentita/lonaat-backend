import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// GET /api/automobiles-simple/list - Get all automobiles
router.get('/list', async (req, res) => {
  console.log('📋 GET AUTOMOBILES LIST');
  
  try {
    const { status, brand, year } = req.query;

    // Build filter conditions
    const where: any = {};
    if (status) where.status = status as string;
    if (brand) where.brand = brand as string;
    if (year) where.year = Number(year);

    const automobiles = await prisma.automobiles.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    console.log('✅ Automobiles retrieved:', automobiles.length);

    res.json({
      success: true,
      automobiles: automobiles,
      total: automobiles.length
    });

  } catch (error: any) {
    console.error('❌ Get automobiles error:', error);
    res.status(500).json({ 
      error: 'Failed to get automobiles',
      details: error.message 
    });
  }
});

// POST /api/automobiles-simple/create - Create automobile
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  console.log('➕ CREATE AUTOMOBILE');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      brand,
      model,
      year,
      price,
      type,
      rentPrice,
      mileage,
      fuel_type,
      transmission,
      condition,
      images
    } = req.body;

    if (!title || !brand || !model || !year || !price) {
      return res.status(400).json({ 
        error: 'Title, brand, model, year, and price are required' 
      });
    }

    const automobile = await prisma.automobiles.create({
      data: {
        userId,
        title,
        description: description || '',
        brand,
        model,
        year: Number(year),
        price: parseFloat(price),
        type: type || 'sale',
        rentPrice: rentPrice ? parseFloat(rentPrice) : null,
        mileage: mileage ? Number(mileage) : 0,
        fuelType: fuel_type || 'Petrol',
        transmission: transmission || 'Manual',
        condition: condition || 'Good',
        images: images || [],
        status: 'available'
      }
    });

    console.log('✅ Automobile created:', automobile.id);

    res.json({
      success: true,
      message: 'Automobile created successfully',
      automobile
    });

  } catch (error: any) {
    console.error('❌ Create automobile error:', error);
    res.status(500).json({ 
      error: 'Failed to create automobile',
      details: error.message 
    });
  }
});

// Track automobile view
router.post('/track-view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.automobiles.update({
      where: { id },
      data: {
        views: {
          increment: 1
        }
      }
    });

    res.json({
      success: true,
      message: 'View tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ Track view error:', error);
    res.status(500).json({ 
      error: 'Failed to track view',
      details: error.message 
    });
  }
});

// Track automobile click
router.post('/track-click/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.automobiles.update({
      where: { id },
      data: {
        clicks: {
          increment: 1
        }
      }
    });

    res.json({
      success: true,
      message: 'Click tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ Track click error:', error);
    res.status(500).json({ 
      error: 'Failed to track click',
      details: error.message 
    });
  }
});

// Toggle featured status (admin only)
router.patch('/toggle-featured/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    
    const automobile = await prisma.automobiles.update({
      where: { id },
      data: { featured }
    });

    res.json({
      success: true,
      message: `Automobile ${featured ? 'featured' : 'unfeatured'} successfully`,
      automobile
    });

  } catch (error: any) {
    console.error('❌ Toggle featured error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle featured status',
      details: error.message 
    });
  }
});

// GET /api/automobiles-simple/:id - Get automobile details with owner info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const automobile = await prisma.automobiles.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!automobile) {
      return res.status(404).json({ 
        success: false,
        error: 'Automobile not found' 
      });
    }

    console.log('✅ Automobile details retrieved:', automobile.id);

    res.json({
      success: true,
      automobile
    });

  } catch (error: any) {
    console.error('❌ Get automobile details error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get automobile details',
      details: error.message 
    });
  }
});

// GET /api/automobiles-simple/vendor/:userId - Get vendor's automobiles
router.get('/vendor/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [vendor, automobiles] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true
        }
      }),
      prisma.automobiles.findMany({
        where: { 
          userId,
          status: 'available'
        },
        orderBy: [
          { featured: 'desc' },
          { views: 'desc' },
          { createdAt: 'desc' }
        ]
      })
    ]);

    if (!vendor) {
      return res.status(404).json({ 
        success: false,
        error: 'Vendor not found' 
      });
    }

    console.log('✅ Vendor automobiles retrieved:', vendor.id, automobiles.length);

    res.json({
      success: true,
      vendor,
      automobiles,
      total: automobiles.length
    });

  } catch (error: any) {
    console.error('❌ Get vendor automobiles error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get vendor automobiles',
      details: error.message 
    });
  }
});

export default router;
