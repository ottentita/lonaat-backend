export async function buildLink(offer: any, user: any) {
  const pid = process.env.ALIEXPRESS_PID || ''
  const base = offer.trackingUrl || ''
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}aff_trace_key=${encodeURIComponent(String(user?.id||''))}&pid=${encodeURIComponent(pid)}`
}

export default { buildLink }
