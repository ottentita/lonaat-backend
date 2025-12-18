import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

router.post('/digistore24', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    if (event === 'on_payment' || event === 'on_affiliation_payment') {
      const {
        order_id,
        affiliate_name,
        affiliate_email,
        product_id,
        product_name,
        commission_value,
        currency
      } = data;

      const user = await prisma.user.findFirst({
        where: { email: affiliate_email }
      });

      if (user) {
        await prisma.commission.create({
          data: {
            user_id: user.id,
            network: 'digistore24',
            amount: parseFloat(commission_value) || 0,
            status: 'pending',
            external_ref: order_id,
            webhook_data: {
              product_id,
              product_name,
              currency,
              order_id,
              raw: data
            }
          }
        });
      }

      console.log(`[Digistore24] Commission logged for ${affiliate_email}: $${commission_value}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Digistore24 webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/awin', async (req: Request, res: Response) => {
  try {
    const transactions = Array.isArray(req.body) ? req.body : [req.body];

    for (const tx of transactions) {
      const {
        id,
        advertiserId,
        advertiserName,
        publisherId,
        commissionAmount,
        transactionDate,
        clickRef,
        status
      } = tx;

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { extra_data: { path: ['awin_publisher_id'], equals: publisherId } },
            { id: parseInt(clickRef) || 0 }
          ]
        }
      });

      if (user) {
        const existing = await prisma.commission.findFirst({
          where: { external_ref: String(id), network: 'awin' }
        });

        if (!existing) {
          await prisma.commission.create({
            data: {
              user_id: user.id,
              network: 'awin',
              amount: parseFloat(commissionAmount?.amount || commissionAmount) || 0,
              status: status === 'approved' ? 'approved' : 'pending',
              external_ref: String(id),
              webhook_data: {
                advertiser_id: advertiserId,
                advertiser_name: advertiserName,
                transaction_date: transactionDate,
                raw: tx
              }
            }
          });

          console.log(`[Awin] Commission logged for user ${user.id}: $${commissionAmount?.amount || commissionAmount}`);
        }
      }
    }

    res.json({ status: 'ok', processed: transactions.length });
  } catch (error) {
    console.error('Awin webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/mylead', async (req: Request, res: Response) => {
  try {
    const { action_id, user_id, amount, status, campaign_name } = req.body;

    const existing = await prisma.commission.findFirst({
      where: { external_ref: String(action_id), network: 'mylead' }
    });

    if (existing) {
      return res.json({ status: 'ok', message: 'Already processed' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { extra_data: { path: ['mylead_user_id'], equals: user_id } },
          { id: parseInt(user_id) || 0 }
        ]
      }
    });

    if (user) {
      await prisma.commission.create({
        data: {
          user_id: user.id,
          network: 'mylead',
          amount: parseFloat(amount) || 0,
          status: status === 'approved' ? 'approved' : 'pending',
          external_ref: String(action_id),
          webhook_data: {
            campaign_name,
            raw: req.body
          }
        }
      });

      console.log(`[MyLead] Commission logged for user ${user.id}: $${amount}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('MyLead webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/partnerstack', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    if (event === 'deal.completed' || event === 'reward.created') {
      const { partner_key, amount, customer_key, reward_id } = data;
      const externalRef = reward_id || customer_key;

      const existing = await prisma.commission.findFirst({
        where: { external_ref: String(externalRef), network: 'partnerstack' }
      });

      if (existing) {
        return res.json({ status: 'ok', message: 'Already processed' });
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { extra_data: { path: ['partnerstack_key'], equals: partner_key } },
            { email: partner_key }
          ]
        }
      });

      if (user) {
        await prisma.commission.create({
          data: {
            user_id: user.id,
            network: 'partnerstack',
            amount: parseFloat(amount) || 0,
            status: 'pending',
            external_ref: String(externalRef),
            webhook_data: {
              event,
              raw: data
            }
          }
        });

        console.log(`[PartnerStack] Commission logged for user ${user.id}: $${amount}`);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('PartnerStack webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
