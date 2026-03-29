import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// POST /api/bookings/create - Create a new booking
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📅 CREATE BOOKING REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      propertyId,
      automobileId,
      itemType,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (!itemType || !startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: itemType, startDate, endDate' 
      });
    }

    if (itemType !== 'property' && itemType !== 'automobile') {
      return res.status(400).json({ 
        error: 'itemType must be either "property" or "automobile"' 
      });
    }

    if (itemType === 'property' && !propertyId) {
      return res.status(400).json({ error: 'propertyId is required for property bookings' });
    }

    if (itemType === 'automobile' && !automobileId) {
      return res.status(400).json({ error: 'automobileId is required for automobile bookings' });
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    // Calculate duration
    const durationMs = end.getTime() - start.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    let totalPrice = 0;
    let item: any = null;

    // Get item and calculate price
    if (itemType === 'property') {
      item = await prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!item) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (item.status !== 'available') {
        return res.status(400).json({ error: 'Property is not available' });
      }

      if (item.type !== 'rent') {
        return res.status(400).json({ error: 'Property is not available for rent' });
      }

      // Calculate total price (rentPrice is per month)
      const durationMonths = durationDays / 30;
      totalPrice = (item.rentPrice || 0) * durationMonths;

    } else if (itemType === 'automobile') {
      item = await prisma.automobile.findUnique({
        where: { id: automobileId }
      });

      if (!item) {
        return res.status(404).json({ error: 'Automobile not found' });
      }

      if (item.status !== 'available') {
        return res.status(400).json({ error: 'Automobile is not available' });
      }

      if (item.type !== 'rent') {
        return res.status(400).json({ error: 'Automobile is not available for rent' });
      }

      // Calculate total price (rentPrice is per day)
      totalPrice = (item.rentPrice || 0) * durationDays;
    }

    // Check for overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { propertyId: propertyId || undefined },
          { automobileId: automobileId || undefined }
        ],
        status: { in: ['pending', 'confirmed'] },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlappingBookings.length > 0) {
      return res.status(400).json({ 
        error: 'Item is already booked for the selected dates',
        conflictingBookings: overlappingBookings
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        propertyId: itemType === 'property' ? propertyId : null,
        automobileId: itemType === 'automobile' ? automobileId : null,
        itemType,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'pending'
      }
    });

    console.log('✅ Booking created:', booking.id);

    res.json({
      success: true,
      message: 'Booking created successfully',
      booking,
      details: {
        durationDays,
        totalPrice,
        pricePerDay: itemType === 'automobile' ? item.rentPrice : null,
        pricePerMonth: itemType === 'property' ? item.rentPrice : null
      }
    });

  } catch (error: any) {
    console.error('❌ Create booking error:', error);
    res.status(500).json({ 
      error: 'Failed to create booking',
      details: error.message 
    });
  }
});

// GET /api/bookings/my - Get user's bookings
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  console.log('📋 GET MY BOOKINGS');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        property: true,
        automobile: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found', bookings.length, 'bookings');

    res.json({
      success: true,
      bookings,
      total: bookings.length
    });

  } catch (error: any) {
    console.error('❌ Get bookings error:', error);
    res.status(500).json({ 
      error: 'Failed to get bookings',
      details: error.message 
    });
  }
});

// PATCH /api/bookings/:id/cancel - Cancel a booking
router.patch('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  console.log('❌ CANCEL BOOKING');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({ error: 'Booking cannot be cancelled' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    console.log('✅ Booking cancelled:', id);

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error: any) {
    console.error('❌ Cancel booking error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel booking',
      details: error.message 
    });
  }
});

export default router;
