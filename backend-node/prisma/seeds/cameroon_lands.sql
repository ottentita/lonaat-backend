-- Cameroon Land Registry Seed Data
-- Covers all 10 regions with sample parcels for testing

-- Centre Region (Yaounde area)
INSERT INTO lands (
  title_number, land_name, current_owner, region, city, town, neighborhood,
  area_sqm, polygon_coords, polygon_wkt, center_lat, center_lng,
  land_use, status, verification_status, currency, created_at, updated_at
) VALUES 
(
  'CM-CE-2026-00001', 'Bastos Family Estate', 'Jean-Pierre Mbarga', 'Centre', 'Yaounde', 'Bastos', 'Bastos I',
  5000, '[{"lat":3.8930,"lng":11.5050},{"lat":3.8935,"lng":11.5050},{"lat":3.8935,"lng":11.5055},{"lat":3.8930,"lng":11.5055}]'::jsonb,
  'POLYGON((11.5050 3.8930, 11.5050 3.8935, 11.5055 3.8935, 11.5055 3.8930, 11.5050 3.8930))',
  3.8932, 11.5052, 'residential', 'approved', 'approved', 'XAF', NOW(), NOW()
),
(
  'CM-CE-2026-00002', 'Mvan Commercial Plot', 'Entreprise Camerounaise SA', 'Centre', 'Yaounde', 'Mvan', 'Mvan Centre',
  2500, '[{"lat":3.8500,"lng":11.5200},{"lat":3.8505,"lng":11.5200},{"lat":3.8505,"lng":11.5205},{"lat":3.8500,"lng":11.5205}]'::jsonb,
  'POLYGON((11.5200 3.8500, 11.5200 3.8505, 11.5205 3.8505, 11.5205 3.8500, 11.5200 3.8500))',
  3.8502, 11.5202, 'commercial', 'verified', 'verified', 'XAF', NOW(), NOW()
),
(
  'CM-CE-2026-00003', 'Nkolbisson Agricultural Land', 'Cooperative Agricole du Centre', 'Centre', 'Yaounde', 'Nkolbisson', 'Zone Agricole',
  15000, '[{"lat":3.8700,"lng":11.4600},{"lat":3.8720,"lng":11.4600},{"lat":3.8720,"lng":11.4620},{"lat":3.8700,"lng":11.4620}]'::jsonb,
  'POLYGON((11.4600 3.8700, 11.4600 3.8720, 11.4620 3.8720, 11.4620 3.8700, 11.4600 3.8700))',
  3.8710, 11.4610, 'agricultural', 'approved', 'approved', 'XAF', NOW(), NOW()
),

-- Littoral Region (Douala area)
(
  'CM-LT-2026-00001', 'Bonanjo Business Center', 'Groupe Bolore Cameroun', 'Littoral', 'Douala', 'Bonanjo', 'Quartier Administratif',
  8000, '[{"lat":4.0550,"lng":9.7050},{"lat":4.0560,"lng":9.7050},{"lat":4.0560,"lng":9.7060},{"lat":4.0550,"lng":9.7060}]'::jsonb,
  'POLYGON((9.7050 4.0550, 9.7050 4.0560, 9.7060 4.0560, 9.7060 4.0550, 9.7050 4.0550))',
  4.0555, 9.7055, 'commercial', 'approved', 'approved', 'XAF', NOW(), NOW()
),
(
  'CM-LT-2026-00002', 'Akwa Residential Complex', 'Famille Ekambi', 'Littoral', 'Douala', 'Akwa', 'Akwa Nord',
  3500, '[{"lat":4.0480,"lng":9.7080},{"lat":4.0485,"lng":9.7080},{"lat":4.0485,"lng":9.7085},{"lat":4.0480,"lng":9.7085}]'::jsonb,
  'POLYGON((9.7080 4.0480, 9.7080 4.0485, 9.7085 4.0485, 9.7085 4.0480, 9.7080 4.0480))',
  4.0482, 9.7082, 'residential', 'verified', 'verified', 'XAF', NOW(), NOW()
),

-- West Region (Bafoussam area)
(
  'CM-OU-2026-00001', 'Bafoussam Market Land', 'Commune de Bafoussam', 'West', 'Bafoussam', 'Bafoussam I', 'Marche A',
  4500, '[{"lat":5.4770,"lng":10.4170},{"lat":5.4775,"lng":10.4170},{"lat":5.4775,"lng":10.4175},{"lat":5.4770,"lng":10.4175}]'::jsonb,
  'POLYGON((10.4170 5.4770, 10.4170 5.4775, 10.4175 5.4775, 10.4175 5.4770, 10.4170 5.4770))',
  5.4772, 10.4172, 'commercial', 'approved', 'approved', 'XAF', NOW(), NOW()
),
(
  'CM-OU-2026-00002', 'Dschang University Extension', 'Universite de Dschang', 'West', 'Dschang', 'Foto', 'Campus Extension',
  25000, '[{"lat":5.4400,"lng":10.0500},{"lat":5.4430,"lng":10.0500},{"lat":5.4430,"lng":10.0530},{"lat":5.4400,"lng":10.0530}]'::jsonb,
  'POLYGON((10.0500 5.4400, 10.0500 5.4430, 10.0530 5.4430, 10.0530 5.4400, 10.0500 5.4400))',
  5.4415, 10.0515, 'institutional', 'approved', 'approved', 'XAF', NOW(), NOW()
),

-- North West Region (Bamenda area)
(
  'CM-NO-2026-00001', 'Bamenda Hilltop Residence', 'Dr. Chia Fon', 'North-West', 'Bamenda', 'Up Station', 'Mile 3',
  1800, '[{"lat":5.9550,"lng":10.1550},{"lat":5.9555,"lng":10.1550},{"lat":5.9555,"lng":10.1555},{"lat":5.9550,"lng":10.1555}]'::jsonb,
  'POLYGON((10.1550 5.9550, 10.1550 5.9555, 10.1555 5.9555, 10.1555 5.9550, 10.1550 5.9550))',
  5.9552, 10.1552, 'residential', 'verified', 'verified', 'XAF', NOW(), NOW()
),

-- South West Region (Buea/Limbe area)
(
  'CM-SW-2026-00001', 'Buea Mountain View Estate', 'Mount Cameroon Development Corp', 'South-West', 'Buea', 'Molyko', 'University Area',
  6000, '[{"lat":4.1550,"lng":9.2950},{"lat":4.1560,"lng":9.2950},{"lat":4.1560,"lng":9.2960},{"lat":4.1550,"lng":9.2960}]'::jsonb,
  'POLYGON((9.2950 4.1550, 9.2950 4.1560, 9.2960 4.1560, 9.2960 4.1550, 9.2950 4.1550))',
  4.1555, 9.2955, 'residential', 'approved', 'approved', 'XAF', NOW(), NOW()
),
(
  'CM-SW-2026-00002', 'Limbe Beach Resort', 'Limbe Tourism Board', 'South-West', 'Limbe', 'Down Beach', 'Atlantic Coast',
  12000, '[{"lat":4.0150,"lng":9.2050},{"lat":4.0170,"lng":9.2050},{"lat":4.0170,"lng":9.2070},{"lat":4.0150,"lng":9.2070}]'::jsonb,
  'POLYGON((9.2050 4.0150, 9.2050 4.0170, 9.2070 4.0170, 9.2070 4.0150, 9.2050 4.0150))',
  4.0160, 9.2060, 'tourism', 'approved', 'approved', 'XAF', NOW(), NOW()
),

-- North Region (Garoua area)
(
  'CM-NO-2026-00002', 'Garoua Industrial Zone', 'SODECOTON', 'North', 'Garoua', 'Garoua II', 'Zone Industrielle',
  50000, '[{"lat":9.2900,"lng":13.3900},{"lat":9.2950,"lng":13.3900},{"lat":9.2950,"lng":13.3950},{"lat":9.2900,"lng":13.3950}]'::jsonb,
  'POLYGON((13.3900 9.2900, 13.3900 9.2950, 13.3950 9.2950, 13.3950 9.2900, 13.3900 9.2900))',
  9.2925, 13.3925, 'industrial', 'approved', 'approved', 'XAF', NOW(), NOW()
),

-- Far North Region (Maroua area)
(
  'CM-EN-2026-00001', 'Maroua Central Market', 'Commune de Maroua', 'Far-North', 'Maroua', 'Maroua I', 'Centre Ville',
  7500, '[{"lat":10.5900,"lng":14.3200},{"lat":10.5910,"lng":14.3200},{"lat":10.5910,"lng":14.3210},{"lat":10.5900,"lng":14.3210}]'::jsonb,
  'POLYGON((14.3200 10.5900, 14.3200 10.5910, 14.3210 10.5910, 14.3210 10.5900, 14.3200 10.5900))',
  10.5905, 14.3205, 'commercial', 'verified', 'verified', 'XAF', NOW(), NOW()
),

-- Adamawa Region (Ngaoundere area)
(
  'CM-AD-2026-00001', 'Ngaoundere Ranch', 'Cooperative Eleveurs Adamaoua', 'Adamawa', 'Ngaoundere', 'Ngaoundere I', 'Plateau',
  100000, '[{"lat":7.3200,"lng":13.5800},{"lat":7.3300,"lng":13.5800},{"lat":7.3300,"lng":13.5900},{"lat":7.3200,"lng":13.5900}]'::jsonb,
  'POLYGON((13.5800 7.3200, 13.5800 7.3300, 13.5900 7.3300, 13.5900 7.3200, 13.5800 7.3200))',
  7.3250, 13.5850, 'agricultural', 'approved', 'approved', 'XAF', NOW(), NOW()
),

-- East Region (Bertoua area)
(
  'CM-ES-2026-00001', 'Bertoua Forestry Reserve', 'MINFOF', 'East', 'Bertoua', 'Bertoua I', 'Zone Forestiere',
  200000, '[{"lat":4.5700,"lng":13.6800},{"lat":4.5900,"lng":13.6800},{"lat":4.5900,"lng":13.7000},{"lat":4.5700,"lng":13.7000}]'::jsonb,
  'POLYGON((13.6800 4.5700, 13.6800 4.5900, 13.7000 4.5900, 13.7000 4.5700, 13.6800 4.5700))',
  4.5800, 13.6900, 'forest_reserve', 'approved', 'approved', 'XAF', NOW(), NOW()
),

-- South Region (Ebolowa area)
(
  'CM-SU-2026-00001', 'Ebolowa Cocoa Plantation', 'SODECAO', 'South', 'Ebolowa', 'Ebolowa I', 'Zone Agricole',
  75000, '[{"lat":2.9000,"lng":11.1500},{"lat":2.9100,"lng":11.1500},{"lat":2.9100,"lng":11.1600},{"lat":2.9000,"lng":11.1600}]'::jsonb,
  'POLYGON((11.1500 2.9000, 11.1500 2.9100, 11.1600 2.9100, 11.1600 2.9000, 11.1500 2.9000))',
  2.9050, 11.1550, 'agricultural', 'approved', 'approved', 'XAF', NOW(), NOW()
),
(
  'CM-SU-2026-00002', 'Kribi Seaport Extension', 'Port Autonome de Kribi', 'South', 'Kribi', 'Kribi I', 'Zone Portuaire',
  150000, '[{"lat":2.9400,"lng":9.9000},{"lat":2.9500,"lng":9.9000},{"lat":2.9500,"lng":9.9100},{"lat":2.9400,"lng":9.9100}]'::jsonb,
  'POLYGON((9.9000 2.9400, 9.9000 2.9500, 9.9100 2.9500, 9.9100 2.9400, 9.9000 2.9400))',
  2.9450, 9.9050, 'industrial', 'approved', 'approved', 'XAF', NOW(), NOW()
)
ON CONFLICT (title_number) DO NOTHING;

-- Update PostGIS geometry column for all seeded lands
UPDATE lands 
SET geom = ST_SetSRID(ST_GeomFromText(polygon_wkt), 4326)
WHERE polygon_wkt IS NOT NULL AND geom IS NULL;

-- Generate land hashes for approved lands (blockchain-style anti-tamper)
UPDATE lands 
SET land_hash = encode(
  sha256(
    (title_number || '|' || current_owner || '|' || COALESCE(area_sqm::text, '0') || '|' || COALESCE(polygon_wkt, '') || '|' || region || '|' || COALESCE(town, ''))::bytea
  ), 
  'hex'
)
WHERE verification_status = 'approved' AND land_hash IS NULL;
