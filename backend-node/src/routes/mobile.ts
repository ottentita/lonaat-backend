import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { verifyLandRegistration, calculatePolygonCenter, calculatePolygonArea, saveGeometry } from '../services/gpsVerification';

const router = Router();


interface GPSPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

router.post('/gps-capture', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { points } = req.body;

    if (!points || !Array.isArray(points) || points.length < 3) {
      return res.status(400).json({ error: 'At least 3 GPS points required to form a polygon' });
    }

    const closedPoints = [...points];
    if (points[0].lat !== points[points.length - 1].lat || 
        points[0].lng !== points[points.length - 1].lng) {
      closedPoints.push(points[0]);
    }

    const polygonWKT = `POLYGON((${closedPoints.map((p: GPSPoint) => `${p.lng} ${p.lat}`).join(', ')}))`;

    const center = calculatePolygonCenter(points);
    const area = calculatePolygonArea(points);

    res.json({
      success: true,
      polygonWKT,
      center,
      area_sqm: area,
      points_count: points.length,
      message: 'GPS polygon captured successfully'
    });
  } catch (error) {
    console.error('GPS capture error:', error);
    res.status(500).json({ error: 'Failed to process GPS capture' });
  }
});

router.post('/submit-land', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      title_number,
      land_name,
      points,
      region,
      town,
      neighborhood,
      land_use,
      notes
    } = req.body;

    if (!title_number || !points || !region) {
      return res.status(400).json({ error: 'title_number, points, and region are required' });
    }

    if (!Array.isArray(points) || points.length < 3) {
      return res.status(400).json({ error: 'At least 3 GPS points required' });
    }

    const closedPoints = [...points];
    if (points[0].lat !== points[points.length - 1].lat || 
        points[0].lng !== points[points.length - 1].lng) {
      closedPoints.push(points[0]);
    }

    const polygonWKT = `POLYGON((${closedPoints.map((p: GPSPoint) => `${p.lng} ${p.lat}`).join(', ')}))`;

    const verification = await verifyLandRegistration(points);
    if (!verification.valid) {
      return res.status(409).json({
        error: 'Duplicate land detected',
        conflicts: verification.conflicts,
        message: verification.message
      });
    }

    const center = calculatePolygonCenter(points);
    const area = calculatePolygonArea(points);

    const land = await prisma.land.create({
      data: {
        title_number,
        land_name: land_name || null,
        owner_id: req.user!.id,
        current_owner: req.user!.name || 'Unknown',
        region,
        city: town,
        town,
        neighborhood,
        area_sqm: area,
        polygon_coords: points,
        polygon_wkt: polygonWKT,
        center_lat: center.lat,
        center_lng: center.lng,
        land_use,
        status: 'submitted',
        verification_status: 'submitted',
        notes
      }
    });

    await saveGeometry(land.id, points);

    await prisma.landAuditLog.create({
      data: {
        land_id: land.id,
        action: 'MOBILE_REGISTRATION',
        actor_id: req.user!.id,
        actor_name: req.user!.name || 'Unknown',
        actor_role: 'user',
        new_data: { title_number, region, town, area_sqm: area },
        description: `Land submitted via mobile GPS capture: ${title_number}`
      }
    });

    res.json({
      success: true,
      land_id: land.id,
      title_number: land.title_number,
      status: 'submitted',
      message: 'Land submitted for verification. Hash will be generated upon approval.'
    });
  } catch (error: any) {
    console.error('Mobile land submission error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Title number already exists' });
    }
    res.status(500).json({ error: 'Failed to submit land registration' });
  }
});

router.get('/my-lands', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lands = await prisma.land.findMany({
      where: { owner_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title_number: true,
        land_name: true,
        region: true,
        town: true,
        area_sqm: true,
        status: true,
        verification_status: true,
        is_locked: true,
        center_lat: true,
        center_lng: true,
        created_at: true
      }
    });

    res.json({
      success: true,
      lands,
      count: lands.length
    });
  } catch (error) {
    console.error('Get my lands error:', error);
    res.status(500).json({ error: 'Failed to get lands' });
  }
});

export default router;
