export interface CreateCampaignInput {
  userId: number
  dailyBudget: number
  productId?: number
  offerId?: number
}

export interface ProcessClickInput {
  campaignId: number
  ip?: string
  userId?: number
  isAdmin?: boolean
}

export interface DashboardStats {
  balance: number
  activeCampaigns: number
  totalSpent: number
  ctr: number
  conversionRate: number
}

export const DEFAULT_CLICK_COST = Number(process.env.AD_CLICK_COST || 2)
