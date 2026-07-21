import pool from '../config/database.js';

import crypto from 'crypto';

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const add = async (tokenHash, expiresAt) => {
  await pool.execute(
    `INSERT INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)`,
    [tokenHash, expiresAt]
  );
};

export const isBlacklisted = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows.length > 0;
};

export const cleanExpired = async () => {
  await pool.execute(`DELETE FROM token_blacklist WHERE expires_at <= NOW()`);
};
