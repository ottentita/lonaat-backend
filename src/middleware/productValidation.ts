/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MONETIZATION PROTECTION LAYER
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * This middleware:
 * 1. Prevents inserting products without affiliate_link
 * 2. Prevents inserting products without validation
 * 3. Rejects invalid URLs
 * 4. Rejects non-HTTPS links
 * 5. Logs all product insertions
 * 6. Enforces admin-only control
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Validates affiliate link format and protocol
 */
function isValidAffiliateLink(link: string): { valid: boolean, reason: string } {
  if (!link || typeof link !== 'string') {
    return { valid: false, reason: 'Affiliate link is required and must be a string' };
  }

  if (!link.trim()) {
    return { valid: false, reason: 'Affiliate link cannot be empty' };
  }

  try {
    const url = new URL(link);
    
    // Only allow HTTPS protocols
    if (url.protocol !== 'https:') {
      return { valid: false, reason: 'Only HTTPS affiliate links are allowed' };
    }

    // Basic domain validation
    if (!url.hostname || url.hostname.length < 4) {
      return { valid: false, reason: 'Invalid domain in affiliate link' };
    }

    return { valid: true, reason: 'Valid affiliate link' };
  } catch (error) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Middleware to validate product creation requests
 */
export function validateProductCreation(req: AuthRequest, res: Response, next: NextFunction) {
  console.log('🛡️ PRODUCT VALIDATION MIDDLEWARE - Checking request...');
  
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      console.log(`❌ REJECTED: Non-admin user attempted product creation - User: ${req.user?.email || 'unknown'}, Role: ${req.user?.role || 'unknown'}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can create products'
      });
    }

    const { affiliate_link } = req.body;
    
    // Validate affiliate link presence
    if (!affiliate_link) {
      console.log(`❌ REJECTED: Missing affiliate_link - Admin: ${req.user.email}`);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Affiliate link is required for product creation'
      });
    }

    // Validate affiliate link format
    const linkValidation = isValidAffiliateLink(affiliate_link);
    if (!linkValidation.valid) {
      console.log(`❌ REJECTED: Invalid affiliate link - Admin: ${req.user.email}, Link: ${affiliate_link}, Reason: ${linkValidation.reason}`);
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid affiliate link: ${linkValidation.reason}`
      });
    }

    // Log successful validation
    console.log(`✅ APPROVED: Product creation request validated - Admin: ${req.user.email}, Link: ${affiliate_link}`);
    
    // Add validation metadata to request
    req.validatedProduct = {
      affiliate_link: affiliate_link,
      validated_by: req.user.email,
      validated_at: new Date().toISOString(),
      validation_reason: linkValidation.reason
    };

    next();
  } catch (error) {
    console.error('❌ VALIDATION MIDDLEWARE ERROR:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Product validation failed'
    });
  }
}

/**
 * Middleware to log all product insertions
 */
export function logProductInsertion(req: AuthRequest, res: Response, next: NextFunction) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Log successful product creation
    if (res.statusCode >= 200 && res.statusCode < 300 && req.method === 'POST' && req.path.includes('/product')) {
      console.log('📝 PRODUCT INSERTION LOG:');
      console.log(`  👤 Admin: ${req.user?.email || 'unknown'}`);
      console.log(`  📦 Product: ${req.body?.name || 'unnamed'}`);
      console.log(`  📎 Affiliate Link: ${req.body?.affiliate_link || 'missing'}`);
      console.log(`  🌐 Network: ${req.body?.network || 'unknown'}`);
      console.log(`  💰 Price: ${req.body?.price || '0'}`);
      console.log(`  📅 Created: ${new Date().toISOString()}`);
      console.log(`  📍 IP: ${req.ip || 'unknown'}`);
      console.log(`  🆔 User-Agent: ${req.get('User-Agent') || 'unknown'}`);
      console.log('');
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Middleware to enforce HTTPS-only affiliate links
 */
export function enforceHttpsLinks(req: Request, res: Response, next: NextFunction) {
  const { affiliate_link } = req.body;
  
  if (affiliate_link && !affiliate_link.startsWith('https://')) {
    console.log(`❌ REJECTED: Non-HTTPS affiliate link detected - Link: ${affiliate_link}`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Only HTTPS affiliate links are allowed'
    });
  }
  
  next();
}

/**
 * Enhanced type for AuthRequest to include validated product data
 */
declare global {
  namespace Express {
    interface Request {
      validatedProduct?: {
        affiliate_link: string;
        validated_by: string;
        validated_at: string;
        validation_reason: string;
      };
    }
  }
}
