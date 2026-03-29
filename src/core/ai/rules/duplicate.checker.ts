/**
 * DUPLICATE CHECKER
 * Check for duplicate services, routes, and files
 */

import { SYSTEM_REGISTRY } from '../registry/system.registry';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Check if service already exists in registry
 */
export function checkDuplicateService(name: string): boolean {
  return name in SYSTEM_REGISTRY.services;
}

/**
 * Check if route already exists in registry
 */
export function checkDuplicateRoute(routePath: string): boolean {
  return Object.values(SYSTEM_REGISTRY.routes).includes(routePath);
}

/**
 * Check if file already exists in file system
 */
export function checkDuplicateFile(filePath: string): boolean {
  try {
    const absolutePath = path.resolve(filePath);
    return fs.existsSync(absolutePath);
  } catch (error) {
    return false;
  }
}
