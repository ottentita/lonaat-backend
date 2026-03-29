/**
 * AI SYSTEM ROUTES (ADMIN ONLY)
 * Internal AI system access for administrators
 */

import { Router } from 'express';
import { requireAdminAI } from '../middleware/ai-access.guard';
import { getMemory, getAllMemory } from '../memory/memory.service';
import { getRecentErrors, getLogsByType } from '../logs/log.analyzer';
import { SYSTEM_REGISTRY } from '../registry/system.registry';
import { suggestFix } from '../agents/fix.suggester';
import { runDebugPipeline } from '../pipelines/debug.pipeline';
import { runAuditPipeline } from '../pipelines/audit.pipeline';

const router = Router();

/**
 * GET /api/ai-system/memory/:key
 * Get specific memory entry
 */
router.get('/memory/:key', requireAdminAI, async (req, res) => {
  try {
    const { key } = req.params;
    const memory = await getMemory(key);
    
    res.json({ key, value: memory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-system/memory
 * Get all memory entries
 */
router.get('/memory', requireAdminAI, async (req, res) => {
  try {
    const allMemory = await getAllMemory();
    res.json({ memory: allMemory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-system/logs
 * Get recent logs by type
 */
router.get('/logs', requireAdminAI, async (req, res) => {
  try {
    const { type = 'error', limit = '10' } = req.query;
    const logs = await getLogsByType(type as string, Number(limit));
    
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai-system/registry
 * Get system registry
 */
router.get('/registry', requireAdminAI, async (req, res) => {
  try {
    res.json({ registry: SYSTEM_REGISTRY });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-system/debug
 * Debug an error and get fix suggestion
 */
router.post('/debug', requireAdminAI, async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }
    
    const fix = await suggestFix({ message, context });
    
    if (fix.error) {
      res.status(500).json({ error: fix.error });
      return;
    }
    
    res.json({ suggestion: fix.suggestion });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-system/pipeline/debug
 * Run debug pipeline (analyze recent errors)
 */
router.post('/pipeline/debug', requireAdminAI, async (req, res) => {
  try {
    const result = await runDebugPipeline();
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai-system/pipeline/audit
 * Run audit pipeline (scan for duplicates)
 */
router.post('/pipeline/audit', requireAdminAI, async (req, res) => {
  try {
    const result = await runAuditPipeline();
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
