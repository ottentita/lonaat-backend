import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';

const router = Router();


router.get('/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.isAdmin;
    const userId = req.user!.id;

    const propertyWhere = isAdmin ? {} : { user_id: userId };
    
    const [
      totalProperties,
      activeProperties,
      pendingProperties,
      soldProperties,
      totalViews,
      totalInquiries,
      byType,
      byStatus,
      recentProperties
    ] = await Promise.all([
      prisma.realEstateProperty.count({ where: propertyWhere }),
      prisma.realEstateProperty.count({ where: { ...propertyWhere, status: 'approved', is_active: true } }),
      prisma.realEstateProperty.count({ where: { ...propertyWhere, status: 'pending' } }),
      prisma.realEstateProperty.count({ where: { ...propertyWhere, status: 'sold' } }),
      prisma.realEstateProperty.aggregate({
        where: propertyWhere,
        _sum: { views_count: true }
      }),
      prisma.realEstateProperty.aggregate({
        where: propertyWhere,
        _sum: { inquiries_count: true }
      }),
      prisma.realEstateProperty.groupBy({
        by: ['property_type'],
        where: propertyWhere,
        _count: true
      }),
      prisma.realEstateProperty.groupBy({
        by: ['status'],
        where: propertyWhere,
        _count: true
      }),
      prisma.realEstateProperty.findMany({
        where: propertyWhere,
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          property_type: true,
          price: true,
          status: true,
          views_count: true,
          created_at: true
        }
      })
    ]);

    res.json({
      total_properties: totalProperties,
      active_listings: activeProperties,
      pending_review: pendingProperties,
      sold: soldProperties,
      total_views: totalViews._sum.views_count || 0,
      total_inquiries: totalInquiries._sum.inquiries_count || 0,
      by_type: byType.map(t => ({ type: t.property_type || 'other', count: t._count })),
      by_status: byStatus.map(s => ({ status: s.status, count: s._count })),
      recent: recentProperties
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

router.get('/revenue', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.isAdmin;
    const period = req.query.period as string || 'month';

    let dateFilter = new Date();
    if (period === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (period === 'year') {
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
    }

    const where: any = {
      status: 'approved',
      created_at: { gte: dateFilter }
    };

    if (!isAdmin) {
      where.user_id = req.user!.id;
    }

    const [
      totalListingFees,
      byPropertyType,
      byTransactionType,
      payments
    ] = await Promise.all([
      prisma.propertyPayment.aggregate({
        where: { status: 'approved', created_at: { gte: dateFilter } },
        _sum: { amount: true }
      }),
      prisma.realEstateProperty.groupBy({
        by: ['property_type'],
        where,
        _sum: { listing_fee: true },
        _count: true
      }),
      prisma.realEstateProperty.groupBy({
        by: ['transaction_type'],
        where,
        _count: true
      }),
      prisma.propertyPayment.findMany({
        where: { status: 'approved', created_at: { gte: dateFilter } },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          currency: true,
          payment_type: true,
          created_at: true
        }
      })
    ]);

    res.json({
      period,
      total_listing_fees: totalListingFees._sum.amount ? Number(totalListingFees._sum.amount) : 0,
      by_property_type: byPropertyType.map(t => ({
        type: t.property_type || 'other',
        revenue: t._sum.listing_fee ? Number(t._sum.listing_fee) : 0,
        count: t._count
      })),
      by_transaction_type: byTransactionType.map(t => ({
        type: t.transaction_type,
        count: t._count
      })),
      recent_payments: payments.map(p => ({ ...p, amount: p.amount != null ? Number(p.amount) : 0 }))
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to get revenue analytics' });
  }
});

router.get('/performance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.isAdmin;
    const userId = req.user!.id;

    const where = isAdmin ? {} : { user_id: userId };

    const topViewed = await prisma.realEstateProperty.findMany({
      where: { ...where, is_active: true },
      orderBy: { views_count: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        property_type: true,
        location: true,
        price: true,
        views_count: true,
        inquiries_count: true
      }
    });

    const topInquired = await prisma.realEstateProperty.findMany({
      where: { ...where, is_active: true },
      orderBy: { inquiries_count: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        property_type: true,
        location: true,
        price: true,
        views_count: true,
        inquiries_count: true
      }
    });

    const conversionRate = topViewed.map(p => ({
      id: p.id,
      title: p.title,
      views: p.views_count,
      inquiries: p.inquiries_count,
      rate: p.views_count > 0 ? Number(((p.inquiries_count / p.views_count) * 100).toFixed(2)) : 0
    }));

    res.json({
      top_viewed: topViewed,
      top_inquired: topInquired,
      conversion_rates: conversionRate.sort((a, b) => Number(b.rate) - Number(a.rate)).slice(0, 10)
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({ error: 'Failed to get performance analytics' });
  }
});

router.get('/land', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalLands,
      verifiedLands,
      pendingLands,
      disputedLands,
      byRegion,
      byLandUse,
      recentActivity
    ] = await Promise.all([
      prisma.land.count(),
      prisma.land.count({ where: { status: 'verified' } }),
      prisma.land.count({ where: { status: 'pending' } }),
      prisma.land.count({ where: { status: 'disputed' } }),
      prisma.land.groupBy({
        by: ['region'],
        _count: true,
        _sum: { area_sqm: true },
        orderBy: { _count: { region: 'desc' } },
        take: 10
      }),
      prisma.land.groupBy({
        by: ['land_use'],
        _count: true,
        orderBy: { _count: { land_use: 'desc' } }
      }),
      prisma.landAuditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          land_id: true,
          action: true,
          actor_name: true,
          description: true,
          created_at: true
        }
      })
    ]);

    res.json({
      total_lands: totalLands,
      verified: verifiedLands,
      pending: pendingLands,
      disputed: disputedLands,
      by_region: byRegion.map(r => ({
        region: r.region,
        count: r._count,
        total_area_sqm: r._sum.area_sqm || 0
      })),
      by_land_use: byLandUse.map(u => ({
        use: u.land_use || 'unspecified',
        count: u._count
      })),
      recent_activity: recentActivity
    });
  } catch (error) {
    console.error('Land analytics error:', error);
    res.status(500).json({ error: 'Failed to get land analytics' });
  }
});

router.get('/leads', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user!.isAdmin;
    const period = req.query.period as string || 'month';

    let dateFilter = new Date();
    if (period === 'week') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (period === 'month') {
      dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else if (period === 'year') {
      dateFilter.setFullYear(dateFilter.getFullYear() - 1);
    }

    const where: any = { created_at: { gte: dateFilter } };

    if (!isAdmin) {
      const userProperties = await prisma.realEstateProperty.findMany({
        where: { user_id: req.user!.id },
        select: { id: true }
      });
      where.property_id = { in: userProperties.map(p => p.id) };
    }

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      byPriority,
      byStatus,
      bySource,
      avgResponseTime
    ] = await Promise.all([
      prisma.propertyLead.count({ where }),
      prisma.propertyLead.count({ where: { ...where, status: 'new' } }),
      prisma.propertyLead.count({ where: { ...where, status: 'converted' } }),
      prisma.propertyLead.groupBy({
        by: ['priority'],
        where,
        _count: true
      }),
      prisma.propertyLead.groupBy({
        by: ['status'],
        where,
        _count: true
      }),
      prisma.propertyLead.groupBy({
        by: ['source'],
        where,
        _count: true
      }),
      prisma.propertyLead.findMany({
        where: { ...where, responded_at: { not: null } },
        select: { created_at: true, responded_at: true }
      })
    ]);

    let avgResponse = 0;
    if (avgResponseTime.length > 0) {
      const totalHours = avgResponseTime.reduce((sum, lead) => {
        const diff = (lead.responded_at!.getTime() - lead.created_at.getTime()) / (1000 * 60 * 60);
        return sum + diff;
      }, 0);
      avgResponse = Math.round(totalHours / avgResponseTime.length);
    }

    const conversionRate = totalLeads > 0
      ? Number(((convertedLeads / totalLeads) * 100).toFixed(2))
      : 0;

    res.json({
      period,
      total_leads: totalLeads,
      new_leads: newLeads,
      converted_leads: convertedLeads,
      conversion_rate: conversionRate,
      avg_response_hours: avgResponse,
      by_priority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
      by_status: byStatus.map(s => ({ status: s.status, count: s._count })),
      by_source: bySource.map(s => ({ source: s.source || 'direct', count: s._count }))
    });
  } catch (error) {
    console.error('Lead analytics error:', error);
    res.status(500).json({ error: 'Failed to get lead analytics' });
  }
});

export default router;
