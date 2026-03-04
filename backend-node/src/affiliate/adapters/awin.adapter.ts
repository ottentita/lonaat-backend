export async function buildLink(offer: any, user: any) {
  const awinId = process.env.AWIN_ID || ''
  const external = offer.externalOfferId || offer.externalId || ''
  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(external)}&awinaffid=${encodeURIComponent(awinId)}&clickref=${encodeURIComponent(String(user?.id||''))}`
}

export default { buildLink }
