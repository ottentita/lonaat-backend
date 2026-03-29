import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

// Direct PostgreSQL connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'lonaat'
});

// GET /api/products-direct - Get all products using direct SQL
router.get('/', async (req, res) => {
  console.log('📋 GET ALL PRODUCTS REQUEST (DIRECT SQL)');
  
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category as string;

    let query = `SELECT * FROM products WHERE is_active = true`;
    const params: any[] = [];
    
    if (category && category !== 'all') {
      query += ` AND category = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, skip);

    const result = await pool.query(query, params);
    
    let countQuery = `SELECT COUNT(*)::int as count FROM products WHERE is_active = true`;
    const countParams: any[] = [];
    
    if (category && category !== 'all') {
      countQuery += ` AND category = $1`;
      countParams.push(category);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = countResult.rows[0]?.count || 0;

    console.log('✅ Found', result.rows.length, 'products');

    res.json({
      success: true,
      products: result.rows,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to get products',
      details: error.message 
    });
  }
});

export default router;
