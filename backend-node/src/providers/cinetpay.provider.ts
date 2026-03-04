// CinetPay temporarily disabled — crypto-only mode active
export function generateCinetPayReference() {
  return "CINETPAY_" + Date.now();
}

export default { generateCinetPayReference }
