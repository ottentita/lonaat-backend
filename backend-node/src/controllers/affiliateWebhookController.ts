import crypto from 'crypto';
import express, { Request, Response } from 'express';
import prisma from '../prisma';
import affiliateConfig from '../config/affiliateConfig';

const router = express.Router();

type RawRequest = Request & { rawBody?: any };

function verifySignature(rawBody: string, signature: string, secret: string) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

async function isDuplicateEvent(network: string, eventId: string) {
  const existing = await (prisma as any).affiliateEvent.findUnique({ where: { eventId } });
  return !!existing;
}

async function handleDigistore(req: RawRequest, res: Response) {
  const raw =
    req.rawBody ||
    (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)) ||
    '';
  const sigHeader = req.get('x-signature') || req.get('x-hub-signature');
  if (!sigHeader) return res.status(401).json({ error: 'Missing signature' });
  // prefer environment variable at request time so tests can set it dynamically
  const secret = process.env.DIGISTORE_WEBHOOK_SECRET || affiliateConfig.digistore.webhookSecret;
  if (!verifySignature(raw, sigHeader.replace(/^sha256=/, ''), String(secret))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(raw);
  const eventId =
    payload.event_id || payload.transaction_id ||
    crypto.createHash('sha256').update(raw).digest('hex');
  const payloadHash = crypto.createHash('sha256').update(raw).digest('hex');

  if (await isDuplicateEvent('digistore', eventId)) {
    return res.status(200).send('duplicate');
  }

  const sub = payload.sub_id || payload.subid;
  let clickId: string | null = null;
  if (sub) {
    const parts = String(sub).split('-');
    clickId = parts.slice(1).join('-') || null;
  }

  let click: any = null;
  if (clickId)
    click = await prisma.click.findUnique({ where: { clickId } });

  const offerId = payload.offerId ? Number(payload.offerId) : click?.offerId;
  if (!offerId) return res.status(400).json({ error: 'missing offerId or clickToken' });

  try {
    const conv = await prisma.$transaction(async (tx: any) => {
      await tx.affiliateEvent.create({
        data: { network: 'digistore', eventId, payloadHash }
      });

      const created = await tx.conversion.create({
        data: {
          offerId,
          clickId: click?.clickId ?? undefined,
          clickToken: click?.clickToken ?? String(payload.clickToken ?? ''),
          amount: payload.amount ? Number(payload.amount) : undefined,
          status: payload.status ? String(payload.status) : 'confirmed'
        }
      });

      try {
        const { processConversionSplit } = await import('../services/commissionEngine');
        await processConversionSplit(created.id, tx);
      } catch (e) {
        console.error('commission processing error', e);
        throw e;
      }

      if (click && click.user_id) {
        await tx.affiliateEvent.update({
          where: { eventId },
          data: { userId: click.user_id, amount: payload.amount ? Number(payload.amount) : null }
        });
      }

      return created;
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('digistore handler error', err);
    res.status(500).json({ error: 'processing failed' });
  }
}

async function handleClickbank(req: RawRequest, res: Response) {
  return handleDigistore(req, res);
}
async function handleJVZoo(req: RawRequest, res: Response) {
  return handleDigistore(req, res);
}
async function handleWarriorPlus(req: RawRequest, res: Response) {
  return handleDigistore(req, res);
}

async function handleAffiliateWebhook(req: RawRequest, res: Response) {
  const network = req.params.network;
  
  switch (network) {
    case 'digistore':
      return handleDigistore(req, res);
    case 'clickbank':
      return handleClickbank(req, res);
    case 'jvzoo':
      return handleJVZoo(req, res);
    case 'warriorplus':
      return handleWarriorPlus(req, res);
    default:
      return res.status(400).json({ error: 'Unknown affiliate network' });
  }
}

router.post('/:network', handleAffiliateWebhook);

export default router;
