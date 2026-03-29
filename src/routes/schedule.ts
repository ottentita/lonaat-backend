import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// Helper function to calculate next run time
function calculateNextRun(frequency: string, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const nextRun = new Date();
  
  if (frequency === 'hourly') {
    nextRun.setHours(now.getHours() + 1, 0, 0, 0);
  } else if (frequency === 'daily') {
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    nextRun.setHours(hours, minutes, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 7);
    }
  }
  
  return nextRun;
}

// POST /api/schedule/create - Create a new schedule
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📅 CREATE SCHEDULE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, templateType, frequency, time } = req.body;

    if (!prompt || !templateType || !frequency || !time) {
      return res.status(400).json({ 
        error: 'Missing required fields: prompt, templateType, frequency, time' 
      });
    }

    // Validate frequency
    if (!['hourly', 'daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({ 
        error: 'Invalid frequency. Must be: hourly, daily, or weekly' 
      });
    }

    // Validate template type
    if (!['tiktok', 'ad', 'youtube', 'story'].includes(templateType)) {
      return res.status(400).json({ 
        error: 'Invalid templateType. Must be: tiktok, ad, youtube, or story' 
      });
    }

    console.log('👤 User:', userId);
    console.log('📋 Template:', templateType);
    console.log('🔄 Frequency:', frequency);
    console.log('⏰ Time:', time);

    const nextRun = calculateNextRun(frequency, time);
    console.log('⏭️ Next run scheduled for:', nextRun);

    const schedule = await prisma.schedule.create({
      data: {
        userId,
        prompt,
        templateType,
        frequency,
        time,
        isActive: true,
        nextRun
      }
    });

    console.log('✅ Schedule created:', schedule.id);

    res.json({
      success: true,
      schedule: {
        id: schedule.id,
        prompt: schedule.prompt,
        templateType: schedule.templateType,
        frequency: schedule.frequency,
        time: schedule.time,
        isActive: schedule.isActive,
        nextRun: schedule.nextRun,
        createdAt: schedule.createdAt
      },
      message: 'Schedule created successfully'
    });

  } catch (error: any) {
    console.error('❌ Create schedule error:', error);
    res.status(500).json({ 
      error: 'Failed to create schedule',
      details: error.message 
    });
  }
});

// GET /api/schedule/list - Get user's schedules
router.get('/list', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET SCHEDULES REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { active } = req.query;

    console.log('👤 User:', userId);
    console.log('🔍 Filter active:', active);

    const where: any = { userId };
    if (active === 'true') {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    const schedules = await prisma.schedule.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found', schedules.length, 'schedules');

    res.json({
      success: true,
      schedules,
      total: schedules.length
    });

  } catch (error: any) {
    console.error('❌ Get schedules error:', error);
    res.status(500).json({ 
      error: 'Failed to get schedules',
      details: error.message 
    });
  }
});

// DELETE /api/schedule/:id - Delete a schedule
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🗑️ DELETE SCHEDULE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    console.log('🔍 Looking for schedule:', id);
    console.log('👤 User:', userId);

    // Verify ownership
    const schedule = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your schedule' });
    }

    await prisma.schedule.delete({
      where: { id }
    });

    console.log('✅ Schedule deleted:', id);

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete schedule error:', error);
    res.status(500).json({ 
      error: 'Failed to delete schedule',
      details: error.message 
    });
  }
});

// PATCH /api/schedule/:id/toggle - Toggle schedule active status
router.patch('/:id/toggle', authMiddleware, async (req: AuthRequest, res) => {
  console.log('🔄 TOGGLE SCHEDULE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your schedule' });
    }

    const updated = await prisma.schedule.update({
      where: { id },
      data: { 
        isActive: !schedule.isActive,
        nextRun: !schedule.isActive ? calculateNextRun(schedule.frequency, schedule.time) : null
      }
    });

    console.log('✅ Schedule toggled:', id, '| Active:', updated.isActive);

    res.json({
      success: true,
      schedule: updated,
      message: `Schedule ${updated.isActive ? 'activated' : 'deactivated'}`
    });

  } catch (error: any) {
    console.error('❌ Toggle schedule error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle schedule',
      details: error.message 
    });
  }
});

export default router;
