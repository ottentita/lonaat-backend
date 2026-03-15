import crypto from 'crypto';

interface LandData {
  title_number: string;
  current_owner: string;
  area_sqm: number | null;
  polygon_wkt: string | null;
  region: string;
  town?: string | null;
}

export function generateLandHash(land: LandData): string {
  const data = `${land.title_number}|${land.current_owner}|${land.area_sqm || 0}|${land.polygon_wkt || ''}|${land.region}|${land.town || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function verifyLandHash(land: LandData, storedHash: string): boolean {
  const computedHash = generateLandHash(land);
  return computedHash === storedHash;
}

export function detectTampering(land: LandData, storedHash: string | null): { tampered: boolean; message: string } {
  if (!storedHash) {
    return { tampered: false, message: 'No hash stored for verification' };
  }
  
  const isValid = verifyLandHash(land, storedHash);
  
  if (!isValid) {
    return { 
      tampered: true, 
      message: 'WARNING: Land record tampering detected! Hash mismatch indicates unauthorized modification.' 
    };
  }
  
  return { tampered: false, message: 'Land record integrity verified' };
}
