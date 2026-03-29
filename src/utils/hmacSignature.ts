/**
 * HMAC SIGNATURE UTILITY
 * Prevents unauthorized external scripts from abusing click tracking
 */

import crypto from 'crypto';

const SIGNATURE_SECRET = process.env.CLICK_SIGNATURE_SECRET || 'default-secret-change-in-production';
const SIGNATURE_VALIDITY_SECONDS = 300; // 5 minutes

interface SignaturePayload {
  productId: number;
  timestamp: number;
  nonce?: string;
}

/**
 * Generate HMAC signature for click request
 * Frontend uses this to sign requests
 */
export function generateClickSignature(payload: SignaturePayload): string {
  const data = `${payload.productId}:${payload.timestamp}:${payload.nonce || ''}`;
  
  return crypto
    .createHmac('sha256', SIGNATURE_SECRET)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature from request
 * Backend uses this to validate requests
 */
export function verifyClickSignature(
  productId: number,
  timestamp: number,
  signature: string,
  nonce?: string
): { valid: boolean; reason?: string } {
  // Check timestamp validity (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const timestampAge = now - timestamp;
  
  if (timestampAge > SIGNATURE_VALIDITY_SECONDS) {
    return {
      valid: false,
      reason: `Signature expired (${timestampAge}s old, max ${SIGNATURE_VALIDITY_SECONDS}s)`
    };
  }
  
  if (timestampAge < -60) {
    return {
      valid: false,
      reason: 'Signature timestamp in future (clock skew)'
    };
  }
  
  // Generate expected signature
  const expectedSignature = generateClickSignature({
    productId,
    timestamp,
    nonce
  });
  
  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  if (!valid) {
    return {
      valid: false,
      reason: 'Invalid signature'
    };
  }
  
  return { valid: true };
}

/**
 * Extract signature data from request
 */
export function extractSignatureFromRequest(req: any): {
  productId: number;
  timestamp: number;
  signature: string;
  nonce?: string;
} | null {
  // Check query parameters
  const productId = parseInt(req.params.productId);
  const timestamp = parseInt(req.query.t || req.headers['x-click-timestamp']);
  const signature = req.query.sig || req.headers['x-click-signature'];
  const nonce = req.query.nonce || req.headers['x-click-nonce'];
  
  if (!productId || !timestamp || !signature) {
    return null;
  }
  
  return {
    productId,
    timestamp,
    signature,
    nonce
  };
}

/**
 * Middleware to validate signed requests
 */
export function requireSignedRequest(req: any, res: any, next: any) {
  const signatureData = extractSignatureFromRequest(req);
  
  if (!signatureData) {
    return res.status(400).json({
      success: false,
      error: 'Missing signature',
      message: 'This endpoint requires a signed request. Include timestamp (t) and signature (sig) parameters.'
    });
  }
  
  const verification = verifyClickSignature(
    signatureData.productId,
    signatureData.timestamp,
    signatureData.signature,
    signatureData.nonce
  );
  
  if (!verification.valid) {
    console.warn('🚫 Invalid signature attempt:', {
      productId: signatureData.productId,
      reason: verification.reason,
      ip: req.ip
    });
    
    return res.status(403).json({
      success: false,
      error: 'Invalid signature',
      message: verification.reason || 'Request signature validation failed'
    });
  }
  
  // Signature valid, continue
  next();
}

/**
 * Generate client-side signature helper
 * This code can be used in frontend
 */
export function generateClientSignatureCode(): string {
  return `
// Frontend: Generate signed click URL
async function generateSignedClickUrl(productId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.random().toString(36).substring(7);
  
  // Get signature from your backend API
  const response = await fetch('/api/click/generate-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, timestamp, nonce })
  });
  
  const { signature } = await response.json();
  
  // Build signed URL
  return \`/api/track/click/\${productId}?t=\${timestamp}&sig=\${signature}&nonce=\${nonce}\`;
}

// Usage
const signedUrl = await generateSignedClickUrl(123);
window.location.href = signedUrl;
  `.trim();
}

/**
 * API endpoint to generate signatures for frontend
 * Add this to your routes
 */
export async function handleGenerateSignature(req: any, res: any) {
  try {
    const { productId, timestamp, nonce } = req.body;
    
    if (!productId || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productId, timestamp'
      });
    }
    
    // Verify timestamp is recent (within 1 minute)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 60) {
      return res.status(400).json({
        success: false,
        error: 'Timestamp too old or in future'
      });
    }
    
    const signature = generateClickSignature({
      productId: parseInt(productId),
      timestamp: parseInt(timestamp),
      nonce
    });
    
    res.json({
      success: true,
      signature,
      expiresIn: SIGNATURE_VALIDITY_SECONDS
    });
    
  } catch (error: any) {
    console.error('Error generating signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate signature'
    });
  }
}

export default {
  generateClickSignature,
  verifyClickSignature,
  extractSignatureFromRequest,
  requireSignedRequest,
  handleGenerateSignature,
  generateClientSignatureCode
};
