import { prisma } from '../prisma';
import { Request } from 'express';



export interface AuditEntry {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  fraudScore?: number;
  flagged?: boolean;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        details: entry.details || {},
        ip_address: entry.ipAddress,
        fraud_score: entry.fraudScore || 0,
        flagged: entry.flagged || false
      }
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export async function logLogin(userId: number, email: string, success: boolean, req: Request): Promise<void> {
  await logAudit({
    userId: success ? userId : undefined,
    action: success ? 'login_success' : 'login_failed',
    entityType: 'user',
    entityId: userId,
    details: { email, success },
    ipAddress: getClientIp(req)
  });
}

export async function logPaymentAction(
  userId: number,
  action: string,
  paymentId: number,
  details: Record<string, any>,
  req: Request
): Promise<void> {
  await logAudit({
    userId,
    action,
    entityType: 'payment',
    entityId: paymentId,
    details,
    ipAddress: getClientIp(req)
  });
}

export async function logCampaignAction(
  userId: number,
  action: string,
  campaignId: number,
  details: Record<string, any>,
  req: Request
): Promise<void> {
  await logAudit({
    userId,
    action,
    entityType: 'campaign',
    entityId: campaignId,
    details,
    ipAddress: getClientIp(req)
  });
}

export async function logCreditChange(
  userId: number,
  targetUserId: number,
  amount: number,
  reason: string,
  req: Request
): Promise<void> {
  await logAudit({
    userId,
    action: amount > 0 ? 'credit_added' : 'credit_deducted',
    entityType: 'user',
    entityId: targetUserId,
    details: { amount, reason },
    ipAddress: getClientIp(req)
  });
}

export async function detectFraud(
  userId: number,
  action: string,
  req: Request
): Promise<{ fraudScore: number; flagged: boolean }> {
  const ip = getClientIp(req);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentActions = await prisma.auditLog.count({
    where: {
      user_id: userId,
      action,
      created_at: { gte: oneHourAgo }
    }
  });

  const recentIpActions = await prisma.auditLog.count({
    where: {
      ip_address: ip,
      action,
      created_at: { gte: oneHourAgo }
    }
  });

  let fraudScore = 0;
  if (recentActions > 50) fraudScore += 30;
  if (recentActions > 100) fraudScore += 40;
  if (recentIpActions > 200) fraudScore += 30;

  const flagged = fraudScore >= 50;

  if (flagged) {
    await logAudit({
      userId,
      action: 'fraud_detected',
      details: { originalAction: action, recentActions, recentIpActions, fraudScore },
      ipAddress: ip,
      fraudScore,
      flagged: true
    });
  }

  return { fraudScore, flagged };
}
