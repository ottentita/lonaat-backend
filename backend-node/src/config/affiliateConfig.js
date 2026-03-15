const requiredNetworks = [
  "DIGISTORE_API_KEY",
  "DIGISTORE_WEBHOOK_SECRET",
  "CLICKBANK_API_KEY",
  "CLICKBANK_WEBHOOK_SECRET",
  "JVZOO_WEBHOOK_SECRET",
  "WARRIORPLUS_WEBHOOK_SECRET"
];

requiredNetworks.forEach(key => {
  if (!process.env[key]) {
    console.warn(`Missing ENV: ${key}`);
  }
});

module.exports = {
  digistore: {
    apiKey: process.env.DIGISTORE_API_KEY,
    webhookSecret: process.env.DIGISTORE_WEBHOOK_SECRET
  },
  clickbank: {
    apiKey: process.env.CLICKBANK_API_KEY,
    webhookSecret: process.env.CLICKBANK_WEBHOOK_SECRET
  },
  jvzoo: {
    webhookSecret: process.env.JVZOO_WEBHOOK_SECRET
  },
  warriorplus: {
    webhookSecret: process.env.WARRIORPLUS_WEBHOOK_SECRET
  }
};
