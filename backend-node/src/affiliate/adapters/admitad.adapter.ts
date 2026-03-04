export async function buildLink(offer: any, user: any) {
  const base = offer.trackingUrl || ''
  const sep = base.includes('?') ? '&' : '?'
  const subId = user?.id || ''
  return `${base}${sep}subid=${encodeURIComponent(subId)}`
}

export default { buildLink }
