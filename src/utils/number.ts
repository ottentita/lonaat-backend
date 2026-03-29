/**
 * Number Conversion Utility
 * 
 * Provides safe number conversion with validation to prevent
 * "operator does not exist: integer = text" errors in Prisma queries.
 * 
 * Use this helper everywhere instead of parseInt() or Number() directly.
 */

/**
 * Converts any value to a number with validation
 * @param value - The value to convert (string, number, etc.)
 * @param fieldName - Optional field name for better error messages
 * @returns The converted number
 * @throws Error if the value cannot be converted to a valid number
 */
export function toInt(value: any, fieldName: string = 'value'): number {
  const num = Number(value);
  
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: cannot convert to number`);
  }
  
  return num;
}

/**
 * Safely converts a value to a number, returning null if invalid
 * @param value - The value to convert
 * @returns The converted number or null if invalid
 */
export function toIntOrNull(value: any): number | null {
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Converts a value to a number with a default fallback
 * @param value - The value to convert
 * @param defaultValue - The default value to return if conversion fails
 * @returns The converted number or the default value
 */
export function toIntOrDefault(value: any, defaultValue: number): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Validates and converts req.params.id to a number
 * @param id - The ID from req.params.id
 * @returns The validated number
 * @throws Error if the ID is invalid
 */
export function validateId(id: any): number {
  // Handle array case (sometimes Express provides params as arrays)
  const idValue = Array.isArray(id) ? id[0] : id;
  return toInt(idValue, 'ID');
}

/**
 * Validates and converts req.user.id to a number
 * @param userId - The user ID from req.user.id
 * @returns The validated number
 * @throws Error if the user ID is invalid
 */
export function validateUserId(userId: any): number {
  return toInt(userId, 'user ID');
}
