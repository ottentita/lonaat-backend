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

      const refId = parseInt(clickRef) || 0;
      const user = refId > 0 ? await prisma.user.findUnique({
        where: { id: refId }
      }) : null;

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

const processMyLeadPostback = async (req: Request, res: Response) => {
  try {
    const params = req.method === 'GET' ? req.query : req.body;
    
    const transaction_id = params.transaction_id as string;
    const program_id = params.program_id as string;
    const program_name = params.program_name as string;
    const payout = params.payout as string || params.payout_decimal as string;
    const currency = params.currency as string || 'USD';
    const status = params.status as string;
    const country_code = params.country_code as string;
    const ip = params.ip as string;
    const ml_sub1 = params.ml_sub1 as string;
    const ml_sub2 = params.ml_sub2 as string || params.ml_sub3 as string;

    console.log(`[MyLead] Postback received: transaction_id=${transaction_id}, program=${program_name}, status=${status}, payout=${payout} ${currency}, user=${ml_sub1}, country=${country_code}`);

    if (!transaction_id) {
      return res.status(400).json({ error: 'Missing transaction_id' });
    }

    const existing = await prisma.commission.findFirst({
      where: { external_ref: String(transaction_id), network: 'mylead' }
    });

    if (existing) {
      if (existing.status !== status) {
        await prisma.commission.update({
          where: { id: existing.id },
          data: { 
            status: status === 'approved' || status === 'confirmed' ? 'approved' : 
                   status === 'rejected' || status === 'declined' ? 'rejected' : 'pending'
          }
        });
        console.log(`[MyLead] Updated commission ${existing.id} status to ${status}`);
      }
      return res.json({ status: 'ok', message: 'Updated' });
    }

    const userId = parseInt(ml_sub1) || 0;
    const user = userId > 0 ? await prisma.user.findUnique({
      where: { id: userId }
    }) : null;

    if (!user) {
      console.log(`[MyLead] User not found for ml_sub1=${ml_sub1}`);
      return res.json({ status: 'ok', message: 'User not found' });
    }

    const commissionStatus = status === 'approved' || status === 'confirmed' ? 'approved' : 
                             status === 'rejected' || status === 'declined' ? 'rejected' : 'pending';

    await prisma.commission.create({
      data: {
        user_id: user.id,
        network: 'mylead',
        amount: parseFloat(payout) || 0,
        status: commissionStatus,
        external_ref: String(transaction_id),
        webhook_data: {
          transaction_id,
          program_id,
          program_name,
          payout,
          currency,
          status,
          country_code,
          ip,
          ml_sub1,
          ml_sub2,
          received_at: new Date().toISOString()
        }
      }
    });

    console.log(`[MyLead] Commission logged for user ${user.id}: $${payout} ${currency} - ${program_name} (status: ${commissionStatus})`);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('MyLead postback error:', error);
    res.status(500).json({ error: 'Postback processing failed' });
  }
};

router.get('/mylead', processMyLeadPostback);
router.post('/mylead', processMyLeadPostback);

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
        where: { email: partner_key }
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
