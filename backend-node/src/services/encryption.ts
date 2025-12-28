import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.SECRETE_KEY || process.env.SECRET_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY or SECRETE_KEY environment variable is required for bank account encryption');
  }
  const hash = crypto.createHash('sha256').update(key).digest();
  return hash;
}

export function encryptBankAccountNumber(accountNumber: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(accountNumber, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decryptBankAccountNumber(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt bank account number');
  }
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return '*'.repeat(accountNumber.length);
  }
  const last4 = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4) + last4;
  return masked;
}

export function getLast4(accountNumber: string): string {
  return accountNumber.slice(-4);
}
