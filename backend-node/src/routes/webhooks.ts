import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { handleAdmitadPostback } from '../services/admitadService';

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
        currency,
        commission_status
      } = data;

      const user = await prisma.user.findFirst({
        where: { email: affiliate_email }
      });

      if (user) {
        const existing = await prisma.commission.findFirst({
          where: { external_ref: order_id, network: 'digistore24' }
        });

        const isPaid = commission_status === 'approved' || event === 'on_affiliation_payment';
        const commissionAmount = parseFloat(commission_value) || 0;

        if (existing) {
          if (!existing.paid_at && isPaid) {
            await prisma.commission.update({
              where: { id: existing.id },
              data: { 
                status: 'paid_by_network', 
                paid_at: new Date()
              }
            });
            console.log(`[Digistore24] Marked as PAID_BY_NETWORK: $${existing.amount} for user ${user.id}`);
          }
        } else {
          await prisma.commission.create({
            data: {
              user_id: user.id,
              network: 'digistore24',
              amount: commissionAmount,
              status: isPaid ? 'paid_by_network' : 'pending',
              external_ref: order_id,
              paid_at: isPaid ? new Date() : null,
              webhook_data: {
                product_id,
                product_name,
                currency,
                order_id,
                payout_method: 'AFFILIATE_NETWORK',
                raw: data
              }
            }
          });
          console.log(`[Digistore24] Commission tracked: $${commissionAmount} for user ${user.id} (PAID_BY_NETWORK)`);
        }

        console.log(`[Digistore24] Commission logged for ${affiliate_email}: $${commission_value}`);
      }
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

        const isPaid = status === 'approved';
        const amount = parseFloat(commissionAmount?.amount || commissionAmount) || 0;

        if (existing) {
          if (!existing.paid_at && isPaid) {
            await prisma.commission.update({
              where: { id: existing.id },
              data: { 
                status: 'paid_by_network', 
                paid_at: new Date() 
              }
            });
            console.log(`[Awin] Marked as PAID_BY_NETWORK: $${existing.amount} for user ${user.id}`);
          }
        } else {
          await prisma.commission.create({
            data: {
              user_id: user.id,
              network: 'awin',
              amount,
              status: isPaid ? 'paid_by_network' : 'pending',
              external_ref: String(id),
              paid_at: isPaid ? new Date() : null,
              webhook_data: {
                advertiser_id: advertiserId,
                advertiser_name: advertiserName,
                transaction_date: transactionDate,
                payout_method: 'AFFILIATE_NETWORK',
                raw: tx
              }
            }
          });
          console.log(`[Awin] Commission tracked: $${amount} for user ${user.id} (PAID_BY_NETWORK)`);
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
      const isPaid = status === 'approved' || status === 'confirmed';
      const isRejected = status === 'rejected' || status === 'declined';
      const newStatus = isPaid ? 'paid_by_network' : isRejected ? 'rejected' : 'pending';
      
      if (existing.status !== newStatus) {
        await prisma.commission.update({
          where: { id: existing.id },
          data: { 
            status: newStatus,
            paid_at: isPaid ? new Date() : existing.paid_at
          }
        });
        console.log(`[MyLead] Updated commission ${existing.id} status to ${newStatus}`);
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

    const isPaid = status === 'approved' || status === 'confirmed';
    const isRejected = status === 'rejected' || status === 'declined';
    const commissionStatus = isPaid ? 'paid_by_network' : isRejected ? 'rejected' : 'pending';
    const commissionAmount = parseFloat(payout) || 0;

    await prisma.commission.create({
      data: {
        user_id: user.id,
        network: 'mylead',
        amount: commissionAmount,
        status: commissionStatus,
        external_ref: String(transaction_id),
        paid_at: isPaid ? new Date() : null,
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
          payout_method: 'AFFILIATE_NETWORK',
          received_at: new Date().toISOString()
        }
      }
    });

    console.log(`[MyLead] Commission tracked: $${payout} ${currency} for user ${user.id} - ${program_name} (PAID_BY_NETWORK)`);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('MyLead postback error:', error);
    res.status(500).json({ error: 'Postback processing failed' });
  }
};

router.get('/mylead', processMyLeadPostback);
router.post('/mylead', processMyLeadPostback);

router.post('/partnerstack', async (req: Request, res: Response) => {
  console.log('[PartnerStack] Webhook received but network is disabled');
  res.status(400).json({ 
    error: 'PartnerStack not connected',
    message: 'PartnerStack network is currently disabled'
  });
});

router.post('/admitad', async (req: Request, res: Response) => {
  try {
    console.log('[Admitad] Postback received:', JSON.stringify(req.body));
    
    const result = await handleAdmitadPostback(req.body);
    
    if (result.success) {
      res.json({ status: 'ok', message: result.message });
    } else {
      res.status(400).json({ status: 'error', message: result.message });
    }
  } catch (error: any) {
    console.error('Admitad webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.get('/admitad', async (req: Request, res: Response) => {
  try {
    console.log('[Admitad] GET Postback received:', req.query);
    
    const result = await handleAdmitadPostback(req.query);
    
    if (result.success) {
      res.json({ status: 'ok', message: result.message });
    } else {
      res.status(400).json({ status: 'error', message: result.message });
    }
  } catch (error: any) {
    console.error('Admitad webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
