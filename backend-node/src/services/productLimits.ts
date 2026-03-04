import { prisma } from '../prisma';

interface ProductLimitInfo {
  current_count: number;
  max_products: number | null;
  is_unlimited: boolean;
  can_create: boolean;
  remaining: number | null;
  usage_percent: number;
  plan_name: string | null;
  requires_upgrade: boolean;
}

const FREE_PRODUCT_LIMIT = 5;
const BASIC_PRODUCT_LIMIT = 50;

export async function getUserProductLimit(userId: number): Promise<ProductLimitInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_admin: true, role: true }
  });

  if (!user) {
    return {
      current_count: 0,
      max_products: 0,
      is_unlimited: false,
      can_create: false,
      remaining: 0,
      usage_percent: 100,
      plan_name: null,
      requires_upgrade: true
    };
  }

  if (user.is_admin || user.role === 'admin') {
    const productCount = await prisma.product.count({
      where: { user_id: userId, is_active: true }
    });

    return {
      current_count: productCount,
      max_products: null,
      is_unlimited: true,
      can_create: true,
      remaining: null,
      usage_percent: 0,
      plan_name: 'Admin',
      requires_upgrade: false
    };
  }

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      user_id: userId,
      status: 'active',
      OR: [
        { expires_at: null },
        { expires_at: { gt: new Date() } }
      ]
    },
    include: { plan: true },
    orderBy: { started_at: 'desc' }
  });

  const productCount = await prisma.product.count({
    where: { user_id: userId, is_active: true }
  });

  let maxProducts: number | null = FREE_PRODUCT_LIMIT;
  let planName: string | null = 'Free';
  let isUnlimited = false;

  if (activeSubscription && activeSubscription.plan) {
    const plan = activeSubscription.plan;
    planName = plan.name;

    if (plan.max_products === null || plan.max_products === 0 || plan.max_products < 0 || plan.max_products >= 999999) {
      isUnlimited = true;
      maxProducts = null;
    } else {
      maxProducts = plan.max_products;
    }
  }

  const canCreate = isUnlimited || productCount < (maxProducts || 0);
  const remaining = isUnlimited ? null : Math.max(0, (maxProducts || 0) - productCount);
  const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((productCount / (maxProducts || 1)) * 100));

  return {
    current_count: productCount,
    max_products: maxProducts,
    is_unlimited: isUnlimited,
    can_create: canCreate,
    remaining,
    usage_percent: usagePercent,
    plan_name: planName,
    requires_upgrade: !canCreate && !isUnlimited
  };
}

export async function checkProductCreationAllowed(userId: number): Promise<{ allowed: boolean; error?: string; limit_info: ProductLimitInfo }> {
  const limitInfo = await getUserProductLimit(userId);

  if (!limitInfo.can_create) {
    return {
      allowed: false,
      error: `You have reached your product limit (${limitInfo.current_count}/${limitInfo.max_products}). Upgrade your plan to add more products.`,
      limit_info: limitInfo
    };
  }

  return {
    allowed: true,
    limit_info: limitInfo
  };
}

export async function getSubscriptionPlansForUpgrade(): Promise<any[]> {
  const plans = await prisma.plan.findMany({
    where: { is_active: true },
    orderBy: { price: 'asc' }
  });

  return plans.map(plan => {
    const isUnlimitedPlan = plan.max_products === null || 
                           plan.max_products === 0 || 
                           (plan.max_products !== null && plan.max_products < 0) || 
                           (plan.max_products !== null && plan.max_products >= 999999);
    
    return {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      duration_days: plan.duration_days,
      max_products: isUnlimitedPlan ? 'Unlimited' : plan.max_products,
      features: plan.features
    };
  });
}
