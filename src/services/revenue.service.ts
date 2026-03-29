import prisma from '../prisma';

export interface RevenueMetrics {
  monthlyRevenue: number;
  activeSubscribers: number;
  conversionRate: number;
  totalRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
  projectedMonthlyRevenue: number;
}

export interface SubscriberGrowth {
  date: string;
  subscribers: number;
  revenue: number;
}

export class RevenueService {
  /**
   * Get comprehensive revenue metrics
   */
  static async getRevenueMetrics(): Promise<RevenueMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    try {
      // Get active Pro subscribers
      const activeSubscribers = await prisma.user.count({
        where: {
          plan: 'pro',
          is_active: true,
          subscriptionEndsAt: {
            gt: now
          }
        }
      });

      // Get monthly revenue from subscriptions
      const monthlySubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'active',
          startedAt: {
            gte: startOfMonth,
            lt: endOfMonth
          }
        },
        include: {
          plan: true
        }
      });

      const monthlyRevenue = monthlySubscriptions.reduce((total, sub) => {
        return total + (sub.plan?.price.toNumber() || 19.99);
      }, 0);

      // Get total revenue (all time)
      const totalSubscriptions = await prisma.subscription.findMany({
        where: { status: 'active' },
        include: { plan: true }
      });

      const totalRevenue = totalSubscriptions.reduce((total, sub) => {
        return total + (sub.plan?.price.toNumber() || 19.99);
      }, 0);

      // Get total users for conversion rate calculation
      const totalUsers = await prisma.user.count({
        where: { is_active: true }
      });

      // Calculate conversion rate (Pro users / Total users)
      const conversionRate = totalUsers > 0 ? (activeSubscribers / totalUsers) * 100 : 0;

      // Calculate average revenue per user (ARPU)
      const averageRevenuePerUser = activeSubscribers > 0 ? monthlyRevenue / activeSubscribers : 0;

      // Projected monthly revenue (current subscribers * $19.99)
      const projectedMonthlyRevenue = activeSubscribers * 19.99;

      // Calculate churn rate (simplified - users who ended subscription this month)
      const churnedUsers = await prisma.user.count({
        where: {
          plan: 'pro',
          subscriptionEndsAt: {
            gte: startOfMonth,
            lt: endOfMonth
          }
        }
      });

      const churnRate = activeSubscribers > 0 ? (churnedUsers / (activeSubscribers + churnedUsers)) * 100 : 0;

      return {
        monthlyRevenue,
        activeSubscribers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue,
        churnRate: Math.round(churnRate * 100) / 100,
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
        projectedMonthlyRevenue
      };
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      
      // Return default values on error
      return {
        monthlyRevenue: 0,
        activeSubscribers: 0,
        conversionRate: 0,
        totalRevenue: 0,
        churnRate: 0,
        averageRevenuePerUser: 0,
        projectedMonthlyRevenue: 0
      };
    }
  }

  /**
   * Get subscriber growth data for the last 6 months
   */
  static async getSubscriberGrowth(): Promise<SubscriberGrowth[]> {
    const growthData: SubscriberGrowth[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      try {
        const subscribers = await prisma.user.count({
          where: {
            plan: 'pro',
            is_active: true,
            created_at: {
              lte: endDate
            }
          }
        });

        const subscriptions = await prisma.subscription.findMany({
          where: {
            status: 'active',
            startedAt: {
              gte: date,
              lt: endDate
            }
          },
          include: { plan: true }
        });

        const revenue = subscriptions.reduce((total, sub) => {
          return total + (sub.plan?.price.toNumber() || 19.99);
        }, 0);

        growthData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          subscribers,
          revenue
        });
      } catch (error) {
        console.error(`Error fetching growth data for ${date}:`, error);
        growthData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          subscribers: 0,
          revenue: 0
        });
      }
    }

    return growthData;
  }

  /**
   * Get recent subscription activity
   */
  static async getRecentActivity(limit: number = 10) {
    try {
      const recentSubscriptions = await prisma.subscription.findMany({
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          plan: true
        }
      });

      return recentSubscriptions.map(sub => ({
        id: sub.id,
        userName: sub.user?.name || sub.user?.email || 'Unknown',
        plan: sub.plan?.name || 'Pro',
        price: sub.plan?.price.toNumber() || 19.99,
        startedAt: sub.startedAt,
        status: sub.status
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Get plan distribution
   */
  static async getPlanDistribution() {
    try {
      const planCounts = await prisma.user.groupBy({
        by: ['plan'],
        where: { is_active: true },
        _count: {
          plan: true
        }
      });

      return planCounts.map(item => ({
        plan: item.plan,
        count: item?._count?.plan ?? 0,
        percentage: 0 // Will be calculated on frontend
      }));
    } catch (error) {
      console.error('Error fetching plan distribution:', error);
      return [
        { plan: 'free', count: 0, percentage: 0 },
        { plan: 'pro', count: 0, percentage: 0 }
      ];
    }
  }
}
