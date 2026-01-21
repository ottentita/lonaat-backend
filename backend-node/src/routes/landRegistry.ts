import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';
import { 
  verifyLandRegistration, 
  searchLandByLocation, 
  getLandAtPoint,
  getNeighboringLands,
  calculatePolygonCenter,
  calculatePolygonArea,
  coordsToWKT,
  saveGeometry,
  initPostGIS
} from '../services/gpsVerification';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const region = req.query.region as string;
    const city = req.query.city as string;
    const status = req.query.status as string;

    const where: any = {};
    if (region) where.region = region;
    if (city) where.city = city;
    if (status) where.status = status;

    const [lands, total] = await Promise.all([
      prisma.land.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          ownership_history: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        }
      }),
      prisma.land.count({ where })
    ]);

    res.json({
      lands,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get lands error:', error);
    res.status(500).json({ error: 'Failed to get land records' });
  }
});

router.post('/verify', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { polygon_coords, exclude_land_id } = req.body;

    if (!polygon_coords || !Array.isArray(polygon_coords) || polygon_coords.length < 3) {
      return res.status(400).json({ error: 'Valid polygon coordinates required (minimum 3 points)' });
    }

    const result = await verifyLandRegistration(polygon_coords, exclude_land_id);
    res.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify land boundaries' });
  }
});

router.post('/register', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title_number,
      current_owner,
      owner_id_type,
      owner_id_number,
      region,
      city,
      town,
      neighborhood,
      polygon_coords,
      land_use,
      purchase_date,
      purchase_price,
      currency,
      seller_name,
      seller_id_number,
      documents,
      notes
    } = req.body;

    if (!title_number || !current_owner || !region || !polygon_coords) {
      return res.status(400).json({ 
        error: 'Required: title_number, current_owner, region, polygon_coords' 
      });
    }

    const existingTitle = await prisma.land.findUnique({
      where: { title_number }
    });
    if (existingTitle) {
      return res.status(400).json({ 
        error: 'Land title number already registered',
        existing: {
          id: existingTitle.id,
          current_owner: existingTitle.current_owner,
          region: existingTitle.region
        }
      });
    }

    const verification = await verifyLandRegistration(polygon_coords);
    if (!verification.valid) {
      return res.status(400).json({
        error: 'Land registration blocked due to boundary conflicts',
        conflicts: verification.conflicts,
        message: verification.message
      });
    }

    const center = calculatePolygonCenter(polygon_coords);
    const area = calculatePolygonArea(polygon_coords);
    const wkt = coordsToWKT(polygon_coords);

    const land = await prisma.$transaction(async (tx) => {
      const newLand = await tx.land.create({
        data: {
          title_number,
          owner_id: req.user!.id,
          current_owner,
          owner_id_type,
          owner_id_number,
          region,
          city,
          town,
          neighborhood,
          area_sqm: area,
          polygon_coords,
          polygon_wkt: wkt,
          center_lat: center.lat,
          center_lng: center.lng,
          land_use,
          status: 'pending',
          purchase_date: purchase_date ? new Date(purchase_date) : null,
          purchase_price,
          currency: currency || 'XAF',
          seller_name,
          seller_id_number,
          documents,
          notes
        }
      });

      await tx.landOwnership.create({
        data: {
          land_id: newLand.id,
          owner_name: current_owner,
          owner_id_type,
          owner_id_number,
          user_id: req.user!.id,
          ownership_type: 'full',
          status: 'active',
          acquired_date: purchase_date ? new Date(purchase_date) : new Date(),
          acquired_price: purchase_price,
          currency: currency || 'XAF',
          seller_name,
          seller_id: seller_id_number,
          documents,
          verification: 'pending'
        }
      });

      await tx.landAuditLog.create({
        data: {
          land_id: newLand.id,
          action: 'LAND_REGISTERED',
          actor_id: req.user!.id,
          actor_name: req.user!.name,
          actor_role: req.user!.isAdmin ? 'admin' : 'user',
          new_data: newLand as any,
          description: `Land registered with title ${title_number} by ${current_owner}`
        }
      });

      await saveGeometry(newLand.id, polygon_coords, tx);

      return newLand;
    });

    res.status(201).json({
      message: 'Land registered successfully. Pending verification.',
      land
    });
  } catch (error) {
    console.error('Land registration error:', error);
    res.status(500).json({ error: 'Failed to register land' });
  }
});

router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 5;
    const title = req.query.title as string;
    const owner = req.query.owner as string;

    if (title) {
      const land = await prisma.land.findUnique({
        where: { title_number: title },
        include: {
          ownership_history: { orderBy: { created_at: 'desc' } },
          audit_logs: { orderBy: { created_at: 'desc' }, take: 10 }
        }
      });
      return res.json({ lands: land ? [land] : [], search_type: 'title' });
    }

    if (owner) {
      const lands = await prisma.land.findMany({
        where: {
          OR: [
            { current_owner: { contains: owner, mode: 'insensitive' } },
            { owner_id_number: owner }
          ]
        },
        include: {
          ownership_history: { orderBy: { created_at: 'desc' }, take: 1 }
        }
      });
      return res.json({ lands, search_type: 'owner' });
    }

    if (!isNaN(lat) && !isNaN(lng)) {
      const lands = await searchLandByLocation(lat, lng, radius);
      return res.json({ lands, search_type: 'location', center: { lat, lng }, radius });
    }

    res.status(400).json({ error: 'Provide lat/lng, title, or owner for search' });
  } catch (error) {
    console.error('Land search error:', error);
    res.status(500).json({ error: 'Failed to search lands' });
  }
});

router.get('/point', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng required' });
    }

    const land = await getLandAtPoint(lat, lng);
    
    if (land) {
      const neighbors = await getNeighboringLands(land.id);
      res.json({ found: true, land, neighbors });
    } else {
      res.json({ found: false, message: 'No registered land at this location' });
    }
  } catch (error) {
    console.error('Point lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup land at point' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const land = await prisma.land.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        ownership_history: { orderBy: { created_at: 'desc' } },
        audit_logs: { orderBy: { created_at: 'desc' }, take: 20 }
      }
    });

    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    const neighbors = await getNeighboringLands(land.id);

    res.json({ land, neighbors });
  } catch (error) {
    console.error('Get land error:', error);
    res.status(500).json({ error: 'Failed to get land details' });
  }
});

router.put('/:id/verify', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const { status, notes } = req.body;

    if (!['verified', 'disputed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be: verified, disputed, or rejected' });
    }

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    const oldStatus = land.status;

    const updated = await prisma.land.update({
      where: { id: landId },
      data: {
        status,
        verification_date: status === 'verified' ? new Date() : null,
        verified_by: status === 'verified' ? req.user!.id : null,
        is_locked: status === 'verified',
        notes: notes || land.notes
      }
    });

    if (status === 'verified') {
      await prisma.landOwnership.updateMany({
        where: { land_id: landId, status: 'active' },
        data: { verification: 'verified', verified_by: req.user!.id, verified_at: new Date() }
      });
    }

    await prisma.landAuditLog.create({
      data: {
        land_id: landId,
        action: `LAND_${status.toUpperCase()}`,
        actor_id: req.user!.id,
        actor_name: req.user!.name,
        actor_role: 'admin',
        old_data: { status: oldStatus },
        new_data: { status, notes },
        description: `Land status changed from ${oldStatus} to ${status}`
      }
    });

    res.json({ message: `Land ${status}`, land: updated });
  } catch (error) {
    console.error('Verify land error:', error);
    res.status(500).json({ error: 'Failed to update land status' });
  }
});

router.post('/:id/transfer', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const {
      new_owner_name,
      new_owner_id_type,
      new_owner_id_number,
      new_owner_user_id,
      transfer_price,
      currency,
      documents,
      notes
    } = req.body;

    if (!new_owner_name) {
      return res.status(400).json({ error: 'New owner name required' });
    }

    const land = await prisma.land.findUnique({
      where: { id: landId },
      include: { ownership_history: { where: { status: 'active' } } }
    });

    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    if (land.status !== 'verified') {
      return res.status(400).json({ error: 'Only verified lands can be transferred' });
    }

    const previousOwner = land.current_owner;

    await prisma.landOwnership.updateMany({
      where: { land_id: landId, status: 'active' },
      data: { 
        status: 'transferred', 
        transfer_date: new Date(),
        transferred_to: new_owner_user_id
      }
    });

    await prisma.landOwnership.create({
      data: {
        land_id: landId,
        owner_name: new_owner_name,
        owner_id_type: new_owner_id_type,
        owner_id_number: new_owner_id_number,
        user_id: new_owner_user_id,
        ownership_type: 'full',
        status: 'active',
        acquired_date: new Date(),
        acquired_price: transfer_price,
        currency: currency || 'XAF',
        seller_name: previousOwner,
        documents,
        verification: 'pending'
      }
    });

    const updated = await prisma.land.update({
      where: { id: landId },
      data: {
        current_owner: new_owner_name,
        owner_id: new_owner_user_id,
        owner_id_type: new_owner_id_type,
        owner_id_number: new_owner_id_number,
        purchase_date: new Date(),
        purchase_price: transfer_price,
        seller_name: previousOwner,
        status: 'pending'
      }
    });

    await prisma.landAuditLog.create({
      data: {
        land_id: landId,
        action: 'OWNERSHIP_TRANSFERRED',
        actor_id: req.user!.id,
        actor_name: req.user!.name,
        actor_role: 'admin',
        old_data: { owner: previousOwner },
        new_data: { owner: new_owner_name, price: transfer_price },
        description: `Ownership transferred from ${previousOwner} to ${new_owner_name}`
      }
    });

    res.json({ message: 'Ownership transferred successfully', land: updated });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

router.get('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);

    const [ownership, audit] = await Promise.all([
      prisma.landOwnership.findMany({
        where: { land_id: landId },
        orderBy: { created_at: 'desc' }
      }),
      prisma.landAuditLog.findMany({
        where: { land_id: landId },
        orderBy: { created_at: 'desc' }
      })
    ]);

    res.json({ ownership_history: ownership, audit_logs: audit });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get land history' });
  }
});

router.get('/stats/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalLands,
      verifiedLands,
      pendingLands,
      disputedLands,
      byRegion,
      recentRegistrations
    ] = await Promise.all([
      prisma.land.count(),
      prisma.land.count({ where: { status: 'verified' } }),
      prisma.land.count({ where: { status: 'pending' } }),
      prisma.land.count({ where: { status: 'disputed' } }),
      prisma.land.groupBy({
        by: ['region'],
        _count: true,
        orderBy: { _count: { region: 'desc' } },
        take: 10
      }),
      prisma.land.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          title_number: true,
          current_owner: true,
          region: true,
          status: true,
          created_at: true
        }
      })
    ]);

    res.json({
      total: totalLands,
      verified: verifiedLands,
      pending: pendingLands,
      disputed: disputedLands,
      by_region: byRegion.map(r => ({ region: r.region, count: r._count })),
      recent: recentRegistrations
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get land statistics' });
  }
});

router.get('/map', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lands: any[] = await prisma.$queryRaw`
      SELECT
        id,
        title_number,
        current_owner AS owner_name,
        region,
        city,
        town,
        neighborhood,
        area_sqm,
        status,
        ST_AsGeoJSON(geom) AS polygon_geojson,
        center_lat,
        center_lng
      FROM lands
      WHERE geom IS NOT NULL
        AND status != 'rejected'
      ORDER BY created_at DESC
    `;

    const mapData = lands.map(land => ({
      id: land.id,
      title_number: land.title_number,
      owner_name: land.owner_name,
      region: land.region,
      city: land.city,
      town: land.town,
      neighborhood: land.neighborhood,
      area_sqm: land.area_sqm ? Number(land.area_sqm) : null,
      status: land.status,
      polygon: land.polygon_geojson ? JSON.parse(land.polygon_geojson) : null,
      center: land.center_lat && land.center_lng 
        ? { lat: Number(land.center_lat), lng: Number(land.center_lng) }
        : null
    }));

    res.json({
      success: true,
      count: mapData.length,
      lands: mapData
    });
  } catch (error) {
    console.error('Map data error:', error);
    res.status(500).json({ error: 'Failed to get map data' });
  }
});

export default router;
