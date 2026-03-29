/**
 * SYSTEM REGISTRY
 * Central source of truth for all system modules
 * Used by AI agents to prevent duplication
 */

export interface ServiceEntry {
  file: string;
  path: string;
}

export interface SystemRegistry {
  services: {
    products: ServiceEntry;
    affiliate: ServiceEntry;
    tokens: ServiceEntry;
    ai: ServiceEntry;
  };
  routes: {
    products: string;
    wallet: string;
    analytics: string;
  };
}

/**
 * SOURCE OF TRUTH SERVICES
 * These are the ONLY implementations allowed
 */
export const SYSTEM_REGISTRY: SystemRegistry = {
  services: {
    products: {
      file: "productImporter.ts",
      path: "src/services/productImporter.ts"
    },
    affiliate: {
      file: "realAffiliateConnector.ts",
      path: "src/services/realAffiliateConnector.ts"
    },
    tokens: {
      file: "token.service.ts",
      path: "src/services/token.service.ts"
    },
    ai: {
      file: "ai.manager.ts",
      path: "src/services/ai.manager.ts"
    }
  },
  routes: {
    products: "/api/products",
    wallet: "/api/wallet",
    analytics: "/api/analytics"
  }
};

/**
 * Get service by name
 */
export function getService(name: string): ServiceEntry | undefined {
  return SYSTEM_REGISTRY.services[name as keyof typeof SYSTEM_REGISTRY.services];
}

/**
 * Check if service exists
 */
export function serviceExists(name: string): boolean {
  return name in SYSTEM_REGISTRY.services;
}

/**
 * Check if route path exists
 */
export function routeExists(path: string): boolean {
  return Object.values(SYSTEM_REGISTRY.routes).includes(path);
}
