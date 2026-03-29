/**
 * GEO-LOCATION UTILITY
 * IP-based country detection for Cameroon-focused traffic filtering
 */

import { getClientIp } from './fingerprint';

// Cameroon IP ranges (simplified - use GeoIP database in production)
// These are example ranges - replace with actual Cameroon IP blocks
const CAMEROON_IP_RANGES = [
  { start: '41.202.192.0', end: '41.202.255.255' },
  { start: '41.203.192.0', end: '41.203.255.255' },
  { start: '154.70.0.0', end: '154.70.255.255' },
  { start: '154.72.0.0', end: '154.72.255.255' },
  { start: '196.200.0.0', end: '196.200.255.255' },
  { start: '197.159.0.0', end: '197.159.255.255' }
];

// Suspicious countries (high fraud rates)
const SUSPICIOUS_COUNTRIES = [
  'CN', // China
  'RU', // Russia
  'VN', // Vietnam
  'IN', // India (high bot traffic)
  'PK', // Pakistan
  'BD'  // Bangladesh
];

interface GeoLocation {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  isCameroon: boolean;
  isSuspicious: boolean;
  confidence: number;
}

/**
 * Convert IP to number for range comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  return (
    (parseInt(parts[0]) << 24) +
    (parseInt(parts[1]) << 16) +
    (parseInt(parts[2]) << 8) +
    parseInt(parts[3])
  );
}

/**
 * Check if IP is in Cameroon range (basic check)
 */
function isIPInCameroon(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  
  return CAMEROON_IP_RANGES.some(range => {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);
    return ipNum >= startNum && ipNum <= endNum;
  });
}

/**
 * Get geo-location from IP (basic implementation)
 * In production, use MaxMind GeoIP2 or similar service
 */
export async function getGeoLocation(ip: string): Promise<GeoLocation> {
  try {
    // Basic Cameroon detection
    const isCameroon = isIPInCameroon(ip);
    
    // For production, use GeoIP service:
    // const geoData = await geoipLookup(ip);
    
    // Fallback to basic detection
    return {
      country: isCameroon ? 'Cameroon' : 'Unknown',
      countryCode: isCameroon ? 'CM' : 'XX',
      isCameroon,
      isSuspicious: false, // Set based on actual country code
      confidence: isCameroon ? 0.8 : 0.3
    };
    
  } catch (error) {
    console.error('Geo-location lookup error:', error);
    return {
      country: 'Unknown',
      countryCode: 'XX',
      isCameroon: false,
      isSuspicious: false,
      confidence: 0
    };
  }
}

/**
 * Get geo-location from request
 */
export async function getGeoLocationFromRequest(req: any): Promise<GeoLocation> {
  const ip = getClientIp(req);
  return getGeoLocation(ip);
}

/**
 * Check if country is suspicious
 */
export function isSuspiciousCountry(countryCode: string): boolean {
  return SUSPICIOUS_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Validate traffic based on geo-location
 */
export interface GeoValidationResult {
  allowed: boolean;
  reason?: string;
  flagged: boolean;
  geoData: GeoLocation;
}

export async function validateGeoLocation(
  req: any,
  options: {
    requireCameroon?: boolean;
    blockSuspicious?: boolean;
    flagOnly?: boolean;
  } = {}
): Promise<GeoValidationResult> {
  const geoData = await getGeoLocationFromRequest(req);
  
  // Check if Cameroon required
  if (options.requireCameroon && !geoData.isCameroon) {
    return {
      allowed: !options.flagOnly,
      reason: 'Traffic outside Cameroon',
      flagged: true,
      geoData
    };
  }
  
  // Check if suspicious country
  if (options.blockSuspicious && geoData.isSuspicious) {
    return {
      allowed: false,
      reason: `Suspicious country: ${geoData.country}`,
      flagged: true,
      geoData
    };
  }
  
  return {
    allowed: true,
    flagged: geoData.isSuspicious || !geoData.isCameroon,
    geoData
  };
}

/**
 * Integration with MaxMind GeoIP2 (production)
 * Uncomment and configure when ready
 */
/*
import maxmind, { CityResponse } from 'maxmind';

let geoipLookup: maxmind.Reader<CityResponse> | null = null;

export async function initializeGeoIP() {
  try {
    geoipLookup = await maxmind.open<CityResponse>(
      './data/GeoLite2-City.mmdb'
    );
    console.log('✅ GeoIP database loaded');
  } catch (error) {
    console.error('❌ Failed to load GeoIP database:', error);
  }
}

export async function getGeoLocationMaxMind(ip: string): Promise<GeoLocation> {
  if (!geoipLookup) {
    throw new Error('GeoIP database not initialized');
  }
  
  const result = geoipLookup.get(ip);
  
  if (!result) {
    return {
      country: 'Unknown',
      countryCode: 'XX',
      isCameroon: false,
      isSuspicious: false,
      confidence: 0
    };
  }
  
  const countryCode = result.country?.iso_code || 'XX';
  const isCameroon = countryCode === 'CM';
  const isSuspicious = isSuspiciousCountry(countryCode);
  
  return {
    country: result.country?.names?.en || 'Unknown',
    countryCode,
    region: result.subdivisions?.[0]?.names?.en,
    city: result.city?.names?.en,
    isCameroon,
    isSuspicious,
    confidence: 0.95
  };
}
*/

export default {
  getGeoLocation,
  getGeoLocationFromRequest,
  isSuspiciousCountry,
  validateGeoLocation
};
