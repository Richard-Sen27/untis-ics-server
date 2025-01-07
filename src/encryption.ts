import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local'});

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; // Must be 32 bytes for AES-256
const IV_LENGTH = 16; // AES requires a 16-byte IV

// Encryption function
export function encrypt(data: Record<string, string>): string {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        throw new Error('Invalid ENCRYPTION_KEY in environment. Must be 64 hexadecimal characters.');
    }

    const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
  
    // Return IV and encrypted data as a single token
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(encrypted: string): Record<string, string> {
    const [ivHex, encryptedDataHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');
  
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
  
    return JSON.parse(decrypted.toString());
}