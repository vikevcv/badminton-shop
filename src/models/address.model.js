import pool from '../config/database.js';

export const findByUserId = async (userId, includeDeleted = false) => {
  let query = `SELECT * FROM user_addresses WHERE user_id = ?`;
  if (!includeDeleted) query += ` AND deleted_at IS NULL`;
  query += ` ORDER BY is_default DESC, created_at DESC`;
  const [rows] = await pool.query(query, [userId]);
  return rows;
};

export const findAll = async (includeDeleted = false) => {
  let where = includeDeleted ? '' : 'WHERE ua.deleted_at IS NULL';
  const [rows] = await pool.query(
    `SELECT ua.*, u.full_name AS user_name, u.email AS user_email
     FROM user_addresses ua
     INNER JOIN users u ON ua.user_id = u.id
     ${where}
     ORDER BY ua.user_id, ua.is_default DESC, ua.created_at DESC`
  );
  return rows;
};

export const findById = async (id, includeDeleted = false) => {
  let query = `SELECT * FROM user_addresses WHERE id = ?`;
  if (!includeDeleted) query += ` AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [id]);
  return rows[0];
};

export const create = async (userId, data) => {
  const { receiver_name, receiver_phone, address, is_default } = data;

  if (is_default) {
    await pool.query(
      `UPDATE user_addresses SET is_default = FALSE WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }

  const [result] = await pool.execute(
    `INSERT INTO user_addresses (user_id, receiver_name, receiver_phone, address, is_default) VALUES (?, ?, ?, ?, ?)`,
    [userId, receiver_name, receiver_phone, address, is_default || false]
  );
  return result.insertId;
};

export const update = async (id, data, userId = null) => {
  const { receiver_name, receiver_phone, address, is_default } = data;

  if (is_default) {
    const addressRow = await findById(id);
    if (addressRow) {
      await pool.query(
        `UPDATE user_addresses SET is_default = FALSE WHERE user_id = ? AND deleted_at IS NULL`,
        [addressRow.user_id]
      );
    }
  }

  let query = `UPDATE user_addresses SET receiver_name = ?, receiver_phone = ?, address = ?, is_default = ? WHERE id = ? AND deleted_at IS NULL`;
  const params = [receiver_name, receiver_phone, address, is_default || false, id];

  if (userId !== null) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  const [result] = await pool.execute(query, params);
  return result.affectedRows > 0;
};

export const softDelete = async (id, userId = null, deletedBy = null) => {
  let query = `UPDATE user_addresses SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL`;
  const params = [deletedBy, id];

  if (userId !== null) {
    query += ` AND user_id = ?`;
    params.push(userId);
  }

  const [result] = await pool.execute(query, params);
  return result.affectedRows > 0;
};

export const restore = async (id) => {
  const [rows] = await pool.query(
    `SELECT id FROM user_addresses WHERE id = ? AND deleted_at IS NOT NULL`, [id]
  );
  if (!rows[0]) return null;
  await pool.execute(
    `UPDATE user_addresses SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`, [id]
  );
  return rows[0];
};
