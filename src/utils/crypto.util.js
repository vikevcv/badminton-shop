import crypto from 'crypto';

export const generateToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

export const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');