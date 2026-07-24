import pool from '../config/database.js';
import crypto from 'crypto';

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateTokenString = () => {
  return crypto.randomBytes(64).toString('hex');
};

export const create = async (userId, tokenHash, family, expiresAt, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES (?, ?, ?, ?)`,
    [userId, tokenHash, family, expiresAt]
  );
  return result.insertId;
};

export const findByHash = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT rt.* FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id AND u.deleted_at IS NULL
     WHERE rt.token_hash = ? AND u.status = 'active'`,
    [tokenHash]
  );
  return rows[0] || null;
};

export const findValid = async (tokenHash) => {
  const [rows] = await pool.query(
    `SELECT rt.* FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id AND u.deleted_at IS NULL
     WHERE rt.token_hash = ? AND rt.expires_at > NOW() AND rt.revoked_at IS NULL
       AND u.status = 'active'`,
    [tokenHash]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM refresh_tokens WHERE id = ?`, [id]);
  return rows[0] || null;
};

export const findByFamily = async (family) => {
  const [rows] = await pool.query(
    `SELECT * FROM refresh_tokens WHERE family = ? AND revoked_at IS NULL`,
    [family]
  );
  return rows;
};

export const revoke = async (id) => {
  await pool.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`, [id]);
};

export const revokeFamily = async (family) => {
  await pool.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family = ? AND revoked_at IS NULL`,
    [family]
  );
};

export const revokeAllByUserId = async (userId) => {
  await pool.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  );
};

export const cleanExpired = async () => {
  const [result] = await pool.execute(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`);
  return result.affectedRows;
};

export const findByIdForUpdate = async (id, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT * FROM refresh_tokens WHERE id = ? FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
};

export const revokeById = async (id, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`,
    [id]
  );
};
