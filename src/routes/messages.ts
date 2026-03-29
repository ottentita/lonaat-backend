import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * GET /api/messages - Get user messages (inbox)
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📬 GET MESSAGES REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type = 'received', limit = 50, offset = 0 } = req.query;

    console.log('📊 Fetching messages for user:', userId, 'Type:', type);

    // Build query based on type
    const where: any = type === 'sent' 
      ? { senderId: Number(userId) }
      : { receiverId: Number(userId) };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.message.count({ where })
    ]);

    console.log(`✅ Retrieved ${messages.length} messages (total: ${total})`);

    res.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender.name || m.sender.email,
        senderEmail: m.sender.email,
        receiverId: m.receiverId,
        receiverName: m.receiver.name || m.receiver.email,
        receiverEmail: m.receiver.email,
        subject: m.subject,
        content: m.content,
        isRead: m.isRead,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ 
      error: 'Failed to get messages',
      details: error.message 
    });
  }
});

/**
 * GET /api/messages/:id - Get single message
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('📬 GET SINGLE MESSAGE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = Number(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { senderId: Number(userId) },
          { receiverId: Number(userId) }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read if user is receiver
    if (message.receiverId === Number(userId) && !message.isRead) {
      await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true }
      });
    }

    console.log('✅ Message retrieved:', messageId);

    res.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        senderName: message.sender.name || message.sender.email,
        senderEmail: message.sender.email,
        receiverId: message.receiverId,
        receiverName: message.receiver.name || message.receiver.email,
        receiverEmail: message.receiver.email,
        subject: message.subject,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt
      }
    });

  } catch (error: any) {
    console.error('❌ Get message error:', error);
    res.status(500).json({ 
      error: 'Failed to get message',
      details: error.message 
    });
  }
});

/**
 * POST /api/messages/send - Send a new message
 */
router.post('/send', [
  authMiddleware,
  body('receiverId').isInt().withMessage('Receiver ID must be an integer'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
], async (req: AuthRequest, res: Response) => {
  console.log('📤 SEND MESSAGE REQUEST');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { receiverId, subject, content } = req.body;

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: Number(receiverId) }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: Number(userId),
        receiverId: Number(receiverId),
        subject: subject.trim(),
        content: content.trim(),
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Message sent:', message.id);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: message.id,
        senderId: message.senderId,
        senderName: message.sender.name || message.sender.email,
        receiverId: message.receiverId,
        receiverName: message.receiver.name || message.receiver.email,
        subject: message.subject,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message 
    });
  }
});

/**
 * PATCH /api/messages/:id/read - Mark message as read
 */
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('✅ MARK MESSAGE AS READ REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = Number(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    // Verify message belongs to user (as receiver)
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        receiverId: Number(userId)
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update read status
    await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true }
    });

    console.log('✅ Message marked as read:', messageId);

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error: any) {
    console.error('❌ Mark message as read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as read',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/messages/:id - Delete message
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  console.log('🗑️ DELETE MESSAGE REQUEST');
  
  try {
    const userId = req.user?.id;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const messageId = Number(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    // Verify message belongs to user (as sender or receiver)
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { senderId: Number(userId) },
          { receiverId: Number(userId) }
        ]
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Delete message
    await prisma.message.delete({
      where: { id: messageId }
    });

    console.log('✅ Message deleted:', messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete message error:', error);
    res.status(500).json({ 
      error: 'Failed to delete message',
      details: error.message 
    });
  }
});

export default router;
