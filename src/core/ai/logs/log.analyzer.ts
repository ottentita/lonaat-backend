/**
 * LOG ANALYZER
 * Simple log analysis and pattern detection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get logs by type
 */
export async function getLogsByType(type: string, limit?: number): Promise<any[]> {
  const logs = await prisma.ai_logs.findMany({
    where: { type },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  return logs.map(log => ({
    id: log.id,
    type: log.type,
    message: log.message,
    context: log.context,
    createdAt: log.createdAt
  }));
}

/**
 * Get recent error logs
 */
export async function getRecentErrors(limit: number = 10): Promise<any[]> {
  const errors = await prisma.ai_logs.findMany({
    where: { type: 'error' },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  return errors.map(e => ({
    id: e.id,
    message: e.message,
    context: e.context,
    createdAt: e.createdAt
  }));
}

/**
 * Get error patterns (repeated errors)
 */
export async function getErrorPatterns(): Promise<any[]> {
  const errors = await prisma.ai_logs.findMany({
    where: { type: 'error' },
    orderBy: { createdAt: 'desc' }
  });
  
  // Count occurrences of each error message
  const patterns = new Map<string, number>();
  
  for (const error of errors) {
    const count = patterns.get(error.message) || 0;
    patterns.set(error.message, count + 1);
  }
  
  // Convert to array and sort by count
  const result = Array.from(patterns.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);
  
  return result;
}
