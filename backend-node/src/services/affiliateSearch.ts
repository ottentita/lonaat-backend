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
    const response = await axios.get(
      "https://www.digistore24.com/api/v1/products",
      {
        params: { search: query },
        headers: {
          "X-DS-API-KEY": apiKey
        }
      }
    );

    return (response.data.products || []).map((p: any) => ({
      name: p.name || p.title,
      description: p.description || "",
      price: p.price || "0",
      network: "digistore24",
      affiliate_link: p.affiliate_link || p.url,
      image_url: p.image_url || null,
      category: p.category || null
    }));
  } catch (error: any) {
    console.error("Digistore24 API error:", error.message);
    return getMockOffers("digistore24", query);
  }
}

async function searchAwin(query: string) {
  const token = process.env.AWIN_TOKEN;

  if (!token) {
    return getMockOffers("awin", query);
  }

  try {
    const response = await axios.get(
      "https://api.awin.com/publishers/2651300/programmes",
      {
        params: {
          relationship: "joined",
          countryCode: "US"
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const programs = response.data || [];
    const filtered = programs.filter((p: any) => 
      p.name?.toLowerCase().includes(query.toLowerCase()) ||
      p.primarySector?.name?.toLowerCase().includes(query.toLowerCase())
    );

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

export async function rankOffers(offers: any[]) {
  return offers;
}
