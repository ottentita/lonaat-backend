export interface NetworkConfig {
  key: string;
  name: string;
  supportsProducts: boolean;
  supportsCPA: boolean;
  description: string;
}

export const AFFILIATE_NETWORKS: Record<string, NetworkConfig> = {
  admitad: {
    key: "admitad",
    name: "Admitad",
    supportsProducts: true,
    supportsCPA: true,
    description: "Product feed with CPA tracking"
  },
  aliexpress: {
    key: "aliexpress",
    name: "AliExpress",
    supportsProducts: true,
    supportsCPA: false,
    description: "Product feed marketplace"
  },
  awin: {
    key: "awin",
    name: "AWIN",
    supportsProducts: true,
    supportsCPA: true,
    description: "Product feed with CPA tracking"
  },
  digistore24: {
    key: "digistore24",
    name: "Digistore24",
    supportsProducts: true,
    supportsCPA: true,
    description: "Digital products marketplace"
  },
  mylead: {
    key: "mylead",
    name: "MyLead",
    supportsProducts: false,
    supportsCPA: true,
    description: "CPA offers only - no product imports"
  },
  partnerstack: {
    key: "partnerstack",
    name: "PartnerStack",
    supportsProducts: true,
    supportsCPA: true,
    description: "SaaS affiliate programs"
  }
};

export function getProductNetworks(): NetworkConfig[] {
  return Object.values(AFFILIATE_NETWORKS).filter(n => n.supportsProducts);
}

export function getCPANetworks(): NetworkConfig[] {
  return Object.values(AFFILIATE_NETWORKS).filter(n => n.supportsCPA);
}

export function getNetwork(key: string): NetworkConfig | undefined {
  return AFFILIATE_NETWORKS[key.toLowerCase()];
}

export function canImportProducts(network: string): boolean {
  const config = getNetwork(network);
  return config?.supportsProducts ?? false;
}
