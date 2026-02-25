import { Router } from 'express'
import adsController from './ads.controller'
import { authMiddleware } from '../../middleware/auth'

const router = Router()

router.post('/campaign', authMiddleware, adsController.createCampaignHandler)
router.post('/campaign/:id/click', authMiddleware, adsController.processClickHandler)
router.get('/dashboard/:userId', authMiddleware, adsController.dashboardHandler)
router.post('/admin/credit', authMiddleware, adsController.adminCreditTokens)

export default router
