import { Router, Response, Request } from 'express';
import { prisma } from '../prisma';
import crypto from 'crypto';
import { handleAdmitadPostback } from '../services/admitadService';
import { validateEvent } from '../services/eventStandardization';

const router = Router();


// commission/webhook callbacks from Digistore24 (existing)
router.post('/digistore24', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    const standardizedEvent = {
      event_type: event,
      network: 'Digistore24',
      product_id: data.product_id,
      transaction_id: data.order_id,
      commission: parseFloat(data.commission),
      currency: data.currency,
      timestamp: new Date().toISOString(),
    };

    const validation = validateEvent(standardizedEvent);
    if (!validation.valid) {
      console.error('Validation errors:', validation.errors);
      return res.status(400).json({ error: 'Invalid event payload', details: validation.errors });
    }

    // Process the standardized event (e.g., forward to event_ingestion_service)
    console.log('Standardized Event:', standardizedEvent);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Digistore24 webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// lightweight click conversion webhook - simpler than the main Digistore24 notification
router.post('/digistore', async (req: Request, res: Response) => {
  try {
    // optional basic secret check (recommended to configure DIGISTORE_WEBHOOK_SECRET)
    if (process.env.DIGISTORE_WEBHOOK_SECRET) {
      if (req.body.secret !== process.env.DIGISTORE_WEBHOOK_SECRET) {
        return res.status(403).json({ error: 'Invalid webhook secret' });
      }
    }

    const subid = req.body.subid;
    const amount = parseFloat(req.body.amount);

    if (!subid || isNaN(amount)) {
      return res.status(400).json({ error: 'missing subid or amount' });
    }

    await prisma.click.update({
      where: { id: parseInt(subid) },
      data: { converted: true, revenue: amount }
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Digistore click webhook error:', error);
    res.status(500).json({ error: 'processing failed' });
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
        const amount = Number(commissionAmount?.amount || commissionAmount) || 0;

        if (existing) {
          if (!existing.paid_at && isPaid) {
            await prisma.commission.update({
              where: { id: existing.id },
              data: { 
                status: 'paid_by_network', 
                paid_at: new Date() 
              }
            });
            
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
              webhook_data: JSON.stringify({
                advertiser_id: advertiserId,
                advertiser_name: advertiserName,
                transaction_date: transactionDate,
                payout_method: 'AFFILIATE_NETWORK',
                raw: tx
              })
            }
          });
          
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
        
      }
      return res.json({ status: 'ok', message: 'Updated' });
    }

    const userId = parseInt(ml_sub1) || 0;
    const user = userId > 0 ? await prisma.user.findUnique({
      where: { id: userId }
    }) : null;

    if (!user) {
      return res.json({ status: 'ok', message: 'User not found' });
    }

    const isPaid = status === 'approved' || status === 'confirmed';
    const isRejected = status === 'rejected' || status === 'declined';
    const commissionStatus = isPaid ? 'paid_by_network' : isRejected ? 'rejected' : 'pending';
    const commissionAmount = Number(payout) || 0;

    await prisma.commission.create({
      data: {
        user_id: user.id,
        network: 'mylead',
        amount: commissionAmount,
        status: commissionStatus,
        external_ref: String(transaction_id),
        paid_at: isPaid ? new Date() : null,
        webhook_data: JSON.stringify({
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
        })
      }
    });

    

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('MyLead postback error:', error);
    res.status(500).json({ error: 'Postback processing failed' });
  }
};

router.get('/mylead', processMyLeadPostback);
router.post('/mylead', processMyLeadPostback);

router.post('/partnerstack', async (req: Request, res: Response) => {
  
  res.status(400).json({ 
    error: 'PartnerStack not connected',
    message: 'PartnerStack network is currently disabled'
  });
});

router.post('/admitad', async (req: Request, res: Response) => {
  try {
    
    
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
