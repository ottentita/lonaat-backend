-- PostGIS Extension and Land Registry Geometry Support
-- This migration adds spatial database capabilities for the GPS Land Registry system

-- Enable PostGIS extension (required for spatial queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column to lands table for accurate polygon storage
-- Using geometry(Polygon, 4326) where 4326 is the WGS84 coordinate system (GPS standard)
ALTER TABLE lands ADD COLUMN IF NOT EXISTS geom geometry(Polygon, 4326);

-- Create spatial index on the geometry column for efficient spatial queries
-- GIST (Generalized Search Tree) index is optimal for PostGIS geometry columns
CREATE INDEX IF NOT EXISTS lands_geom_idx ON lands USING GIST (geom);

-- Note: The geom column is populated via raw SQL in the application code
-- because Prisma does not natively support PostGIS geometry types.
-- See backend-node/src/services/gpsVerification.ts for implementation details.

-- Key spatial functions used in the application:
-- ST_GeomFromText: Converts WKT (Well-Known Text) polygon strings to geometry
-- ST_Intersects: Checks if two geometries share any spatial area (anti-double-sale)
-- ST_Contains: Checks if a point is inside a polygon (land lookup)
-- ST_DWithin: Finds lands within a specified distance (radius search)
