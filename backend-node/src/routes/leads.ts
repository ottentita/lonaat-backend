import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest, adminOnlyMiddleware } from '../middleware/auth';

const router = Router();


router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const property_id = req.query.property_id as string;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (property_id) where.property_id = parseInt(property_id);

    if (!req.user!.isAdmin) {
      const userProperties = await prisma.realEstateProperty.findMany({
        where: { user_id: req.user!.id },
        select: { id: true }
      });
      where.property_id = { in: userProperties.map(p => p.id) };
    }

    const [leads, total] = await Promise.all([
      prisma.propertyLead.findMany({
        where,
        orderBy: [
          { priority: 'asc' },
          { created_at: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.propertyLead.count({ where })
    ]);

    res.json({
      leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

router.post('/', async (req, res: Response) => {
  try {
    const {
      property_id,
      land_id,
      lead_type,
      name,
      email,
      phone,
      whatsapp,
      message,
      offer_amount,
      currency,
      source
    } = req.body;

    if (!property_id || !name) {
      return res.status(400).json({ error: 'Property ID and name required' });
    }

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: parseInt(property_id) }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const lead = await prisma.propertyLead.create({
      data: {
        property_id: parseInt(property_id),
        land_id: land_id ? parseInt(land_id) : null,
        lead_type: lead_type || 'inquiry',
        name,
        email,
        phone,
        whatsapp,
        message,
        priority: offer_amount ? 'high' : 'medium',
        status: 'new',
        offer_amount,
        currency: currency || 'XAF',
        source: source || 'website'
      }
    });

    await prisma.realEstateProperty.update({
      where: { id: parseInt(property_id) },
      data: { inquiries_count: { increment: 1 } }
    });

    res.status(201).json({ message: 'Lead submitted successfully', lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to submit lead' });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    
    if (!req.user!.isAdmin) {
      const userProperties = await prisma.realEstateProperty.findMany({
        where: { user_id: req.user!.id },
        select: { id: true }
      });
      where.property_id = { in: userProperties.map(p => p.id) };
    }

    const [
      total,
      newLeads,
      contacted,
      converted,
      highPriority,
      byType,
      recent
    ] = await Promise.all([
      prisma.propertyLead.count({ where }),
      prisma.propertyLead.count({ where: { ...where, status: 'new' } }),
      prisma.propertyLead.count({ where: { ...where, status: 'contacted' } }),
      prisma.propertyLead.count({ where: { ...where, status: 'converted' } }),
      prisma.propertyLead.count({ where: { ...where, priority: 'high' } }),
      prisma.propertyLead.groupBy({
        by: ['lead_type'],
        where,
        _count: true
      }),
      prisma.propertyLead.findMany({
        where: { ...where, status: 'new' },
        orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
        take: 5
      })
    ]);

    res.json({
      total,
      new: newLeads,
      contacted,
      converted,
      high_priority: highPriority,
      by_type: byType.map(t => ({ type: t.lead_type, count: t._count })),
      recent
    });
  } catch (error) {
    console.error('Lead stats error:', error);
    res.status(500).json({ error: 'Failed to get lead statistics' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.propertyLead.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: lead.property_id },
      select: { id: true, title: true, user_id: true, price: true, location: true }
    });

    if (!req.user!.isAdmin && property?.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ lead, property });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

router.put('/:id/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, closed_reason } = req.body;

    if (!['new', 'contacted', 'negotiating', 'converted', 'closed', 'spam'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const lead = await prisma.propertyLead.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const property = await prisma.realEstateProperty.findUnique({
      where: { id: lead.property_id },
      select: { user_id: true }
    });

    if (!req.user!.isAdmin && property?.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData: any = { status };
    
    if (status === 'contacted' && !lead.responded_at) {
      updateData.responded_at = new Date();
      updateData.responded_by = req.user!.id;
    }
    
    if (['converted', 'closed'].includes(status)) {
      updateData.closed_at = new Date();
      updateData.closed_reason = closed_reason || status;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const updated = await prisma.propertyLead.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });

    res.json({ message: 'Lead updated', lead: updated });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

router.put('/:id/priority', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { priority } = req.body;

    if (!['high', 'medium', 'low'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    const updated = await prisma.propertyLead.update({
      where: { id: parseInt(req.params.id) },
      data: { priority }
    });

    res.json({ message: 'Priority updated', lead: updated });
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

router.delete('/:id', authMiddleware, adminOnlyMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.propertyLead.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;
