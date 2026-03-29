// Commission Service - Handle commission calculations and payments
import walletService from './walletService';

interface CommissionData {
  userId: string;
  amount: number;
  source: string;
  description?: string;
  metadata?: any;
}

/**
 * Calculate commission based on percentage
 */
export function calculateCommission(amount: number, percentage: number): number {
  if (percentage < 0 || percentage > 100) {
    throw new Error('Commission percentage must be between 0 and 100');
  }
  return (amount * percentage) / 100;
}

/**
 * Add commission to user wallet
 */
export async function addCommission(data: CommissionData) {
  const { userId, amount, source, description, metadata } = data;

  if (amount <= 0) {
    throw new Error('Commission amount must be greater than 0');
  }

  console.log('💰 Adding commission:', {
    userId,
    amount,
    source
  });

  // Add commission to wallet
  const result = await walletService.addCommission(
    userId,
    amount,
    description || `Commission from ${source}`,
    {
      source,
      ...metadata
    }
  );

  console.log('✅ Commission added successfully');
  console.log('💼 New balance:', result.wallet.balance);

  return result;
}

/**
 * Process affiliate commission
 * Example: User earns commission when someone purchases through their link
 */
export async function processAffiliateCommission(
  userId: string,
  saleAmount: number,
  commissionRate: number,
  productId?: string
) {
  const commissionAmount = calculateCommission(saleAmount, commissionRate);

  return addCommission({
    userId,
    amount: commissionAmount,
    source: 'affiliate',
    description: `Affiliate commission (${commissionRate}% of ${saleAmount} XAF)`,
    metadata: {
      saleAmount,
      commissionRate,
      productId
    }
  });
}

/**
 * Process referral commission
 * Example: User earns commission when they refer someone
 */
export async function processReferralCommission(
  userId: string,
  referredUserId: string,
  commissionAmount: number
) {
  return addCommission({
    userId,
    amount: commissionAmount,
    source: 'referral',
    description: `Referral commission for user ${referredUserId}`,
    metadata: {
      referredUserId
    }
  });
}

/**
 * Process content monetization commission
 * Example: User earns commission from content views/clicks
 */
export async function processContentCommission(
  userId: string,
  contentId: string,
  commissionAmount: number,
  source: 'views' | 'clicks' | 'conversions'
) {
  return addCommission({
    userId,
    amount: commissionAmount,
    source: `content-${source}`,
    description: `Content commission from ${source}`,
    metadata: {
      contentId,
      source
    }
  });
}

export default {
  calculateCommission,
  addCommission,
  processAffiliateCommission,
  processReferralCommission,
  processContentCommission
};
