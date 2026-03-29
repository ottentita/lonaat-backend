const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditMarketplace() {
  try {
    console.log('🔍 MARKETPLACE AUDIT STARTING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // PHASE 1: DATABASE VERIFICATION
    console.log('\n🔍 PHASE 1: DATABASE VERIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 1.1 Check Product Table Existence
    console.log('\n🔍 PHASE 1.1: Checking Product Tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%product%';
    `;
    console.log('Product tables found:', tables);
    
    // 1.2 Count Products
    console.log('\n🔍 PHASE 1.2: Counting Products...');
    let productCount = 0;
    let tableName = 'products';
    
    try {
      productCount = await prisma.products.count();
      console.log('Product count (products table):', productCount);
    } catch (error) {
      console.log('products table not found, trying Product...');
      productCount = await prisma.product.count();
      tableName = 'product';
      console.log('Product count (product table):', productCount);
    }
    
    // 1.3 Sample Data Integrity
    console.log('\n🔍 PHASE 1.3: Sample Data Integrity...');
    const sampleData = await prisma.$queryRaw`
      SELECT id, name, price, network, "is_active", "created_at"
      FROM "products"
      LIMIT 20;
    `;
    console.log('Sample data:', sampleData);
    
    // 1.4 Status Filtering Check
    console.log('\n🔍 PHASE 1.4: Status Distribution...');
    const statusDist = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE "is_active" = true) AS active,
        COUNT(*) FILTER (WHERE "is_active" = false) AS inactive
      FROM "products";
    `;
    console.log('Status distribution:', statusDist);
    
    // Calculate data quality metrics
    const nullNames = sampleData.filter(p => !p.name || p.name === '').length;
    const nullPrices = sampleData.filter(p => !p.price || p.price <= 0).length;
    const missingSources = sampleData.filter(p => !p.network || p.network === '').length;
    
    const phase1Result = {
      table_exists: tables.length > 0,
      product_count: productCount,
      data_quality: {
        null_names: nullNames,
        null_prices: nullPrices,
        missing_sources: missingSources
      },
      status_distribution: {
        active: parseInt(statusDist[0]?.active || 0),
        inactive: parseInt(statusDist[0]?.inactive || 0)
      }
    };
    
    console.log('\n📤 PHASE 1 OUTPUT:');
    console.log(JSON.stringify(phase1Result, null, 2));
    
    // PHASE 2: INGESTION PIPELINE AUDIT
    console.log('\n🔍 PHASE 2: INGESTION PIPELINE AUDIT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const phase2Result = {
      sources_checked: [],
      api_calls_successful: false,
      fetched_products_count: 0,
      saved_to_db_count: 0,
      mapping_issues: [],
      errors: []
    };
    
    // Check for ingestion services
    const fs = require('fs');
    const path = require('path');
    
    const ingestionFiles = [
      'services/productIngestion.service.ts',
      'services/admitadService.ts',
      'services/productSyncService.ts'
    ];
    
    ingestionFiles.forEach(file => {
      if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ Found: ${file}`);
        phase2Result.sources_checked.push(file.replace('services/', '').replace('.ts', ''));
      } else {
        console.log(`❌ Missing: ${file}`);
        phase2Result.errors.push(`Missing file: ${file}`);
      }
    });
    
    // Try to run product sync if available
    try {
      if (fs.existsSync(path.join(__dirname, 'services/productSyncService.ts'))) {
        console.log('\n🔄 Testing product sync service...');
        const productSyncService = require('./services/productSyncService');
        
        // Try to sync products
        if (productSyncService.syncAllProducts) {
          const syncResult = await productSyncService.syncAllProducts();
          console.log('Sync result:', syncResult);
          phase2Result.api_calls_successful = true;
          phase2Result.fetched_products_count = syncResult.fetched || 0;
          phase2Result.saved_to_db_count = syncResult.saved || 0;
        }
      }
    } catch (error) {
      console.log('❌ Product sync error:', error.message);
      phase2Result.errors.push(error.message);
    }
    
    console.log('\n📤 PHASE 2 OUTPUT:');
    console.log(JSON.stringify(phase2Result, null, 2));
    
    // PHASE 3: API ROUTE AUDIT
    console.log('\n🔍 PHASE 3: API ROUTE AUDIT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const axios = require('axios');
    const BASE_URL = 'http://localhost:4000';
    
    const phase3Result = {
      endpoint_status: 0,
      products_returned: 0,
      filters_applied: {},
      over_filtering_detected: false
    };
    
    try {
      console.log('\n🔍 Testing /api/products endpoint...');
      const response = await axios.get(`${BASE_URL}/api/products`);
      console.log('Response status:', response.status);
      console.log('Response data keys:', Object.keys(response.data));
      console.log('Products returned:', response.data.products?.length || response.data.length || 0);
      
      phase3Result.endpoint_status = response.status;
      phase3Result.products_returned = response.data.products?.length || response.data.length || 0;
      
    } catch (error) {
      console.log('❌ API endpoint error:', error.message);
      phase3Result.endpoint_status = error.response?.status || 0;
      phase3Result.errors = [error.message];
    }
    
    console.log('\n📤 PHASE 3 OUTPUT:');
    console.log(JSON.stringify(phase3Result, null, 2));
    
    // PHASE 4: FRONTEND AUDIT
    console.log('\n🔍 PHASE 4: FRONTEND AUDIT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const phase4Result = {
      api_called_correctly: false,
      data_received: false,
      rendering_errors: [],
      data_shape_mismatch: false
    };
    
    // Check frontend file
    const frontendPath = path.join(__dirname, '../lonaat-frontend/src/app/dashboard/marketplace/page.tsx');
    if (fs.existsSync(frontendPath)) {
      console.log('✅ Frontend marketplace page found');
      const frontendContent = fs.readFileSync(frontendPath, 'utf8');
      
      // Check for API calls
      if (frontendContent.includes('/api/products') || frontendContent.includes('/api/products/list')) {
        phase4Result.api_called_correctly = true;
        console.log('✅ API call found in frontend');
      }
      
      // Check for data handling
      if (frontendContent.includes('.map(') || frontendContent.includes('products.map')) {
        console.log('✅ Product rendering logic found');
      }
      
      // Look for potential errors
      if (frontendContent.includes('products.length') && !frontendContent.includes('products?.length')) {
        phase4Result.rendering_errors.push('Potential undefined access: products.length');
      }
      
    } else {
      console.log('❌ Frontend marketplace page not found');
      phase4Result.rendering_errors.push('Frontend file missing');
    }
    
    console.log('\n📤 PHASE 4 OUTPUT:');
    console.log(JSON.stringify(phase4Result, null, 2));
    
    // PHASE 5: CROSS-LAYER CONSISTENCY
    console.log('\n🔍 PHASE 5: CROSS-LAYER CONSISTENCY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const phase5Result = {
      db_vs_api_match: phase1Result.product_count === phase3Result.products_returned,
      api_vs_frontend_match: phase3Result.products_returned > 0, // Simplified check
      data_loss_stage: 'none'
    };
    
    if (!phase5Result.db_vs_api_match) {
      phase5Result.data_loss_stage = 'api';
    } else if (!phase5Result.api_vs_frontend_match) {
      phase5Result.data_loss_stage = 'frontend';
    }
    
    console.log('\n📤 PHASE 5 OUTPUT:');
    console.log(JSON.stringify(phase5Result, null, 2));
    
    // FINAL REPORT
    console.log('\n🧠 FINAL REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const rootCauses = [];
    const fixes = [];
    let systemStatus = 'working';
    
    // Analyze results
    if (phase1Result.product_count === 0) {
      rootCauses.push({
        issue: 'No products in database',
        evidence: `Product count: ${phase1Result.product_count}`,
        location: 'database:products'
      });
      fixes.push({
        action: 'Run product ingestion service to populate database',
        file: 'services/productSyncService.ts',
        priority: 'critical'
      });
      systemStatus = 'broken';
    }
    
    if (phase3Result.endpoint_status !== 200) {
      rootCauses.push({
        issue: 'API endpoint not working',
        evidence: `Status: ${phase3Result.endpoint_status}`,
        location: 'api:/api/products'
      });
      fixes.push({
        action: 'Fix API endpoint implementation',
        file: 'routes/products.ts',
        priority: 'critical'
      });
      systemStatus = 'broken';
    }
    
    if (!phase5Result.db_vs_api_match) {
      rootCauses.push({
        issue: 'Data loss between database and API',
        evidence: `DB: ${phase1Result.product_count}, API: ${phase3Result.products_returned}`,
        location: 'api:filters'
      });
      fixes.push({
        action: 'Check API query filters and conditions',
        file: 'routes/products.ts',
        priority: 'high'
      });
      systemStatus = 'partially broken';
    }
    
    if (phase4Result.rendering_errors.length > 0) {
      rootCauses.push({
        issue: 'Frontend rendering errors',
        evidence: phase4Result.rendering_errors.join(', '),
        location: 'frontend:page.tsx'
      });
      fixes.push({
        action: 'Fix frontend data handling and rendering',
        file: 'src/app/dashboard/marketplace/page.tsx',
        priority: 'medium'
      });
      if (systemStatus === 'working') systemStatus = 'partially broken';
    }
    
    const finalReport = {
      root_causes: rootCauses,
      fixes: fixes,
      system_status: systemStatus
    };
    
    console.log('\n📤 FINAL REPORT:');
    console.log(JSON.stringify(finalReport, null, 2));
    
    console.log('\n🎯 AUDIT SUMMARY:');
    console.log(`System Status: ${systemStatus}`);
    console.log(`Database Products: ${phase1Result.product_count}`);
    console.log(`API Products Returned: ${phase3Result.products_returned}`);
    console.log(`Issues Found: ${rootCauses.length}`);
    console.log(`Fixes Required: ${fixes.length}`);
    
  } catch (error) {
    console.error('Audit error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditMarketplace();
