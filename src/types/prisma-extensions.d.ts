import '@prisma/client';

declare module '@prisma/client' {
  // Add commonly-referenced but missing model properties as permissive any types
  interface PrismaClient {
    affiliateClick?: any;
    auditLog?: any;
    payout?: any;
    payoutMethod?: any;
    withdrawalRequest?: any;
    withdrawal_requests?: any;
    socialPost?: any;
    socialAccount?: any;
    walletBalance?: any;
    aIJob?: any;
    notification?: any;
    adBoost?: any;
    subscription?: any;
    plan?: any;
    walletBalance?: any;
  }

  // Loosen specific model field types used as JSON blobs in code
  interface Product {
    extra_data?: any;
  }

  interface Commission {
    webhook_data?: any;
  }

  interface User {
    // legacy fields present in older code; keep optional so TypeScript accepts them
    is_admin?: boolean;
    is_blocked?: boolean;
    fraud_score?: number;
    referred_by?: string | null;
    referral_code?: string | null;
    last_ip?: string | null;
    created_at?: Date;
  }
}
