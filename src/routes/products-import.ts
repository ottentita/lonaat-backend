// Product Import System - CSV/JSON Import Endpoint
import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { validateAffiliateLink } from '../utils/validateAffiliateLink';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  },
});

interface ProductImportData {
  name: string;
  description?: string;
  price: number;
  affiliate_link: string;
  image_url?: string;
  network: string;
  category?: string;
}

// POST /api/products/import - Import products from CSV or JSON
router.post('/import', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  console.log('📥 PRODUCT IMPORT REQUEST');

  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const fileType = req.file.mimetype.includes('json') || req.file.originalname.endsWith('.json') ? 'json' : 'csv';

    console.log(`📄 File type: ${fileType}`);
    console.log(`📦 File size: ${req.file.size} bytes`);

    let products: ProductImportData[] = [];

    if (fileType === 'json') {
      // Parse JSON
      try {
        const jsonData = JSON.parse(fileContent);
        products = Array.isArray(jsonData) ? jsonData : [jsonData];
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON format',
        });
      }
    } else {
      // Parse CSV
      products = await new Promise((resolve, reject) => {
        const results: ProductImportData[] = [];
        const stream = Readable.from(fileContent);

        stream
          .pipe(csv())
          .on('data', (data) => {
            // Map CSV columns to product fields
            results.push({
              name: data.name || data.title || data.product_name,
              description: data.description || '',
              price: parseFloat(data.price) || 0,
              affiliate_link: data.affiliate_link || data.url || data.link,
              image_url: data.image_url || data.image || '',
              network: data.network || data.source || 'Manual',
              category: data.category || 'General',
            });
          })
          .on('end', () => resolve(results))
          .on('error', (error) => reject(error));
      });
    }

    console.log(`📊 Found ${products.length} products to import`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const productData of products) {
      try {
        // Validate required fields
        if (!productData.name || !productData.affiliate_link) {
          skipped++;
          errors.push(`Skipped product: Missing name or affiliate_link`);
          continue;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 3 & 5: VALIDATE AFFILIATE LINK BEFORE SAVING
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log(`🔍 Validating affiliate link for: ${productData.name}`);
        const isValid = await validateAffiliateLink(productData.affiliate_link);
        
        if (!isValid) {
          skipped++;
          errors.push(`Skipped ${productData.name}: Invalid affiliate link`);
          console.log(`❌ Skipped: ${productData.name} - Invalid affiliate link`);
          continue;
        }
        
        console.log(`✅ Valid affiliate link for: ${productData.name}`);

        // Check if product exists
        const existing = await prisma.product.findFirst({
          where: { affiliateLink: productData.affiliate_link },
        });

        if (existing) {
          // Update existing product
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: productData.name,
              description: productData.description || existing.description,
              price: productData.price || existing.price,
              images: productData.image_url ? [productData.image_url] : existing.images,
              category: productData.category || existing.category,
              isValid: true, // Mark as valid since validation passed
            },
          });
          updated++;
          console.log(`✅ Updated: ${productData.name}`);
        } else {
          // Create new product - need userId
          await prisma.product.create({
            data: {
              userId: userId,
              name: productData.name,
              description: productData.description || '',
              price: productData.price || 0,
              images: productData.image_url ? [productData.image_url] : [],
              affiliateLink: productData.affiliate_link,
              category: productData.category || 'General',
              tags: [productData.network || 'Manual'],
              isActive: true,
              isValid: true, // Mark as valid since validation passed
            },
          });
          imported++;
          console.log(`✨ Imported: ${productData.name}`);
        }
      } catch (error: any) {
        skipped++;
        errors.push(`Failed to import ${productData.name}: ${error.message}`);
        console.error(`❌ Import error:`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 IMPORT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ Imported: ${imported} products`);
    console.log(`✅ Updated: ${updated} products`);
    console.log(`⚠️ Skipped: ${skipped} products`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.json({
      success: true,
      message: 'Product import completed',
      stats: {
        imported,
        updated,
        skipped,
        total: products.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('❌ Product import error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import products',
    });
  }
});

// POST /api/products/import/json - Import products from JSON body
router.post('/import/json', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📥 JSON PRODUCT IMPORT REQUEST');

  try {
    const userId = req.user?.id;
    if (!userId || req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const products: ProductImportData[] = Array.isArray(req.body) ? req.body : [req.body];

    console.log(`📊 Importing ${products.length} products from JSON body`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const productData of products) {
      try {
        if (!productData.name || !productData.affiliate_link) {
          skipped++;
          continue;
        }

        const existing = await prisma.product.findFirst({
          where: { affiliate_link: productData.affiliate_link },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: productData.name,
              description: productData.description,
              price: productData.price,
              image_url: productData.image_url,
              network: productData.network,
              category: productData.category,
            },
          });
          updated++;
        } else {
          await prisma.product.create({
            data: {
              name: productData.name,
              description: productData.description || '',
              price: productData.price || 0,
              image_url: productData.image_url || '',
              affiliate_link: productData.affiliate_link,
              network: productData.network || 'Manual',
              category: productData.category || 'General',
              is_active: true,
            },
          });
          imported++;
        }
      } catch (error) {
        skipped++;
        console.error(`❌ Import error:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'JSON import completed',
      stats: {
        imported,
        updated,
        skipped,
        total: products.length,
      },
    });
  } catch (error: any) {
    console.error('❌ JSON import error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to import products',
    });
  }
});

export default router;
