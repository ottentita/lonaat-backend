import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export interface SubscriptionRequest extends Request {
  user?: AuthRequest['user'];
}

// Middleware to check if user has Pro plan
export function requireProPlan(req: SubscriptionRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.plan !== 'pro') {
    return res.status(403).json({ 
      error: 'Pro plan required',
      message: 'This feature is only available to Pro subscribers',
      upgradeUrl: '/pricing'
    });
  }

  next();
}

// Middleware to check feature access based on plan
export function checkFeatureAccess(feature: string) {
  return (req: SubscriptionRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPlan = req.user.plan;
    const isPro = userPlan === 'pro';

    // Define feature access rules
    const featureAccess: Record<string, { free: boolean; pro: boolean }> = {
      'ai_automation': { free: false, pro: true },
      'unlimited_products': { free: false, pro: true },
      'advanced_analytics': { free: false, pro: true },
      'api_access': { free: false, pro: true },
      'custom_templates': { free: false, pro: true },
      'priority_support': { free: false, pro: true },
      'basic_ai': { free: true, pro: true },
      'limited_products': { free: true, pro: true },
      'basic_analytics': { free: true, pro: true }
    };

    const access = featureAccess[feature];
    if (!access) {
      return res.status(400).json({ error: 'Invalid feature specified' });
    }

    if (!isPro && !access.free) {
      return res.status(403).json({ 
        error: 'Pro plan required',
        message: `${feature} is only available to Pro subscribers`,
        upgradeUrl: '/pricing'
      });
    }

    next();
  };
}

// Helper function to check if a user can access a feature
export function canAccessFeature(userPlan: string, feature: string): boolean {
  const featureAccess: Record<string, { free: boolean; pro: boolean }> = {
    'ai_automation': { free: false, pro: true },
    'unlimited_products': { free: false, pro: true },
    'advanced_analytics': { free: false, pro: true },
    'api_access': { free: false, pro: true },
    'custom_templates': { free: false, pro: true },
    'priority_support': { free: false, pro: true },
    'basic_ai': { free: true, pro: true },
    'limited_products': { free: true, pro: true },
    'basic_analytics': { free: true, pro: true }
  };

  const access = featureAccess[feature];
  if (!access) return false;

  if (userPlan === 'pro') return access.pro;
  return access.free;
}

// Middleware to check AI usage limits
export function checkAIUsageLimit(req: SubscriptionRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Pro users have unlimited usage
  if (req.user.plan === 'pro') {
    return next();
  }

  // Free users have limited usage (100 tokens per month)
  // This would be implemented with actual usage tracking
  // For now, we'll just allow it
  next();
}
