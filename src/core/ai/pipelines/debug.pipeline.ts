/**
 * DEBUG PIPELINE
 * Autonomous error analysis and fix suggestions
 */

import { getRecentErrors } from '../logs/log.analyzer';
import { suggestFix } from '../agents/fix.suggester';
import prisma from '../../../prisma';

export interface DebugPipelineResult {
  errorsAnalyzed: number;
  suggestions: Array<{
    error: string;
    suggestion: string;
  }>;
  error?: string;
}

/**
 * Run debug pipeline
 * Fetches recent errors and generates fix suggestions
 * NEVER crashes - always returns valid response
 */
export async function runDebugPipeline(): Promise<DebugPipelineResult> {
  try {
    let recentErrors: any[] = [];
    let suggestions: Array<{ error: string; suggestion: string }> = [];
    let pipelineError: string | undefined;

    // Step 1: Fetch recent errors (with try/catch)
    try {
      recentErrors = await getRecentErrors(10);
    } catch (err: any) {
      console.error('Failed to fetch recent errors:', err.message);
      pipelineError = 'Failed to fetch logs';
      // Return empty result if no logs
      recentErrors = [];
    }

    // Step 2: Generate fix suggestions for each error (with try/catch)
    if (recentErrors.length > 0) {
      for (const errorLog of recentErrors) {
        try {
          const fix = await suggestFix({
            message: errorLog.message,
            context: errorLog.context
          });
          
          if (fix.suggestion && !fix.error) {
            suggestions.push({
              error: errorLog.message,
              suggestion: fix.suggestion
            });
          }
        } catch (err: any) {
          // AI unavailable - add fallback suggestion
          console.error('Failed to generate fix for error:', errorLog.message, err.message);
          suggestions.push({
            error: errorLog.message,
            suggestion: 'AI unavailable'
          });
        }
      }
    }

    const result: DebugPipelineResult = {
      errorsAnalyzed: recentErrors.length,
      suggestions,
      ...(pipelineError && { error: 'Pipeline partially failed' })
    };

    // Step 3: Store pipeline run (with try/catch)
    try {
      await prisma.ai_pipeline_runs.create({
        data: {
          pipeline: 'debug',
          status: pipelineError ? 'failed' : 'success',
          result: result as any
        }
      });
    } catch (err: any) {
      // Log DB error but don't crash - return result anyway
      console.error('Failed to save pipeline run to database:', err.message);
    }

    // Always return result - never throw
    return result;
    
  } catch (err: any) {
    // Outer catch - pipeline catastrophic failure
    console.error('Pipeline error:', err);
    
    // Safe DB insert attempt
    try {
      await prisma.ai_pipeline_runs.create({
        data: {
          pipeline: 'debug',
          status: 'failed',
          result: { error: err.message || 'Unknown error' } as any
        }
      });
    } catch (dbErr) {
      console.error('Failed to save error to database:', dbErr);
    }
    
    // Always return valid response - NEVER throw
    return {
      errorsAnalyzed: 0,
      suggestions: [],
      error: err.message || 'Unknown error'
    };
  }
}
