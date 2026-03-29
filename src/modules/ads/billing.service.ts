// central billing logic for ad clicks (wallet/campaign updates + ledger)

// we import types lazily to avoid circular dependencies

export class BillingError extends Error {}

export async function chargeAdClick(tx: any, campaignId: number, cost: number) {
  // transaction client passed in
  const campaign = await tx.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new BillingError('Campaign not found');

  const userId = campaign.userId;

  // enforce daily budget before charging
  if (campaign.totalSpent + cost > campaign.dailyBudget) {
    // pause campaign
    await tx.adCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
    throw new BillingError('Daily budget exceeded');
  }

  // fetch wallet
  const wallet = await tx.adTokenWallet.findUnique({ where: { userId } });
  if (!wallet || wallet.balance < cost) {
    await tx.adCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
    throw new BillingError('Insufficient tokens; campaign paused');
  }

  const newBalance = wallet.balance - cost;

  // perform atomic updates and ledger entries
  await tx.adTokenWallet.update({ where: { userId }, data: { balance: { decrement: cost } } });
  await tx.tokenTransaction.create({ data: { userId, amount: cost, type: 'debit', reason: `ad_click:campaign:${campaignId}` } });

  await tx.transactionLedger.create({
    data: {
      userId,
      campaignId,
      amount: cost,
      type: 'debit',
      reason: `ad_click:campaign:${campaignId}`,
    }
  });

  await tx.adCampaign.update({
    where: { id: campaignId },
    data: {
      clicks: { increment: 1 },
      totalSpent: { increment: cost } as any,
    }
  });

  // pause if out of money or hitting budget
  if (newBalance <= 0 || campaign.totalSpent + cost >= campaign.dailyBudget) {
    await tx.adCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
  }

  return newBalance;
}

export default { chargeAdClick };
