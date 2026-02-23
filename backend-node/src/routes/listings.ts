import { Router, Request, Response } from 'express'
import prisma from '../prisma'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Public listings
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit
    const where: any = { isActive: true }
    const listings = await prisma.offer.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { seller: true, category: true } })
    const total = await prisma.offer.count({ where })
    res.json({ listings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error('Get listings error:', err)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// Seller's listings
router.get('/seller', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user!.id
    const listings = await prisma.offer.findMany({ where: { sellerId }, orderBy: { createdAt: 'desc' }, include: { category: true } })
    res.json({ listings })
  } catch (err) {
    console.error('Get seller listings error:', err)
    res.status(500).json({ error: 'Failed to fetch seller listings' })
  }
})

// Create listing
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, url, categoryId, images, location, status } = req.body
    if (!title) return res.status(400).json({ error: 'Title required' })

    const listing = await prisma.offer.create({
      data: {
        title,
        description,
        url: url || '',
        price: price || null,
        sellerId: req.user!.id,
        categoryId: categoryId || null,
        images: images ? JSON.stringify(images) : null,
        location,
        status: status || 'active',
        isActive: true
      }
    })

    res.status(201).json({ listing })
  } catch (err) {
    console.error('Create listing error:', err)
    res.status(500).json({ error: 'Failed to create listing' })
  }
})

// Update listing
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const existing = await prisma.offer.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Listing not found' })
    if (!req.user!.isAdmin && existing.sellerId !== req.user!.id) return res.status(403).json({ error: 'Access denied' })

    const { title, description, price, url, categoryId, images, location, status, isActive } = req.body
    const updated = await prisma.offer.update({ where: { id }, data: { title: title ?? existing.title, description: description ?? existing.description, price: price ?? existing.price, url: url ?? existing.url, categoryId: categoryId ?? existing.categoryId, images: images ? JSON.stringify(images) : existing.images, location: location ?? existing.location, status: status ?? existing.status, isActive: isActive ?? existing.isActive } })

    res.json({ listing: updated })
  } catch (err) {
    console.error('Update listing error:', err)
    res.status(500).json({ error: 'Failed to update listing' })
  }
})

// Delete listing (soft delete)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const existing = await prisma.offer.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Listing not found' })
    if (!req.user!.isAdmin && existing.sellerId !== req.user!.id) return res.status(403).json({ error: 'Access denied' })

    await prisma.offer.update({ where: { id }, data: { isActive: false } })
    res.json({ message: 'Listing removed' })
  } catch (err) {
    console.error('Delete listing error:', err)
    res.status(500).json({ error: 'Failed to delete listing' })
  }
})

export default router
