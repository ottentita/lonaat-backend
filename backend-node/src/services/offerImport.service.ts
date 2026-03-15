import prisma from '../prisma'
import GenericNetworkAdapter from '../networks/GenericNetworkAdapter'
import { getAdapterForNetwork } from '../networks/registry'

export async function importOffersForUser(userId: number, networkId: number) {
  const cred = await prisma.userNetworkCredential.findFirst({ where: { userId, networkId } })
  if (!cred) throw new Error('No credentials for user and network')

  const network = await prisma.affiliateNetwork.findUnique({ where: { id: networkId } })
  if (!network) throw new Error('Network not found')

  // decrypt credentials for adapter usage
  const { decrypt } = await import('../utils/crypto')
  const credentials: any = { }
  if (cred.apiKeyEncrypted && cred.apiKeyIv && cred.apiKeyTag) {
    credentials.apiKey = decrypt({ ciphertext: cred.apiKeyEncrypted, iv: cred.apiKeyIv, tag: cred.apiKeyTag })
  }
  if (cred.apiSecretEncrypted && cred.apiSecretIv && cred.apiSecretTag) {
    credentials.apiSecret = decrypt({ ciphertext: cred.apiSecretEncrypted, iv: cred.apiSecretIv, tag: cred.apiSecretTag })
  }

  // prefer a concrete adapter registered for this network name
  const adapter = getAdapterForNetwork(network.name || '', network.baseApiUrl)
  const offers = await adapter.fetchOffers(credentials)

  let imported = 0
  for (const o of offers) {
    // upsert into Offer (existing model)
    const externalOfferId = o.externalId || o.id || o.external_id
    if (!externalOfferId) continue

    // decide what to store as trackingUrl; digistore is handled specially
    let trackingVal: string | undefined = o.trackingUrl || o.tracking_url || o.tracking || undefined
    if (network.name === 'digistore24') {
      // we don't keep the full redir url here – the public /track route will pull
      // product/affiliate ids from ENV and construct the final destination.
      trackingVal = 'digistore24'
    }

    await prisma.offer.upsert({
      where: { externalOfferId: String(externalOfferId) },
      update: {
        title: o.name || o.title || o.name,
        description: o.description || o.desc,
        trackingUrl: trackingVal,
        network: network.name,
        payout: o.payout ?? o.commission ?? o.payout,
        isActive: true
      },
      create: {
        title: o.name || o.title || 'Imported Offer',
        name: o.name || o.title || 'Imported Offer',
        // create a deterministic slug from the name and timestamp to avoid conflicts
        slug: (String(o.name || o.title || 'imported-offer').toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now()}`),
        description: o.description || undefined,
        url: o.url || o.trackingUrl || '',
        network: network.name,
        externalOfferId: String(externalOfferId),
        trackingUrl: trackingVal,
        isActive: true,
        payout: o.payout ?? o.commission ?? undefined
      }
    })
    imported++
  }

  return { imported }
}
