/**
 * Password Utility Functions
 * 
 * Provides secure password hashing and verification using Argon2 (primary)
 * with bcrypt fallback for legacy password migration.
 * 
 * @module password.util
 */

import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Hash a password using Argon2 (with bcrypt fallback)
 * 
 * Uses Argon2id for new passwords, which is more secure than bcrypt.
 * Falls back to bcrypt if Argon2 is unavailable (for compatibility).
 * 
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password string
 * 
 * @example
 * ```typescript
 * const hash = await hashPassword('SecurePassword123!');
 * // Returns Argon2 hash: $argon2id$v=19$m=65536,t=3,p=4$...
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  // Use Argon2 for new passwords, but support bcrypt for migration
  try {
    return await argon2.hash(password, ARGON2_OPTIONS);
  } catch (error) {
    // Fallback to bcrypt if Argon2 fails
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}

/**
 * Verify a password against a hash
 * 
 * Supports both Argon2 and bcrypt hashes for backward compatibility.
 * Automatically detects hash type and uses appropriate verification method.
 * 
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Hashed password to compare against
 * @returns {Promise<boolean>} True if password matches, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('SecurePassword123!', storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  // Try Argon2 first
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Fallback to bcrypt for legacy passwords
    return bcrypt.compare(password, hash);
  }
}

/**
 * Check if a password hash needs to be rehashed
 * 
 * Determines if a password hash is using the old bcrypt format and should
 * be migrated to Argon2 for better security.
 * 
 * @param {string} hash - Password hash to check
 * @returns {boolean} True if hash needs rehashing (is bcrypt), false otherwise
 * 
 * @example
 * ```typescript
 * if (needsRehash(user.password)) {
 *   // Rehash password on next login
 * }
 * ```
 */
export function needsRehash(hash: string): boolean {
  // Check if password needs rehashing (if it's bcrypt, migrate to Argon2)
  return hash.startsWith('$2'); // bcrypt hashes start with $2
}
































