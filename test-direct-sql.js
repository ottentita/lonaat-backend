const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'lonaat'
});

async function testQuery() {
  try {
    console.log('Verifying database connection...');
    const dbCheck = await pool.query('SELECT current_database(), current_user');
    console.log('Connected to database:', dbCheck.rows[0].current_database);
    console.log('Connected as user:', dbCheck.rows[0].current_user);
    
    console.log('\nChecking tables...');
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%product%'");
    console.log('Tables found:', tables.rows.map(r => r.tablename));
    
    console.log('\nCounting products...');
    const count = await pool.query('SELECT COUNT(*) as total FROM products');
    console.log('Total products:', count.rows[0].total);
    
    console.log('\nTesting SELECT * FROM products...');
    const result1 = await pool.query('SELECT * FROM products LIMIT 3');
    console.log('✅ Found', result1.rows.length, 'products');
    
    if (result1.rows.length > 0) {
      console.log('\nFirst product:');
      console.log(JSON.stringify(result1.rows[0], null, 2));
    } else {
      console.log('⚠️ No products returned even though COUNT shows', count.rows[0].total);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testQuery();
