/**
 * LOGGER SERVICE
 * Simple logging to ai_logs table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Log info message
 */
export async function logInfo(message: string, context?: any): Promise<void> {
  await prisma.ai_logs.create({
    data: {
      type: 'info',
      message,
      context: context ? JSON.parse(JSON.stringify(context)) : null
    }
  });
}

/**
 * Log warning message
 */
export async function logWarning(message: string, context?: any): Promise<void> {
  await prisma.ai_logs.create({
    data: {
      type: 'warning',
      message,
      context: context ? JSON.parse(JSON.stringify(context)) : null
    }
  });
}

/**
 * Log error message
 */
export async function logError(message: string, context?: any): Promise<void> {
  // Check for duplicate error within last 60 seconds
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
  
  const recentError = await prisma.ai_logs.findFirst({
    where: {
      type: 'error',
      message,
      createdAt: { gte: sixtySecondsAgo }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  if (recentError) {
    // Update existing error with occurrence count
    const existingContext = recentError.context as any || {};
    const occurrenceCount = (existingContext.occurrenceCount || 1) + 1;
    
    await prisma.ai_logs.update({
      where: { id: recentError.id },
      data: {
        context: {
          ...existingContext,
          occurrenceCount,
          lastOccurrence: new Date().toISOString()
        }
      }
    });
  } else {
    // Insert new error log
    await prisma.ai_logs.create({
      data: {
        type: 'error',
        message,
        context: context ? JSON.parse(JSON.stringify(context)) : null
      }
    });
  }
}
