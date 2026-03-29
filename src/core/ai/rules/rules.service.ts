/**
 * RULES SERVICE
 * Validate operations against system rules
 */

import { SYSTEM_REGISTRY } from '../registry/system.registry';
import { checkDuplicateService, checkDuplicateRoute, checkDuplicateFile } from './duplicate.checker';
import { logWarning, logError } from '../logs/logger.service';

/**
 * Rule severity levels
 */
const HARD_RULES = ['NO_DUPLICATE_SERVICES', 'NO_FILE_OVERWRITE'];
const SOFT_RULES = ['USE_SOURCE_OF_TRUTH', 'CHECK_REGISTRY_BEFORE_CREATE'];

/**
 * Validate file creation
 * HARD rule: Throws error if file already exists
 */
export async function validateFileCreation(filePath: string): Promise<void> {
  if (checkDuplicateFile(filePath)) {
    await logError('RULE_VIOLATION', {
      rule: 'NO_FILE_OVERWRITE',
      input: filePath,
      severity: 'HARD'
    });
    throw new Error(`Rule violation: File already exists at ${filePath} (NO_FILE_OVERWRITE)`);
  }
}

/**
 * Validate service usage
 * SOFT rule: Logs warning if service doesn't exist in registry
 */
export async function validateServiceUsage(name: string): Promise<void> {
  if (!checkDuplicateService(name)) {
    await logError('RULE_VIOLATION', {
      rule: 'USE_SOURCE_OF_TRUTH',
      input: name,
      severity: 'SOFT'
    });
    await logWarning(
      `Rule violation: Service "${name}" not found in registry (USE_SOURCE_OF_TRUTH)`,
      { service: name, severity: 'SOFT' }
    );
  }
}

/**
 * Validate route usage
 * SOFT rule: Logs warning if route doesn't exist in registry
 */
export async function validateRouteUsage(routePath: string): Promise<void> {
  if (!checkDuplicateRoute(routePath)) {
    await logError('RULE_VIOLATION', {
      rule: 'USE_SOURCE_OF_TRUTH',
      input: routePath,
      severity: 'SOFT'
    });
    await logWarning(
      `Rule violation: Route "${routePath}" not found in registry (USE_SOURCE_OF_TRUTH)`,
      { route: routePath, severity: 'SOFT' }
    );
  }
}

/**
 * Validate new service creation
 * HARD rule: Throws error if service already exists
 */
export async function validateNewService(name: string): Promise<void> {
  if (checkDuplicateService(name)) {
    await logError('RULE_VIOLATION', {
      rule: 'NO_DUPLICATE_SERVICES',
      input: name,
      severity: 'HARD'
    });
    throw new Error(`Rule violation: Service "${name}" already exists in registry (NO_DUPLICATE_SERVICES)`);
  }
}

/**
 * Validate new route creation
 * HARD rule: Throws error if route already exists
 */
export async function validateNewRoute(routePath: string): Promise<void> {
  if (checkDuplicateRoute(routePath)) {
    await logError('RULE_VIOLATION', {
      rule: 'NO_DUPLICATE_ROUTES',
      input: routePath,
      severity: 'HARD'
    });
    throw new Error(`Rule violation: Route "${routePath}" already exists in registry (NO_DUPLICATE_ROUTES)`);
  }
}
