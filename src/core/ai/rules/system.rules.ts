/**
 * SYSTEM RULES
 * Core rules that must be enforced by AI agents
 */

export const SYSTEM_RULES = [
  "NO_DUPLICATE_SERVICES",
  "NO_DUPLICATE_ROUTES",
  "NO_FILE_OVERWRITE",
  "USE_SOURCE_OF_TRUTH",
  "CHECK_REGISTRY_BEFORE_CREATE"
] as const;

export type SystemRule = typeof SYSTEM_RULES[number];

/**
 * Rule descriptions for documentation
 */
export const RULE_DESCRIPTIONS: Record<SystemRule, string> = {
  NO_DUPLICATE_SERVICES: "Do not create services that duplicate existing functionality",
  NO_DUPLICATE_ROUTES: "Do not create routes that conflict with existing routes",
  NO_FILE_OVERWRITE: "Do not overwrite existing files without explicit permission",
  USE_SOURCE_OF_TRUTH: "Always use the canonical service from the registry",
  CHECK_REGISTRY_BEFORE_CREATE: "Check system registry before creating new services or routes"
};
