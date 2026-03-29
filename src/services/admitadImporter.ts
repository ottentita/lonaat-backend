import axios from 'axios';
import sax from 'sax';

/**
 * ADMITAD XML FEED IMPORTER (STREAMING)
 * Fetches and parses Admitad product feed using SAX streaming parser
 * This avoids memory issues with large XML files (100MB+)
 */

// SAFETY LIMIT: Prevent unlimited imports
const MAX_PRODUCTS = 200;

// PAGINATION: Offset for rotating imports (set via env)
const IMPORT_OFFSET = Number(process.env.ADMITAD_IMPORT_OFFSET || '0');

export async function fetchAdmitadFeed() {
  try {
    console.log('📡 Fetching Admitad XML feed (streaming mode)...');
    console.log(`⚠️ LIMIT: Maximum ${MAX_PRODUCTS} products per import`);
    if (IMPORT_OFFSET > 0) {
      console.log(`🔄 PAGINATION: Skipping first ${IMPORT_OFFSET} products`);
    }
    
    const url = process.env.ADMITAD_FEED_URL;
    
    if (!url) {
      console.warn('⚠️ ADMITAD_FEED_URL not configured');
      return [];
    }

    console.log('🌐 Feed URL:', url.substring(0, 100) + '...');

    const products: any[] = [];
    let currentProduct: any = {};
    let currentTag = '';
    let textBuffer = '';
    let productsSkipped = 0; // Track skipped products for pagination
    
    // ABORT CONTROLLER: Stop HTTP stream at limit
    const abortController = new AbortController();
    let stream: any = null;

    return new Promise<any[]>((resolve, reject) => {
      // Create SAX parser (streaming)
      const parser = sax.createStream(true, {
        trim: true,
        normalize: true
      });

      parser.on('opentag', (node: any) => {
        currentTag = node.name;
        
        // Start of new product
        if (node.name === 'offer') {
          currentProduct = {
            id: node.attributes?.id || '',
            externalId: '',
            title: '',
            price: 0,
            image: '',
            affiliate_link: '',
            description: '',
            category: 'General',
            network: 'admitad',
            commission_rate: 5
          };
        }
        
        textBuffer = '';
      });

      parser.on('text', (text: string) => {
        textBuffer += text;
      });

      parser.on('closetag', (tagName: string) => {
        // Extract data from current tag
        if (currentProduct && textBuffer) {
          switch (tagName) {
            case 'name':
              currentProduct.title = textBuffer.trim();
              break;
            case 'price':
              currentProduct.price = parseFloat(textBuffer) || 0;
              break;
            case 'url':
              currentProduct.affiliate_link = textBuffer.trim();
              break;
            case 'picture':
              if (!currentProduct.image) {
                currentProduct.image = textBuffer.trim();
              }
              break;
            case 'description':
              currentProduct.description = textBuffer.trim();
              break;
            case 'categoryId':
            case 'category':
              if (!currentProduct.category || currentProduct.category === 'General') {
                currentProduct.category = textBuffer.trim();
              }
              break;
          }
        }

        // End of product - validate and save
        if (tagName === 'offer' && currentProduct) {
          currentProduct.externalId = `admitad_${currentProduct.id}`;
          
          // Validate product
          const isValid = 
            currentProduct.title && 
            currentProduct.title.trim() !== '' &&
            currentProduct.affiliate_link && 
            currentProduct.affiliate_link.trim() !== '' &&
            currentProduct.price > 0;

          if (isValid) {
            // PAGINATION: Skip products based on offset
            if (productsSkipped < IMPORT_OFFSET) {
              productsSkipped++;
              currentProduct = {};
              return;
            }
            
            products.push(currentProduct);
            
            // SAFETY BREAK: Stop at limit
            if (products.length >= MAX_PRODUCTS) {
              console.log(`⛔ LIMIT REACHED — aborting stream...`);
              
              // CRITICAL: Stop HTTP download immediately
              abortController.abort();  // Stop axios request
              if (stream) {
                stream.destroy();         // Force close stream
              }
              parser.end();               // Stop parser
              
              resolve(products);          // Return collected products
              return;
            }
            
            // Reduced log spam - only every 50 products
            if (products.length % 50 === 0) {
              const totalProcessed = productsSkipped + products.length;
              console.log(`📦 Progress: ${products.length}/${MAX_PRODUCTS} products (${totalProcessed} total processed)`);
            }
          }
          
          currentProduct = {};
        }
        
        textBuffer = '';
      });

      parser.on('end', () => {
        console.log(`✅ Streaming complete: ${products.length} valid products`);
        resolve(products);
      });

      parser.on('error', (error: any) => {
        console.error('❌ SAX parsing error:', error.message);
        reject(error);
      });

      // Fetch and stream XML with abort signal
      axios.get(url, {
        responseType: 'stream',
        signal: abortController.signal,  // Add abort signal
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProductImporter/1.0)'
        }
      })
      .then(response => {
        console.log('✅ Feed stream started, parsing XML...');
        stream = response.data;  // Store stream reference
        stream.pipe(parser);     // Connect stream to parser
      })
      .catch(error => {
        // Handle abort cleanly (expected when limit reached)
        if (error.name === 'CanceledError' || error.message === 'canceled') {
          console.log('✅ Stream aborted successfully');
          resolve(products);
          return;
        }
        
        console.error('❌ Error fetching Admitad feed:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
        }
        reject(error);
      });
    });

  } catch (error: any) {
    console.error('❌ Error in fetchAdmitadFeed:', error.message);
    return [];
  }
}
