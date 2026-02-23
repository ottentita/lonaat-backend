import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

const ADMITAD_API_BASE = process.env.ADMITAD_API_BASE || 'https://api.admitad.com';

interface AdmitadToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface AdmitadProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url?: string;
  url: string;
  category?: string;
  commission_rate?: number;
  merchant?: string;
}

let cachedToken: AdmitadToken | null = null;
let tokenExpiresAt: number = 0;

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.ADMITAD_CLIENT_ID;
  const clientSecret = process.env.ADMITAD_CLIENT_SECRET;
  const existingToken = process.env.ADMITAD_ACCESS_TOKEN;

  if (existingToken) {
    return existingToken;
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken.access_token;
  }

  if (!clientId || !clientSecret) {
    throw new Error('Admitad credentials not configured');
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await axios.post<AdmitadToken>(
      `${ADMITAD_API_BASE}/token/`,
      'grant_type=client_credentials&scope=advcampaigns_for_website statistics manage_publisher_websites',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    cachedToken = response.data;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000;
    return response.data.access_token;
  } catch (error: any) {
    console.error('Admitad token error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Admitad');
  }
}

export async function searchAdmitadProducts(
  query: string,
  options: { limit?: number; offset?: number; category?: string; minPrice?: number; maxPrice?: number } = {}
): Promise<AdmitadProduct[]> {
  const token = await getAccessToken();
  const websiteId = process.env.ADMITAD_WEBSITE_ID;

  if (!websiteId) {
    console.warn('ADMITAD_WEBSITE_ID not configured, returning empty results');
    return [];
  }

  try {
    const params: Record<string, any> = {
      limit: options.limit || 20,
      offset: options.offset || 0,
      keyword: query
    };

    if (options.category) params.category = options.category;
    if (options.minPrice) params.price_from = options.minPrice;
    if (options.maxPrice) params.price_to = options.maxPrice;

    const response = await axios.get(`${ADMITAD_API_BASE}/coupons/website/${websiteId}/`, {
      params,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    const results = response.data?.results || [];
    
    return results.map((item: any) => ({
      id: String(item.id),
      name: item.name || item.campaign?.name || 'Unknown Product',
      description: item.description || item.short_name || '',
      price: Number(item.discount) || 0,
      currency: 'USD',
      image_url: item.image || item.campaign?.image || '',
      url: item.goto_link || item.frameset_link || '',
      category: item.categories?.[0]?.name || 'General',
      commission_rate: item.campaign?.action_type === 'sale' ? 5 : 2,
      merchant: item.campaign?.name || 'Admitad'
    }));
  } catch (error: any) {
    console.error('Admitad product search error:', error.response?.data || error.message);
    return [];
  }
}

export async function searchAliExpressProducts(
  query: string,
  options: { limit?: number; minPrice?: number; maxPrice?: number; category?: string } = {}
): Promise<AdmitadProduct[]> {
  const token = await getAccessToken();
  const websiteId = process.env.ADMITAD_WEBSITE_ID;

  if (!websiteId) {
    console.warn('ADMITAD_WEBSITE_ID not configured - returning empty results');
    return [];
  }

  try {
    const response = await axios.get(`${ADMITAD_API_BASE}/advcampaigns/website/${websiteId}/`, {
      params: {
        limit: 100,
        has_products: 1,
        keyword: 'aliexpress'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    const aliexpressCampaign = response.data?.results?.find((c: any) => 
      c.name?.toLowerCase().includes('aliexpress') || 
      c.site_url?.toLowerCase().includes('aliexpress')
    );

    if (!aliexpressCampaign) {
      console.log('AliExpress campaign not found in Admitad - returning empty results');
      return [];
    }

    const productsResponse = await axios.get(
      `${ADMITAD_API_BASE}/advcampaigns/${aliexpressCampaign.id}/products/`,
      {
        params: {
          limit: options.limit || 20,
          keyword: query
        },
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000
      }
    );

    const products = productsResponse.data?.results || [];
    
    return products.map((p: any) => ({
      id: String(p.id),
      name: p.name || p.title,
      description: p.description || '',
      price: Number(p.price) || 0,
      currency: p.currency || 'USD',
      image_url: p.image || p.picture,
      url: p.url || p.deeplink,
      category: p.category || 'General',
      commission_rate: Number(p.commission) || 3,
      merchant: 'AliExpress'
    }));
  } catch (error: any) {
    console.error('AliExpress search error:', error.response?.data || error.message);
    return [];
  }
}

export async function generateDeeplink(productUrl: string, userId: number): Promise<string> {
  const token = await getAccessToken();
  const websiteId = process.env.ADMITAD_WEBSITE_ID;

  if (!websiteId) {
    const clickId = crypto.randomBytes(16).toString('hex');
    await prisma.affiliateClick.create({
      data: {
        user_id: userId,
        network: 'admitad',
        click_id: clickId,
        product_url: productUrl
      }
    });
    return `${productUrl}${productUrl.includes('?') ? '&' : '?'}subid=${userId}&click_id=${clickId}`;
  }

  try {
    const response = await axios.get(`${ADMITAD_API_BASE}/deeplink/website/${websiteId}/advcampaign/`, {
      params: {
        ulp: productUrl,
        subid: String(userId)
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });

    const deeplink = response.data?.[0]?.deeplink;
    
    if (deeplink) {
      const clickId = crypto.randomBytes(16).toString('hex');
      await prisma.affiliateClick.create({
        data: {
          user_id: userId,
          network: 'admitad',
          click_id: clickId,
          product_url: productUrl
        }
      });
      return deeplink;
    }

    return productUrl;
  } catch (error: any) {
    console.error('Deeplink generation error:', error.response?.data || error.message);
    return productUrl;
  }
}

export async function handleAdmitadPostback(payload: any): Promise<{ success: boolean; message: string }> {
  try {
    const {
      order_id,
      action_id,
      subid,
      subid1,
      payment,
      currency,
      status,
      campaign_id,
      advcampaign_name
    } = payload;

    const userId = parseInt(subid || subid1) || 0;
    
    if (!userId) {
      return { success: false, message: 'Invalid user ID in postback' };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const externalRef = order_id || action_id || `admitad_${Date.now()}`;
    
    const existing = await prisma.commission.findFirst({
      where: { external_ref: externalRef, network: 'admitad' }
    });

    if (existing) {
      if (status === 'approved' && existing.status !== 'paid_by_network') {
        await prisma.commission.update({
          where: { id: existing.id },
          data: { 
            status: 'paid_by_network',
            paid_at: new Date()
          }
        });
      }
      return { success: true, message: 'Commission updated' };
    }

    const amount = Number(payment) || 0;
    const commissionStatus = status === 'approved' ? 'paid_by_network' : 'pending';

    await prisma.commission.create({
      data: {
        user_id: userId,
        network: 'admitad',
        amount,
        status: commissionStatus,
        external_ref: externalRef,
        webhook_data: JSON.stringify(payload),
        paid_at: commissionStatus === 'paid_by_network' ? new Date() : null
      }
    });

    // Affiliate click tracking model not present in current schema - skip updating clicks

    return { success: true, message: 'Commission recorded' };
  } catch (error: any) {
    console.error('Admitad postback error:', error);
    return { success: false, message: error.message };
  }
}

export async function initializeAdmitadNetworks(): Promise<void> {
  try {
    // affiliateNetwork model is not included in the local Prisma schema; nothing to initialize here
    console.log('Admitad networks initialization skipped (no affiliateNetwork model)');
  } catch (error) {
    console.error('Failed to initialize Admitad networks:', error);
  }
}

export async function getAdmitadStatus(): Promise<{
  configured: boolean;
  hasToken: boolean;
  hasWebsite: boolean;
  error?: string;
}> {
  const hasClientId = !!process.env.ADMITAD_CLIENT_ID;
  const hasClientSecret = !!process.env.ADMITAD_CLIENT_SECRET;
  const hasToken = !!process.env.ADMITAD_ACCESS_TOKEN;
  const hasWebsite = !!process.env.ADMITAD_WEBSITE_ID;

  const configured = (hasClientId && hasClientSecret) || hasToken;

  return {
    configured,
    hasToken: hasToken || (hasClientId && hasClientSecret),
    hasWebsite,
    error: !configured ? 'Admitad credentials not configured' : (!hasWebsite ? 'Website ID not configured' : undefined)
  };
}
