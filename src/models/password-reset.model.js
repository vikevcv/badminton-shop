import pool from '../config/database.js';

import crypto from 'crypto';

export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const create = async (email, token) => {
  await pool.execute(
    `INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
     ON DUPLICATE KEY UPDATE token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
    [email, token, token]
  );
};

export const findByToken = async (token) => {
  const [rows] = await pool.query(
    `SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()`,
    [token]
  );
  return rows[0];
};

export const deleteByEmail = async (email) => {
  await pool.execute(`DELETE FROM password_resets WHERE email = ?`, [email]);
};
