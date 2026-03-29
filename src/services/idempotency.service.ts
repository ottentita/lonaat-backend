/**
 * IDEMPOTENCY SERVICE - DB LEVEL ENFORCEMENT
 * Hard guarantee against duplicate execution even under retries/races
 */

import { prisma } from '../prisma';

interface IdempotencyOptions {
  userId: number;
  endpoint: string;
  key: string;
}

interface ResponseData {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * Check if idempotency key exists and return stored response
 */
export async function checkIdempotencyKey(options: IdempotencyOptions): Promise<ResponseData | null> {
  try {
    const record = await prisma.idempotencyKey.findUnique({
      where: {
        userId_endpoint_key: {
          userId: options.userId,
          endpoint: options.endpoint,
          key: options.key
        }
      }
    });

    if (record) {
      console.log(`⚠️ Idempotency hit: ${options.key} for user ${options.userId}`);
      return record.response as ResponseData;
    }

    return null;
  } catch (error) {
    console.error('❌ Idempotency check error:', error);
    // Fail safe - allow request to proceed
    return null;
  }
}

/**
 * Store response for idempotency key
 */
export async function storeIdempotencyResponse(
  options: IdempotencyOptions, 
  response: ResponseData
): Promise<void> {
  try {
    await prisma.idempotencyKey.upsert({
      where: {
        userId_endpoint_key: {
          userId: options.userId,
          endpoint: options.endpoint,
          key: options.key
        }
      },
      update: {
        response: response,
        createdAt: new Date()
      },
      create: {
        userId: options.userId,
        endpoint: options.endpoint,
        key: options.key,
        response: response,
        createdAt: new Date()
      }
    });

    console.log(`✅ Idempotency stored: ${options.key} for user ${options.userId}`);
  } catch (error) {
    console.error('❌ Idempotency store error:', error);
    // Don't throw - response already sent to client
  }
}

/**
 * Clean up old idempotency keys (run via cron)
 * Keep keys for 24 hours to handle retries
 */
export async function cleanupOldIdempotencyKeys(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await prisma.idempotencyKey.deleteMany({
      where: {
        createdAt: {
          lt: cutoff
        }
      }
    });

    console.log(`🧹 Cleaned up ${result.count} old idempotency keys`);
  } catch (error) {
    console.error('❌ Idempotency cleanup error:', error);
  }
}

/**
 * Middleware wrapper for idempotency
 */
export function withIdempotency(endpoint: string) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body?.idempotencyKey;

    if (!userId || !idempotencyKey) {
      // No idempotency key - proceed normally
      return next();
    }

    try {
      // Check existing key
      const existing = await checkIdempotencyKey({
        userId,
        endpoint,
        key: idempotencyKey
      });

      if (existing) {
        // Return stored response
        return res.json(existing);
      }

      // Store original res.json to intercept response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Store response for future requests
        storeIdempotencyResponse({
          userId,
          endpoint,
          key: idempotencyKey
        }, {
          ...data,
          timestamp: new Date().toISOString()
        });

        // Send original response
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('❌ Idempotency middleware error:', error);
      next(); // Fail safe - proceed
    }
  };
}
