import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface PolygonCoord {
  lat: number;
  lng: number;
}

interface LandConflict {
  id: number;
  title_number: string;
  current_owner: string;
  region: string;
  city: string | null;
  area_sqm: number | null;
  status: string;
  overlap_percentage?: number;
}

interface VerificationResult {
  valid: boolean;
  conflicts: LandConflict[];
  message: string;
}

function coordsToWKT(coords: PolygonCoord[]): string {
  if (coords.length < 3) {
    throw new Error('Polygon must have at least 3 coordinates');
  }
  
  const closedCoords = [...coords];
  if (coords[0].lat !== coords[coords.length - 1].lat || 
      coords[0].lng !== coords[coords.length - 1].lng) {
    closedCoords.push(coords[0]);
  }
  
  const coordStr = closedCoords.map(c => `${c.lng} ${c.lat}`).join(', ');
  return `POLYGON((${coordStr}))`;
}

function calculatePolygonCenter(coords: PolygonCoord[]): { lat: number; lng: number } {
  const sum = coords.reduce(
    (acc, coord) => ({ lat: acc.lat + coord.lat, lng: acc.lng + coord.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / coords.length,
    lng: sum.lng / coords.length
  };
}

function calculatePolygonArea(coords: PolygonCoord[]): number {
  let area = 0;
  const n = coords.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const latRad = (coords[i].lat * Math.PI) / 180;
    area += (coords[j].lng - coords[i].lng) * Math.cos(latRad);
  }
  
  const R = 6371000;
  area = Math.abs(area) * (R * R * Math.PI / 180) / 2;
  
  return Math.round(area * 100) / 100;
}

export async function verifyLandRegistration(
  coords: PolygonCoord[],
  excludeLandId?: number
): Promise<VerificationResult> {
  try {
    const wkt = coordsToWKT(coords);
    
    const excludeClause = excludeLandId ? Prisma.sql`AND id != ${excludeLandId}` : Prisma.sql``;
    
    const conflicts: any[] = await prisma.$queryRaw`
      SELECT id, title_number, current_owner, region, city, area_sqm, status
      FROM lands
      WHERE geom IS NOT NULL
        AND status != 'rejected'
        AND ST_Intersects(geom, ST_GeomFromText(${wkt}, 4326))
        ${excludeClause}
    `;
    
    if (conflicts.length > 0) {
      return {
        valid: false,
        conflicts: conflicts.map(c => ({
          id: c.id,
          title_number: c.title_number,
          current_owner: c.current_owner,
          region: c.region,
          city: c.city,
          area_sqm: c.area_sqm ? Number(c.area_sqm) : null,
          status: c.status
        })),
        message: `Land registration blocked: ${conflicts.length} overlapping parcel(s) found. This land may already be registered.`
      };
    }
    
    return {
      valid: true,
      conflicts: [],
      message: 'Land boundaries verified. No conflicts detected.'
    };
  } catch (error) {
    console.error('GPS verification error:', error);
    throw new Error('Failed to verify land boundaries');
  }
}

export async function saveGeometry(landId: number, coords: PolygonCoord[], tx?: any): Promise<void> {
  const wkt = coordsToWKT(coords);
  const client = tx || prisma;
  const result = await client.$executeRaw`
    UPDATE lands 
    SET geom = ST_GeomFromText(${wkt}, 4326)
    WHERE id = ${landId}
  `;
  if (result === 0) {
    throw new Error('Failed to save land geometry - land not found');
  }
}

export async function initPostGIS(): Promise<void> {
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis`;
    
    const hasGeom: any[] = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'lands' AND column_name = 'geom'
    `;
    
    if (hasGeom.length === 0) {
      await prisma.$executeRaw`ALTER TABLE lands ADD COLUMN IF NOT EXISTS geom geometry(Polygon, 4326)`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS lands_geom_idx ON lands USING GIST (geom)`;
    }
    
    console.log('PostGIS initialized successfully');
  } catch (error) {
    console.error('PostGIS initialization failed:', error);
    throw new Error('Failed to initialize PostGIS - database may not support spatial operations');
  }
}

export async function searchLandByLocation(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<any[]> {
  const radiusMeters = radiusKm * 1000;
  
  const lands: any[] = await prisma.$queryRaw`
    SELECT l.*, 
           ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as distance
    FROM lands l
    WHERE geom IS NOT NULL
      AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    ORDER BY distance
  `;
  
  return lands;
}

export async function getLandAtPoint(lat: number, lng: number): Promise<any | null> {
  const lands: any[] = await prisma.$queryRaw`
    SELECT l.*
    FROM lands l
    WHERE geom IS NOT NULL
      AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
    LIMIT 1
  `;
  
  return lands.length > 0 ? lands[0] : null;
}

export async function getNeighboringLands(landId: number, radiusKm: number = 1): Promise<any[]> {
  const land = await prisma.land.findUnique({
    where: { id: landId }
  });
  
  if (!land || !land.center_lat || !land.center_lng) {
    return [];
  }
  
  const radiusDegrees = radiusKm / 111;
  
  const neighbors = await prisma.land.findMany({
    where: {
      id: { not: landId },
      center_lat: {
        gte: Number(land.center_lat) - radiusDegrees,
        lte: Number(land.center_lat) + radiusDegrees
      },
      center_lng: {
        gte: Number(land.center_lng) - radiusDegrees,
        lte: Number(land.center_lng) + radiusDegrees
      }
    },
    select: {
      id: true,
      title_number: true,
      current_owner: true,
      region: true,
      city: true,
      area_sqm: true,
      status: true,
      center_lat: true,
      center_lng: true
    }
  });
  
  return neighbors;
}

export { coordsToWKT, calculatePolygonCenter, calculatePolygonArea };
