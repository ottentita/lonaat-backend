export function generateCryptoPaymentReference() {
  return "CRYPTO_" + Date.now();
}

export default { generateCryptoPaymentReference }
