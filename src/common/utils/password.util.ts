import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
};

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

export function needsRehash(hash: string): boolean {
  // Check if password needs rehashing (if it's bcrypt, migrate to Argon2)
  return hash.startsWith('$2'); // bcrypt hashes start with $2
}
































