import axios from "axios";

export async function searchAffiliateOffers(
  network: string,
  query: string
) {
  switch (network.toLowerCase()) {
    case "digistore24":
      return searchDigistore24(query);
    case "awin":
      return searchAwin(query);
    case "mylead":
      return searchMyLead(query);
    case "partnerstack":
      return searchPartnerStack(query);
    case "all":
      return searchAllNetworks(query);
    default:
      throw new Error("Unsupported affiliate network");
  }
}

async function searchDigistore24(query: string) {
  const apiKey = process.env.DIGISTORE_API_KEY;

  if (!apiKey) {
    return getMockOffers("digistore24", query);
  }

  try {
    // Digistore24 API is vendor-focused, use getUserInfo to verify connection
    const response = await axios.get(
      "https://www.digistore24.com/api/call/getUserInfo",
      {
        headers: {
          "X-DS-API-KEY": apiKey,
          "Accept": "application/json"
        }
      }
    );

    // If API works, return mock offers (Digistore24 doesn't have public product catalog API)
    // Real affiliate links would be configured manually per product
    if (response.data) {
      return getMockOffers("digistore24", query);
    }
    return getMockOffers("digistore24", query);
  } catch (error: any) {
    console.error("Digistore24 API error:", error.message);
    return getMockOffers("digistore24", query);
  }
}

async function searchAwin(query: string) {
  const token = process.env.AWIN_TOKEN;
  const publisherId = process.env.AWIN_PUBLISHER_ID;

  if (!token || !publisherId) {
    return getMockOffers("awin", query);
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
      return getMockOffers("awin", query);
    }

    const filtered = programs.filter((p: any) => 
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.primarySector?.name?.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      // Return all programs if no match found
      return programs.slice(0, 10).map((p: any) => ({
        name: p.name,
        description: p.description || "",
        price: null,
        network: "awin",
        affiliate_link: p.clickThroughUrl || null,
        image_url: p.logoUrl || null,
        category: p.primarySector?.name || null
      }));
    }

    return filtered.slice(0, 20).map((p: any) => ({
      name: p.name,
      description: p.description || "",
      price: null,
      network: "awin",
      affiliate_link: p.clickThroughUrl || null,
      image_url: p.logoUrl || null,
      category: p.primarySector?.name || null
    }));
  } catch (error: any) {
    console.error("Awin API error:", error.message);
    return getMockOffers("awin", query);
  }
}

async function searchMyLead(query: string) {
  const apiKey = process.env.MYLEAD_API_KEY;

  if (!apiKey) {
    return getMockOffers("mylead", query);
  }

  try {
    const response = await axios.get(
      "https://api.mylead.global/v1/offers",
      {
        params: { search: query },
        headers: {
          "X-Api-Key": apiKey
        }
      }
    );

    return (response.data.offers || []).map((p: any) => ({
      name: p.name || p.title,
      description: p.description || "",
      price: p.payout || "0",
      network: "mylead",
      affiliate_link: p.tracking_url || p.url,
      image_url: p.image || null,
      category: p.category || null
    }));
  } catch (error: any) {
    console.error("MyLead API error:", error.message);
    return getMockOffers("mylead", query);
  }
}

function getMockOffers(network: string, query: string) {
  return [
    {
      name: `${query} Pro`,
      description: `High-converting ${network} affiliate offer`,
      price: "49",
      network,
      affiliate_link: null,
      image_url: null,
      category: "Digital Products"
    },
    {
      name: `${query} Plus`,
      description: `Premium ${network} affiliate product`,
      price: "79",
      network,
      affiliate_link: null,
      image_url: null,
      category: "Digital Products"
    },
    {
      name: `${query} Elite`,
      description: `Top-tier ${network} affiliate program`,
      price: "149",
      network,
      affiliate_link: null,
      image_url: null,
      category: "Digital Products"
    }
  ];
}

async function searchPartnerStack(query: string) {
  const apiKey = process.env.PARTNERSTACK_API_KEY;

  if (!apiKey) {
    return getMockOffers("partnerstack", query);
  }

  try {
    const response = await axios.get(
      "https://api.partnerstack.com/api/v2/partnerships",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const partnerships = response.data?.data || [];
    const filtered = partnerships.filter((p: any) =>
      p.partner?.name?.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, 20).map((p: any) => ({
      name: p.partner?.name || "PartnerStack Product",
      description: p.partner?.description || "",
      price: null,
      network: "partnerstack",
      affiliate_link: p.tracking_link || null,
      image_url: p.partner?.logo_url || null,
      category: "SaaS"
    }));
  } catch (error: any) {
    console.error("PartnerStack API error:", error.message);
    return getMockOffers("partnerstack", query);
  }
}

export async function searchAllNetworks(query: string) {
  const results: any[] = [];
  
  const [digistoreOffers, awinOffers, myleadOffers, partnerstackOffers] = await Promise.allSettled([
    searchDigistore24(query),
    searchAwin(query),
    searchMyLead(query),
    searchPartnerStack(query)
  ]);

  if (digistoreOffers.status === 'fulfilled' && digistoreOffers.value?.length) {
    results.push(...digistoreOffers.value);
  }
  if (awinOffers.status === 'fulfilled' && awinOffers.value?.length) {
    results.push(...awinOffers.value);
  }
  if (myleadOffers.status === 'fulfilled' && myleadOffers.value?.length) {
    results.push(...myleadOffers.value);
  }
  if (partnerstackOffers.status === 'fulfilled' && partnerstackOffers.value?.length) {
    results.push(...partnerstackOffers.value);
  }

  return results;
}

export async function rankOffers(offers: any[]) {
  return offers;
}
