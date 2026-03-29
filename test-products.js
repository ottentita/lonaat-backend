// Quick test script to verify products in database
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'lonaat'
});

async function testProducts() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get all products
    const result = await client.query('SELECT * FROM products LIMIT 3');
    console.log('\n📦 Products in database:', result.rows.length);
    console.log('\n📋 Sample product:');
    console.log(JSON.stringify(result.rows[0], null, 2));

    // Get column names
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
    console.log('\n📊 Column names:');
    columns.rows.forEach(row => console.log('  -', row.column_name));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testProducts();
