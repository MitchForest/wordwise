import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Get the system secret from environment or use a fallback for build time
 */
const getSystemSecret = (): string => {
  // Use a build-time fallback to prevent build errors
  // In production, this should always come from environment
  return process.env.BETTER_AUTH_SECRET || 'build-time-fallback-secret';
};

/**
 * Derive a user-specific encryption key
 * @param userId - The unique user ID
 * @param salt - The salt for key derivation
 */
const deriveUserKey = (userId: string, salt: Buffer): Buffer => {
  // Combine system secret with user ID to create a unique key per user
  const userSecret = `${getSystemSecret()}-${userId}`;
  return crypto.pbkdf2Sync(userSecret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');
};

/**
 * Encrypt data for a specific user
 * @param text - The text to encrypt
 * @param userId - The user ID to derive the encryption key
 */
export const encryptForUser = (text: string, userId: string): string => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveUserKey(userId, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, tag, encrypted]).toString('hex');
};

/**
 * Decrypt data for a specific user
 * @param encryptedText - The encrypted text
 * @param userId - The user ID to derive the decryption key
 */
export const decryptForUser = (encryptedText: string, userId: string): string => {
  const data = Buffer.from(encryptedText, 'hex');
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveUserKey(userId, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = decipher.update(encrypted.toString('binary'), 'binary', 'utf8') + decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed. The encrypted data may be corrupt or the key is incorrect.");
  }
};

// Keep the old functions for backward compatibility but mark them as deprecated
/**
 * @deprecated Use encryptForUser instead
 */
export const encrypt = (): string => {
  throw new Error('encrypt() is deprecated. Use encryptForUser(text, userId) instead.');
};

/**
 * @deprecated Use decryptForUser instead
 */
export const decrypt = (): string => {
  throw new Error('decrypt() is deprecated. Use decryptForUser(encryptedText, userId) instead.');
}; 