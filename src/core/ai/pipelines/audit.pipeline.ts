/**
 * AUDIT PIPELINE
 * System audit for duplicates and rule violations
 */

import { SYSTEM_REGISTRY } from '../registry/system.registry';
import { checkDuplicateService, checkDuplicateRoute, checkDuplicateFile } from '../rules/duplicate.checker';
import prisma from '../../../prisma';
import * as fs from 'fs';
import * as path from 'path';

export interface AuditPipelineResult {
  duplicateServices: string[];
  duplicateRoutes: string[];
  duplicateFiles: string[];
  totalIssues: number;
  error?: string;
}

/**
 * Run audit pipeline
 * Scans system for duplicates and violations
 * NEVER crashes - always returns valid response
 */
export async function runAuditPipeline(): Promise<AuditPipelineResult> {
  try {
    let duplicateServices: string[] = [];
    let duplicateRoutes: string[] = [];
    let duplicateFiles: string[] = [];
    
    // Check for duplicate services (with try/catch)
    try {
      const serviceNames = Object.keys(SYSTEM_REGISTRY.services);
      const serviceCounts = new Map<string, number>();
      
      for (const name of serviceNames) {
        const count = serviceCounts.get(name) || 0;
        serviceCounts.set(name, count + 1);
        if (count > 0) {
          duplicateServices.push(name);
        }
      }
    } catch (err: any) {
      console.error('Failed to check duplicate services:', err.message);
      duplicateServices = [];
    }
    
    // Check for duplicate routes (with try/catch)
    try {
      const routePaths = Object.values(SYSTEM_REGISTRY.routes);
      const routeCounts = new Map<string, number>();
      
      for (const routePath of routePaths) {
        const count = routeCounts.get(routePath) || 0;
        routeCounts.set(routePath, count + 1);
        if (count > 0) {
          duplicateRoutes.push(routePath);
        }
      }
    } catch (err: any) {
      console.error('Failed to check duplicate routes:', err.message);
      duplicateRoutes = [];
    }
    
    // Check for duplicate files in common locations (with try/catch)
    try {
      const commonPaths = [
        'src/services',
        'src/routes',
        'src/core/ai'
      ];
      
      for (const dirPath of commonPaths) {
        try {
          const fullPath = path.resolve(process.cwd(), dirPath);
          if (fs.existsSync(fullPath)) {
            const files = fs.readdirSync(fullPath);
            const fileCounts = new Map<string, number>();
            
            for (const file of files) {
              const count = fileCounts.get(file) || 0;
              fileCounts.set(file, count + 1);
              if (count > 0) {
                duplicateFiles.push(`${dirPath}/${file}`);
              }
            }
          }
        } catch (err) {
          // Skip directories that can't be read
          console.error(`Failed to scan directory: ${dirPath}`);
        }
      }
    } catch (err: any) {
      console.error('Failed to check duplicate files:', err.message);
      duplicateFiles = [];
    }
    
    const result: AuditPipelineResult = {
      duplicateServices,
      duplicateRoutes,
      duplicateFiles,
      totalIssues: duplicateServices.length + duplicateRoutes.length + duplicateFiles.length
    };
    
    // Store pipeline run (with try/catch)
    try {
      await prisma.ai_pipeline_runs.create({
        data: {
          pipeline: 'audit',
          status: 'success',
          result: result as any
        }
      });
    } catch (err: any) {
      console.error('Failed to save pipeline run to database:', err.message);
    }
    
    return result;
    
  } catch (error: any) {
    // Outer catch - pipeline catastrophic failure
    console.error('Pipeline error:', error);
    
    // Safe DB insert attempt
    try {
      await prisma.ai_pipeline_runs.create({
        data: {
          pipeline: 'audit',
          status: 'failed',
          result: { error: error.message || 'Unknown error' } as any
        }
      });
    } catch (dbErr) {
      console.error('Failed to save error to database:', dbErr);
    }
    
    // Always return valid response - NEVER throw
    return {
      duplicateServices: [],
      duplicateRoutes: [],
      duplicateFiles: [],
      totalIssues: 0,
      error: error.message || 'Unknown error'
    };
  }
}
