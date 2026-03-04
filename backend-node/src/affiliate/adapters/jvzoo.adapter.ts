export async function buildLink(offer: any, user: any) {
  const base = offer.trackingUrl || ''
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}subid=${encodeURIComponent(String(user?.id||''))}`
}

export default { buildLink }
