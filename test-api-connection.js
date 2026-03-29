/**
 * TEST API CONNECTION - Verify products endpoint is working
 */

const axios = require('axios');

async function testProductsAPI() {
  try {
    console.log('🔍 TESTING /api/products ENDPOINT...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const response = await axios.get('http://localhost:4000/api/products', {
      timeout: 5000
    });
    
    console.log('✅ API RESPONSE SUCCESSFUL');
    console.log('   Status:', response.status);
    console.log('   Data Keys:', Object.keys(response.data));
    console.log('   Products Count:', response.data.products?.length || 0);
    console.log('   Total in DB:', response.data.total || 'N/A');
    console.log('   Active in DB:', response.data.activeInDb || 'N/A');
    
    if (response.data.products && response.data.products.length > 0) {
      console.log('\n📋 SAMPLE PRODUCTS:');
      response.data.products.slice(0, 3).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} - ${product.price} XAF (${product.network})`);
      });
    }
    
    console.log('\n🎉 API TEST COMPLETED SUCCESSFULLY!');
    return {
      success: true,
      status: response.status,
      productsCount: response.data.products?.length || 0,
      total: response.data.total || 0
    };
    
  } catch (error) {
    console.error('❌ API TEST FAILED');
    console.error('   Error:', error.message);
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - server may not be running');
    } else if (error.code === 'ECONNRESET') {
      console.error('   Connection reset - server may have crashed');
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 0
    };
  }
}

// Run the test
testProductsAPI()
  .then(result => {
    console.log('\n📊 FINAL RESULT:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 UNEXPECTED ERROR:', error);
    process.exit(1);
  });
