import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

const getEncryptionKey = () => {
  const encodedKey = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error('AI_CREDENTIALS_ENCRYPTION_KEY is missing');
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('AI_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return key;
};

export const encryptApiKey = (apiKey) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return {
    encryptedApiKey: Buffer.concat([ciphertext, cipher.getAuthTag()]).toString('base64'),
    encryptionIv: iv.toString('base64'),
  };
};

export const decryptApiKey = ({ encryptedApiKey, encryptionIv }) => {
  const encrypted = Buffer.from(encryptedApiKey, 'base64');
  const authTag = encrypted.subarray(-16);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), Buffer.from(encryptionIv, 'base64'));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]).toString('utf8');
};
