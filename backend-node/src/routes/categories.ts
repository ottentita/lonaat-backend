import { Router, Request, Response } from 'express'
import prisma from '../prisma'

const router = Router()

// GET /api/categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ categories })
  } catch (err) {
    console.error('Get categories error:', err)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

// GET /api/categories/:slug/listings
router.get('/:slug/listings', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const category = await prisma.category.findUnique({ where: { slug } })
    if (!category) return res.status(404).json({ error: 'Category not found' })

    // fetch offers that reference categoryId
    const offers = await prisma.offer.findMany({ where: { categoryId: category.id, isActive: true } })

    // also include products that use category as string for backward compatibility
    const products = await prisma.product.findMany({ where: { category: { contains: category.name, mode: 'insensitive' }, is_active: true } })

    res.json({ category, offers, products })
  } catch (err) {
    console.error('Get category listings error:', err)
    res.status(500).json({ error: 'Failed to fetch listings for category' })
  }
})

export default router
