/**
 * MEMORY SERVICE
 * Simple CRUD operations for AI memory storage
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Protected keys that cannot be overwritten
 */
const PROTECTED_KEYS = ['api_structure', 'services_source_of_truth'];

/**
 * Set or update memory entry
 */
export async function setMemory(key: string, value: any, scope?: string): Promise<void> {
  // Validate key is string
  if (typeof key !== 'string') {
    throw new Error('Key must be a string');
  }
  
  // Validate value is JSON serializable
  try {
    JSON.stringify(value);
  } catch (error) {
    throw new Error('Value must be JSON serializable');
  }
  
  // Check if key is protected
  const existingEntry = await prisma.ai_memory.findUnique({
    where: { key }
  });
  
  if (existingEntry && PROTECTED_KEYS.includes(key)) {
    throw new Error(`Cannot overwrite protected key: ${key}`);
  }
  
  await prisma.ai_memory.upsert({
    where: { key },
    update: {
      value: JSON.parse(JSON.stringify(value)),
      scope: scope || null,
      updatedAt: new Date()
    },
    create: {
      key,
      value: JSON.parse(JSON.stringify(value)),
      scope: scope || null
    }
  });
}

/**
 * Get memory entry by key
 */
export async function getMemory(key: string): Promise<any | null> {
  const entry = await prisma.ai_memory.findUnique({
    where: { key }
  });
  
  return entry ? entry.value : null;
}

/**
 * Get all memory entries by scope
 */
export async function getAllMemory(scope?: string): Promise<any[]> {
  const entries = await prisma.ai_memory.findMany({
    where: scope ? { scope } : undefined,
    orderBy: { updatedAt: 'desc' }
  });
  
  return entries.map(e => ({
    key: e.key,
    value: e.value,
    scope: e.scope,
    updatedAt: e.updatedAt
  }));
}
