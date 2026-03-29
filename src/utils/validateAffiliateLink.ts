/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * AFFILIATE LINK VALIDATION UTILITY
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Validates affiliate links before storing in database
 * Ensures only working, accessible links are saved
 */

/**
 * Validates an affiliate link by checking if it's accessible
 * 
 * @param url - The affiliate link URL to validate
 * @returns Promise<boolean> - true if valid, false otherwise
 */
export async function validateAffiliateLink(url: string): Promise<boolean> {
  console.log('🔍 Validating affiliate link:', url);
  
  // Basic validation
  if (!url || typeof url !== 'string') {
    console.log('❌ Invalid URL: empty or not a string');
    return false;
  }

  // Check if URL is properly formatted
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.log('❌ Invalid protocol:', urlObj.protocol);
      return false;
    }
  } catch (error) {
    console.log('❌ Malformed URL:', error);
    return false;
  }

  // Check if URL is accessible
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeoutId);

    // Accept 200 (OK), 301 (Moved Permanently), 302 (Found), 307 (Temporary Redirect), 308 (Permanent Redirect)
    const validStatuses = [200, 301, 302, 307, 308];
    const isValid = validStatuses.includes(res.status);

    if (isValid) {
      console.log('✅ Valid affiliate link - Status:', res.status);
    } else {
      console.log('❌ Invalid affiliate link - Status:', res.status);
    }

    return isValid;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('❌ Request timeout - URL took too long to respond');
    } else {
      console.log('❌ Network error:', error.message);
    }
    return false;
  }
}

/**
 * Validates multiple affiliate links in batch
 * 
 * @param urls - Array of URLs to validate
 * @returns Promise<{url: string, valid: boolean}[]>
 */
export async function validateAffiliateLinks(urls: string[]): Promise<{url: string, valid: boolean}[]> {
  console.log(`🔍 Batch validating ${urls.length} affiliate links...`);
  
  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      valid: await validateAffiliateLink(url)
    }))
  );

  const validCount = results.filter(r => r.valid).length;
  console.log(`✅ Validation complete: ${validCount}/${urls.length} valid links`);

  return results;
}

/**
 * Quick URL format check without network request
 * 
 * @param url - URL to check
 * @returns boolean - true if format is valid
 */
export function isValidUrlFormat(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}
