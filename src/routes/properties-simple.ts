import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// GET /api/properties-simple/list - Get all properties
router.get('/list', async (req, res) => {
  console.log('📋 GET PROPERTIES LIST');
  
  try {
    const { status, property_type, location } = req.query;

    // Build filter conditions
    const where: any = {};
    if (status) where.status = status as string;
    if (property_type) where.propertyType = property_type as string;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };

    const properties = await prisma.property.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    console.log('✅ Properties retrieved:', properties.length);

    res.json({
      success: true,
      properties: properties,
      total: properties.length
    });

  } catch (error: any) {
    console.error('❌ Get properties error:', error);
    res.status(500).json({ 
      error: 'Failed to get properties',
      details: error.message 
    });
  }
});

// POST /api/properties-simple/create - Create property
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  console.log('➕ CREATE PROPERTY');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      description,
      property_type,
      price,
      type,
      rentPrice,
      location,
      bedrooms,
      bathrooms,
      area,
      images
    } = req.body;

    if (!title || !property_type || !price || !location) {
      return res.status(400).json({ 
        error: 'Title, property type, price, and location are required' 
      });
    }

    const property = await prisma.property.create({
      data: {
        userId,
        title,
        description: description || '',
        propertyType: property_type,
        price: parseFloat(price),
        type: type || 'sale',
        rentPrice: rentPrice ? parseFloat(rentPrice) : null,
        location,
        bedrooms: bedrooms ? Number(bedrooms) : 0,
        bathrooms: bathrooms ? Number(bathrooms) : 0,
        area: area ? parseFloat(area) : 0,
        images: images || [],
        status: 'available'
      }
    });

    console.log('✅ Property created:', property.id);

    res.json({
      success: true,
      message: 'Property created successfully',
      property
    });

  } catch (error: any) {
    console.error('❌ Create property error:', error);
    res.status(500).json({ 
      error: 'Failed to create property',
      details: error.message 
    });
  }
});

// Track property view
router.post('/track-view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.property.update({
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

// Track property click
router.post('/track-click/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.property.update({
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
    
    const property = await prisma.property.update({
      where: { id },
      data: { featured }
    });

    res.json({
      success: true,
      message: `Property ${featured ? 'featured' : 'unfeatured'} successfully`,
      property
    });

  } catch (error: any) {
    console.error('❌ Toggle featured error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle featured status',
      details: error.message 
    });
  }
});

// GET /api/properties-simple/:id - Get property details with owner info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const property = await prisma.property.findUnique({
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

    if (!property) {
      return res.status(404).json({ 
        success: false,
        error: 'Property not found' 
      });
    }

    console.log('✅ Property details retrieved:', property.id);

    res.json({
      success: true,
      property
    });

  } catch (error: any) {
    console.error('❌ Get property details error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get property details',
      details: error.message 
    });
  }
});

// GET /api/properties-simple/vendor/:userId - Get vendor's properties
router.get('/vendor/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [vendor, properties] = await Promise.all([
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
      prisma.property.findMany({
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

    console.log('✅ Vendor properties retrieved:', vendor.id, properties.length);

    res.json({
      success: true,
      vendor,
      properties,
      total: properties.length
    });

  } catch (error: any) {
    console.error('❌ Get vendor properties error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get vendor properties',
      details: error.message 
    });
  }
});

export default router;
