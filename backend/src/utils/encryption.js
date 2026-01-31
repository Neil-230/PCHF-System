import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const REQUIRED_KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12; // Recommended for GCM
const ALGORITHM = 'aes-256-gcm';

if (!process.env.ENCRYPTION_KEY) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: envPath });
}

const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey) {
  throw new Error('Missing ENCRYPTION_KEY. Please set a 32-byte base64 string in the backend .env file.');
}

let keyBuffer;
try {
  // Prefer base64 decoding; fall back to utf8 if length already matches
  const base64Decoded = Buffer.from(rawKey, 'base64');
  if (base64Decoded.length === REQUIRED_KEY_LENGTH) {
    keyBuffer = base64Decoded;
  } else if (rawKey.length === REQUIRED_KEY_LENGTH) {
    keyBuffer = Buffer.from(rawKey, 'utf8');
  } else {
    throw new Error(`ENCRYPTION_KEY must decode to ${REQUIRED_KEY_LENGTH} bytes. Got ${base64Decoded.length}.`);
  }
} catch (err) {
  throw new Error(`Invalid ENCRYPTION_KEY. ${err?.message || err}`);
}

export const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
export const normalizePhone = (value) => (typeof value === 'string' ? value.replace(/[^0-9+]/g, '').trim() : '');

export const hashValue = (value) => {
  if (!value) return '';
  return crypto.createHash('sha256').update(value).digest('hex');
};

export const hashEmail = (value) => {
  const normalized = normalizeEmail(value);
  return hashValue(normalized);
};

export const encryptValue = (value) => {
  if (value == null) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
};

export const decryptValue = (payload) => {
  if (!payload || typeof payload !== 'string') return null;
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) return null;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encryptedData = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
};

export const isEncryptedPayload = (value) => typeof value === 'string' && value.split('.').length === 3;
