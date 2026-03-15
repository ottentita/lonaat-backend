import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, adminOnlyMiddleware, authorityMiddleware } from '../middleware/auth';
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
import { generateLandHash, detectTampering } from '../services/landHash';

const router = Router();


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
          status: 'submitted',
          verification_status: 'submitted',
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
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius) || 5;
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
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

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

router.get('/stats/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalLands,
      submittedLands,
      verifiedLands,
      approvedLands,
      lockedLands,
      byRegion,
      recentRegistrations
    ] = await Promise.all([
      prisma.land.count(),
      prisma.land.count({ where: { verification_status: 'submitted' } }),
      prisma.land.count({ where: { verification_status: 'verified' } }),
      prisma.land.count({ where: { verification_status: 'approved' } }),
      prisma.land.count({ where: { is_locked: true } }),
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
          verification_status: true,
          is_locked: true,
          created_at: true
        }
      })
    ]);

    res.json({
      total: totalLands,
      pending: submittedLands,
      verified: verifiedLands,
      approved: approvedLands,
      locked: lockedLands,
      disputed: 0,
      by_region: byRegion.map(r => ({ region: r.region, count: r._count })),
      recent: recentRegistrations.map(r => ({
        ...r,
        status: r.is_locked ? 'locked' : r.verification_status
      }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get land statistics' });
  }
});

router.get('/map', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Try PostGIS-powered query first (if geom exists)
    try {
      const lands: any[] = await prisma.$queryRaw`
        SELECT
          id,
          title_number,
          land_name,
          current_owner AS owner_name,
          region,
          city,
          town,
          neighborhood,
          area_sqm,
          status,
          verification_status,
          is_locked,
          land_hash,
          ST_AsGeoJSON(geom) AS polygon_geojson,
          center_lat,
          center_lng
        FROM lands
        WHERE geom IS NOT NULL
          AND verification_status != 'rejected'
        ORDER BY created_at DESC
      `;

      const mapData = lands.map(land => ({
        id: land.id,
        title_number: land.title_number,
        land_name: land.land_name,
        owner_name: land.owner_name,
        region: land.region,
        city: land.city,
        town: land.town,
        neighborhood: land.neighborhood,
        area_sqm: land.area_sqm ? Number(land.area_sqm) : null,
        status: land.is_locked ? 'locked' : land.verification_status,
        verification_status: land.verification_status,
        is_locked: land.is_locked,
        land_hash: land.land_hash,
        polygon: land.polygon_geojson ? JSON.parse(land.polygon_geojson) : null,
        center: land.center_lat && land.center_lng 
          ? { lat: Number(land.center_lat), lng: Number(land.center_lng) }
          : null
      }));

      return res.json({ success: true, count: mapData.length, lands: mapData });
    } catch (pgErr) {
      // Fallback for SQLite/no PostGIS: select from fields we have (center_lat/center_lng)
      
      const lands = await prisma.land.findMany({
        where: { verification_status: { not: 'rejected' } },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title_number: true,
          land_name: true,
          current_owner: true,
          region: true,
          city: true,
          town: true,
          neighborhood: true,
          area_sqm: true,
          status: true,
          verification_status: true,
          is_locked: true,
          land_hash: true,
          polygon_wkt: true,
          center_lat: true,
          center_lng: true
        }
      });

      const mapData = lands.map(land => ({
        id: land.id,
        title_number: land.title_number,
        land_name: land.land_name,
        owner_name: land.current_owner,
        region: land.region,
        city: land.city,
        town: land.town,
        neighborhood: land.neighborhood,
        area_sqm: land.area_sqm ? Number(land.area_sqm) : null,
        status: land.is_locked ? 'locked' : land.verification_status,
        verification_status: land.verification_status,
        is_locked: land.is_locked,
        land_hash: land.land_hash,
        polygon: land.polygon_wkt ? null : null,
        center: land.center_lat && land.center_lng ? { lat: Number(land.center_lat), lng: Number(land.center_lng) } : null
      }));

      return res.json({ success: true, count: mapData.length, lands: mapData });
    }
  } catch (error) {
    console.error('Map data error:', error);
    res.status(500).json({ error: 'Failed to get map data' });
  }
});

router.get('/nearby', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius) || 5;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng required' });
    }

    const lands = await searchLandByLocation(lat, lng, radius);

    res.json({
      success: true,
      lands: lands.map(l => ({
        ...l,
        area_sqm: l.area_sqm ? Number(l.area_sqm) : null,
        center_lat: l.center_lat ? Number(l.center_lat) : null,
        center_lng: l.center_lng ? Number(l.center_lng) : null,
        distance: l.distance ? Number(l.distance) : null
      })),
      count: lands.length,
      search_point: { lat, lng },
      radius_km: radius
    });
  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({ error: 'Failed to search nearby lands' });
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

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be: verified or rejected. Use POST /:id/verify-authority for full workflow.' });
    }

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    const oldStatus = land.verification_status;

    const updated = await prisma.land.update({
      where: { id: landId },
      data: {
        status,
        verification_status: status,
        verification_date: status === 'verified' ? new Date() : null,
        verified_by: status === 'verified' ? req.user!.id : null,
        verified_by_name: status === 'verified' ? req.user!.name : null,
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
        old_data: { verification_status: oldStatus },
        new_data: { verification_status: status, notes },
        description: `Land verification_status changed from ${oldStatus} to ${status}`
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
        status: 'submitted',
        verification_status: 'submitted',
        land_hash: null
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

router.get('/:id/neighbors', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const radius = Number(req.query.radius) || 1;

    const neighbors = await getNeighboringLands(landId, radius);

    res.json({
      success: true,
      neighbors,
      count: neighbors.length,
      radius_km: radius
    });
  } catch (error) {
    console.error('Neighbors error:', error);
    res.status(500).json({ error: 'Failed to get neighboring lands' });
  }
});

router.post('/:id/verify-authority', authMiddleware, authorityMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const { action, notes } = req.body;

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    if (land.is_locked) {
      return res.status(400).json({ error: 'Land is locked and cannot be modified' });
    }

    const validActions = ['verify', 'approve', 'reject', 'lock'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use: verify, approve, reject, or lock' });
    }

    let newStatus = land.verification_status;
    let updateData: any = {};

    if (action === 'verify') {
      if (land.verification_status !== 'submitted' && land.verification_status !== 'under_review') {
        return res.status(400).json({ error: 'Can only verify lands with submitted or under_review status' });
      }
      newStatus = 'verified';
      updateData = {
        verification_status: 'verified',
        status: 'verified',
        verification_date: new Date(),
        verified_by: req.user!.id,
        verified_by_name: req.user!.name
      };
    } else if (action === 'approve') {
      if (land.verification_status !== 'verified') {
        return res.status(400).json({ error: 'Can only approve lands that are verified first' });
      }
      newStatus = 'approved';
      
      const landData = {
        title_number: land.title_number,
        current_owner: land.current_owner,
        area_sqm: land.area_sqm ? Number(land.area_sqm.toString()) : null,
        polygon_wkt: land.polygon_wkt,
        region: land.region,
        town: land.town
      };
      const landHash = generateLandHash(landData);

      updateData = {
        verification_status: 'approved',
        status: 'approved',
        approved_at: new Date(),
        approved_by: req.user!.id,
        approved_by_name: req.user!.name,
        land_hash: landHash
      };
    } else if (action === 'reject') {
      newStatus = 'rejected';
      updateData = {
        verification_status: 'rejected',
        status: 'rejected',
        notes: notes ? `${land.notes || ''}\nRejected: ${notes}` : land.notes
      };
    } else if (action === 'lock') {
      updateData = {
        is_locked: true,
        lock_reason: notes || 'Locked by authority'
      };
    }

    const updated = await prisma.land.update({
      where: { id: landId },
      data: updateData
    });

    await prisma.landAuditLog.create({
      data: {
        land_id: landId,
        action: `AUTHORITY_${action.toUpperCase()}`,
        actor_id: req.user!.id,
        actor_name: req.user!.name || 'Admin',
        actor_role: 'admin',
        old_data: { verification_status: land.verification_status },
        new_data: { verification_status: newStatus, action },
        description: `Authority ${action}: ${land.title_number}${notes ? ` - ${notes}` : ''}`
      }
    });

    res.json({
      success: true,
      message: `Land ${action}d successfully`,
      land: updated
    });
  } catch (error) {
    console.error('Authority verification error:', error);
    res.status(500).json({ error: 'Failed to process authority verification' });
  }
});

router.get('/:id/verify-integrity', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    const landData = {
      title_number: land.title_number,
      current_owner: land.current_owner,
      area_sqm: land.area_sqm ? Number(land.area_sqm.toString()) : null,
      polygon_wkt: land.polygon_wkt,
      region: land.region,
      town: land.town
    };

    const result = detectTampering(landData, land.land_hash);
    const currentHash = generateLandHash(landData);

    res.json({
      land_id: landId,
      title_number: land.title_number,
      integrity_check: result,
      stored_hash: land.land_hash,
      computed_hash: currentHash,
      hashes_match: land.land_hash === currentHash
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    res.status(500).json({ error: 'Failed to verify land integrity' });
  }
});

router.get('/pending-verification', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const status = req.query.status as string || 'submitted';
    
    const lands = await prisma.land.findMany({
      where: { verification_status: status },
      orderBy: { created_at: 'asc' },
      include: {
        ownership_history: { orderBy: { created_at: 'desc' }, take: 1 }
      }
    });

    res.json({
      success: true,
      lands,
      count: lands.length,
      status_filter: status
    });
  } catch (error) {
    console.error('Pending verification error:', error);
    res.status(500).json({ error: 'Failed to get pending verifications' });
  }
});

const SECTION_TYPES = ['sitting', 'building', 'agricultural', 'parking', 'garden', 'storage', 'recreational', 'commercial', 'residential', 'other'];

router.get('/:id/sections', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    
    const sections = await prisma.landSection.findMany({
      where: { land_id: landId },
      orderBy: { created_at: 'desc' }
    });

    res.json({ sections });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ error: 'Failed to get sections' });
  }
});

router.post('/:id/sections', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const { section_name, section_type, area_sqm, polygon_coords, description, capacity } = req.body;

    if (!section_name || !section_type) {
      return res.status(400).json({ error: 'Section name and type are required' });
    }

    if (!SECTION_TYPES.includes(section_type)) {
      return res.status(400).json({ error: `Invalid section type. Use: ${SECTION_TYPES.join(', ')}` });
    }

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land) {
      return res.status(404).json({ error: 'Land not found' });
    }

    let polygonWkt = null;
    let centerLat = null;
    let centerLng = null;

    if (polygon_coords && Array.isArray(polygon_coords) && polygon_coords.length >= 3) {
      polygonWkt = coordsToWKT(polygon_coords);
      const center = calculatePolygonCenter(polygon_coords);
      centerLat = center.lat;
      centerLng = center.lng;
    }

    const section = await prisma.landSection.create({
      data: {
        land_id: landId,
        section_name,
        section_type,
        area_sqm: area_sqm ? Number(area_sqm) : null,
        polygon_coords: polygon_coords || null,
        polygon_wkt: polygonWkt,
        center_lat: centerLat,
        center_lng: centerLng,
        description,
        capacity: capacity ? parseInt(capacity) : null
      }
    });

    await prisma.landAuditLog.create({
      data: {
        land_id: landId,
        action: 'SECTION_ADDED',
        actor_id: req.user!.id,
        actor_name: req.user!.name,
        actor_role: 'admin',
        new_data: { section_name, section_type, area_sqm },
        description: `Added ${section_type} section: ${section_name}`
      }
    });

    res.status(201).json({ message: 'Section added successfully', section });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({ error: 'Failed to add section' });
  }
});

router.put('/:id/sections/:sectionId', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const sectionId = parseInt(req.params.sectionId);
    const { section_name, section_type, area_sqm, polygon_coords, description, capacity, status } = req.body;

    const section = await prisma.landSection.findFirst({
      where: { id: sectionId, land_id: landId }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const updateData: any = {};
    if (section_name) updateData.section_name = section_name;
    if (section_type && SECTION_TYPES.includes(section_type)) updateData.section_type = section_type;
    if (area_sqm !== undefined) updateData.area_sqm = area_sqm ? Number(area_sqm) : null;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (status) updateData.status = status;

    if (polygon_coords && Array.isArray(polygon_coords) && polygon_coords.length >= 3) {
      updateData.polygon_coords = polygon_coords;
      updateData.polygon_wkt = coordsToWKT(polygon_coords);
      const center = calculatePolygonCenter(polygon_coords);
      updateData.center_lat = center.lat;
      updateData.center_lng = center.lng;
    }

    const updated = await prisma.landSection.update({
      where: { id: sectionId },
      data: updateData
    });

    res.json({ message: 'Section updated', section: updated });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

router.delete('/:id/sections/:sectionId', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const landId = parseInt(req.params.id);
    const sectionId = parseInt(req.params.sectionId);

    const section = await prisma.landSection.findFirst({
      where: { id: sectionId, land_id: landId }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    await prisma.landSection.delete({ where: { id: sectionId } });

    await prisma.landAuditLog.create({
      data: {
        land_id: landId,
        action: 'SECTION_REMOVED',
        actor_id: req.user!.id,
        actor_name: req.user!.name,
        actor_role: 'admin',
        old_data: { section_name: section.section_name, section_type: section.section_type },
        description: `Removed section: ${section.section_name}`
      }
    });

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

export default router;
