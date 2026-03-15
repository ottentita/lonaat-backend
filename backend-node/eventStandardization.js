function standardizeEvent(network, payload) {

return {
  event_type: "affiliate_conversion",
  network: network,
  product_id: payload.product_id || payload.product || "unknown",
  transaction_id: payload.transaction_id || payload.txn || "unknown",
  commission: payload.commission || 0,
  currency: payload.currency || "USD",
  timestamp: new Date().toISOString()
};

}

module.exports = { standardizeEvent };