// prisma is required lazily to avoid creating a client at module load
async function getPrisma() {
  const { default: prisma } = await import('../../prisma')
  return prisma
}

// convert an IP string to a stable 32-bit integer for uniqueness checks
function ipToNumber(ip?: string): number {
  if (!ip) return 0
  let num = 0
  for (let i = 0; i < ip.length; i++) {
    num = ((num << 5) - num) + ip.charCodeAt(i)
    num |= 0 // force 32-bit
  }
  return Math.abs(num)
}
import tokenWallet from './tokenWallet.service'
import adCampaignService from './adCampaign.service'
import billingService, { BillingError } from './billing.service'
import { DEFAULT_CLICK_COST } from './ads.types'

// custom error type used by upper layers (and tests) to detect a rapid duplicate
export class DuplicateClickError extends Error {
  constructor(message?: string) {
    super(message || 'Rapid duplicate click detected')
    this.name = 'DuplicateClickError'
  }
}

// In-memory maps for simple fraud detection (phase 1)
// key = ip:campaignId -> array of timestamps
const clickTimestamps = new Map<string, number[]>()
const clickCountsByIpHour = new Map<string, { ts: number; count: number }>()

export async function processAdClick(campaignId: number, ip?: string, isAdmin = false) {
  const costPerClick = Number(process.env.AD_CLICK_COST || DEFAULT_CLICK_COST)

  const prisma = await getPrisma()
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.adCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) throw new Error('Campaign not found')
    if (campaign.status !== 'active') throw new Error('Campaign not active')

    // ---- new validation rules ----
    // Bump: compute time bucket for this click (5‑second window)
    const timeBucket = Math.floor(Date.now() / 5000)
    // ensure we have an offer record for the click to satisfy FK
    let clickOfferId: number
    if (campaign.offerId) {
      clickOfferId = campaign.offerId
    } else {
      const dummy = await tx.offer.create({ data: { title: 'autogen', url: '', network: '', isActive: true } })
      clickOfferId = dummy.id
    }

    // build unique user key based on ip when no logged-in user is available
    const uniqueUser = ipToNumber(ip)

    // attempt to insert a record that will be unique per {userId,adId,timeBucket}
    try {
      await tx.click.create({
        data: {
          userId: uniqueUser,
          adId: campaignId,
          timeBucket,
          offerId: clickOfferId,
          clickId: `ad_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          clickToken: Math.random().toString(36).slice(2),
          ip: ip || undefined
        }
      })
    } catch (e: any) {
      // Prisma unique constraint error
      if (e.code === 'P2002') {
        // when duplicate, rethrow our specialized error
        throw new DuplicateClickError()
      }
      throw e
    }

    // Rule A: ensure wallet not already empty
    if (!isAdmin) {
      const wallet = await tx.adTokenWallet.findUnique({ where: { userId: campaign.userId } })
      if (!wallet || wallet.balance <= 0) {
        // don't change campaign status here, just fail
        throw new Error('Insufficient tokens')
      }
    }

    // Existing in-memory fraud checks (kept for additional rate limiting)
    if (ip) {
      const now = Date.now()
      const key = `${ip}:${campaignId}`

      // simple duplicate window: block any second click within 5 seconds
      const window = clickTimestamps.get(key) || []
      const cutoff = now - 5000
      const recent = window.filter((t) => t >= cutoff)
      if (recent.length > 0) {
        throw new Error('Rapid duplicate click detected')
      }
      recent.push(now)
      clickTimestamps.set(key, recent)

      // hourly limit per IP (across campaigns)
      const hKey = `${ip}:hour`
      const entry = clickCountsByIpHour.get(hKey) || { ts: now, count: 0 }
      if (now - entry.ts > 3600_000) {
        entry.ts = now
        entry.count = 0
      }
      entry.count += 1
      clickCountsByIpHour.set(hKey, entry)
      const ipLimit = Number(process.env.AD_IP_HOURLY_LIMIT || 50)
      if (entry.count > ipLimit) throw new Error('IP hourly click limit exceeded')
    }

    // Admin bypass or charge tokens
    if (!isAdmin) {
      try {
        await billingService.chargeAdClick(tx, campaignId, costPerClick)
      } catch (e: any) {
        if (e instanceof BillingError) {
          throw new Error(e.message)
        }
        throw e
      }
    } else {
      // admin: increment clicks without charging
      await tx.adCampaign.update({ where: { id: campaignId }, data: { clicks: { increment: 1 } } as any })
    }

    return { success: true }
  })
}

export async function optimizeCampaign(campaignId: number) {
  // Simple optimization hook: compute CTR and return suggested weight change
  const prisma = await getPrisma()
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign) throw new Error('Campaign not found')
  const ctr = campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0

  // conversions for the campaign's product/offer
  const convWhere: any = {}
  if (campaign.productId) convWhere.product_id = campaign.productId
  if (campaign.offerId) convWhere.product_id = campaign.offerId
  const convCount = await prisma.commission.count({ where: convWhere })
  const conversionRate = campaign.clicks > 0 ? convCount / campaign.clicks : 0

  const suggestion = {
    ctr,
    conversionRate,
    adjust: ctr > 0.05 && conversionRate > 0.02 ? 'increase' : 'decrease'
  }

  return suggestion
}

export default { processAdClick, optimizeCampaign }
