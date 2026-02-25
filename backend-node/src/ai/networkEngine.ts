import prisma from '../prisma'

export async function analyzeNetworks() {
  // Return top used networks and missing integrations
  const offers = await prisma.offer.findMany({})
  const networks = offers.map(o => (o as any).network).filter(Boolean)
  const counts: Record<string, number> = {}
  for (const n of networks) counts[n] = (counts[n] || 0) + 1

  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([name,count]) => ({ name, count }))

  // For missing integrations, check env variables commonly used
  const integrationChecks = [ 'AWIN_TOKEN', 'AMAZON_ACCESS_KEY', 'CLICKBANK_AFFILIATE_ID' ]
  const missing = integrationChecks.filter(k => !process.env[k])

  // Trending products: top 5 by offers count
  const trending = sorted.slice(0,5)

  return { networks: sorted, missingIntegrations: missing, trending }
}

export default { analyzeNetworks }
