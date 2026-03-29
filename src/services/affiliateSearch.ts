import axios from "axios";
import { searchAdmitadProducts, searchAliExpressProducts } from "./admitadService";

const DISABLED_NETWORKS = ['partnerstack'];

export async function searchAffiliateOffers(
  network: string,
  query: string
) {
  const networkLower = network.toLowerCase();
  
  if (DISABLED_NETWORKS.includes(networkLower)) {
    throw new Error(`Network "${network}" is currently disabled`);
  }
  
  switch (networkLower) {
    case "digistore24":
      return searchDigistore24(query);
    case "awin":
      return searchAwin(query);
    case "mylead":
      return searchMyLead(query);
    case "admitad":
      return searchAdmitad(query);
    case "aliexpress":
      return searchAliExpress(query);
    case "all":
      return searchAllNetworks(query);
    default:
      throw new Error("Unsupported affiliate network");
  }
}

async function searchAdmitad(query: string) {
  try {
    const products = await searchAdmitadProducts(query);
    return products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price ? Number(p.price) : null,
      commission: p.commission_rate ? Number(p.commission_rate) : null,
      network: 'admitad',
      category: p.category,
      image_url: p.image_url,
      affiliate_link: p.url,
      merchant: p.merchant
    }));
  } catch (error) {
    console.error('Admitad search error:', error);
    return [];
  }
}

async function searchAliExpress(query: string) {
  try {
    const products = await searchAliExpressProducts(query);
    return products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price ? Number(p.price) : null,
      commission: p.commission_rate ? Number(p.commission_rate) : null,
      network: 'aliexpress',
      category: p.category,
      image_url: p.image_url,
      affiliate_link: p.url,
      merchant: 'AliExpress'
    }));
  } catch (error) {
    console.error('AliExpress search error:', error);
    return [];
  }
}

export function getDisabledNetworks() {
  return DISABLED_NETWORKS;
}

async function searchDigistore24(query: string) {
  const { digistore } = require('../config/affiliateConfig');
  const apiKey = digistore.apiKey;

  if (!apiKey) {
    console.warn('DIGISTORE_API_KEY not configured'); // check affiliateConfig for values
    return [];
  }

  try {
    const response = await axios.get(
      "https://www.digistore24.com/api/call/listProducts",
      {
        params: { search: query, limit: 20 },
        headers: {
          "X-DS-API-KEY": apiKey,
          "Accept": "application/json"
        },
        timeout: 15000
      }
    );

    const products = response.data?.data?.products || response.data?.products || [];
    
    return products.map((p: any) => ({
      id: String(p.product_id || p.id),
      name: p.product_name || p.name,
      description: p.description || "",
      price: p.price ? Number(p.price) : null,
      commission: p.commission_percent ? Number(p.commission_percent) : 50,
      network: "digistore24",
      affiliate_link: p.affiliate_link || p.salespage_url || null,
      image_url: p.image_url || null,
      category: p.category || "Digital Products",
      merchant: "Digistore24"
    }));
  } catch (error: any) {
    console.error("Digistore24 API error:", error.message);
    return [];
  }
}

async function searchAwin(query: string) {
  const token = process.env.AWIN_TOKEN;
  const publisherId = process.env.AWIN_PUBLISHER_ID;

  if (!token || !publisherId) {
    console.warn('AWIN_TOKEN or AWIN_PUBLISHER_ID not configured');
    return [];
  }

  try {
    const response = await axios.get(
      `https://api.awin.com/publishers/${publisherId}/programmes`,
      {
        params: {
          relationship: "joined",
          countryCode: "US"
        },
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 10000
      }
    );

    const programs = response.data || [];
    
    if (!Array.isArray(programs) || programs.length === 0) {
      return [];
    }

    const filtered = programs.filter((p: any) => 
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.primarySector?.name?.toLowerCase().includes(query.toLowerCase())
    );

    const results = filtered.length > 0 ? filtered : programs;

    return results.slice(0, 20).map((p: any) => ({
      id: String(p.id || p.programmeId),
      name: p.name,
      description: p.description || "",
      price: null,
      commission: p.commissionRange?.min ? Number(p.commissionRange.min) : null,
      network: "awin",
      affiliate_link: p.clickThroughUrl || null,
      image_url: p.logoUrl || null,
      category: p.primarySector?.name || null,
      merchant: p.name
    }));
  } catch (error: any) {
    console.error("Awin API error:", error.message);
    return [];
  }
}

async function searchMyLead(_query: string) {
  throw new Error('MyLead is a CPA-only network and does not support product imports. Use MyLead for conversion tracking only.');
}

export async function searchAllNetworks(query: string) {
  const results: any[] = [];
  
  const [digistoreOffers, awinOffers, admitadOffers, aliexpressOffers] = await Promise.allSettled([
    searchDigistore24(query),
    searchAwin(query),
    searchAdmitad(query),
    searchAliExpress(query)
  ]);

  if (digistoreOffers.status === 'fulfilled' && digistoreOffers.value?.length) {
    results.push(...digistoreOffers.value);
  }
  if (awinOffers.status === 'fulfilled' && awinOffers.value?.length) {
    results.push(...awinOffers.value);
  }
  if (admitadOffers.status === 'fulfilled' && admitadOffers.value?.length) {
    results.push(...admitadOffers.value);
  }
  if (aliexpressOffers.status === 'fulfilled' && aliexpressOffers.value?.length) {
    results.push(...aliexpressOffers.value);
  }

  return results;
}

export async function rankOffers(offers: any[]) {
  return offers;
}
