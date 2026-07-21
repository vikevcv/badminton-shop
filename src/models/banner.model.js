import pool from '../config/database.js';

export const findAllActive = async () => {
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, description, sort_order
     FROM banners
     WHERE status = 'active' AND deleted_at IS NULL
     ORDER BY sort_order ASC, created_at DESC`
  );
  return rows;
};

export const findAllAdmin = async (includeDeleted = false) => {
  const sql = includeDeleted
    ? `SELECT * FROM banners ORDER BY deleted_at ASC, sort_order ASC, created_at DESC`
    : `SELECT * FROM banners WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at DESC`;
  const [rows] = await pool.query(sql);
  return rows;
};

export const findByIdAdmin = async (id, includeDeleted = false) => {
  const sql = includeDeleted
    ? `SELECT * FROM banners WHERE id = ?`
    : `SELECT * FROM banners WHERE id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0];
};

export const create = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO banners (title, image_url, link_url, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.title, data.image_url, data.link_url || null, data.description || null, data.sort_order || 0, data.status || 'active']
  );
  return result.insertId;
};

export const update = async (id, data) => {
  const fields = [];
  const params = [];
  const allowed = ['title', 'image_url', 'link_url', 'description', 'sort_order', 'status'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return false;
  params.push(id);
  const [result] = await pool.execute(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
};

export const softDelete = async (id) => {
  const [result] = await pool.execute(
    `UPDATE banners SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows > 0;
};

export const shiftUp = async (sortOrder, excludeId = null) => {
  const params = [sortOrder];
  let sql = `UPDATE banners SET sort_order = sort_order + 1 WHERE sort_order >= ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }
  await pool.execute(sql, params);
};

export const shiftDown = async (sortOrder) => {
  await pool.execute(
    `UPDATE banners SET sort_order = sort_order - 1 WHERE sort_order > ? AND deleted_at IS NULL`,
    [sortOrder]
  );
};

export const findDeletedById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM banners WHERE id = ? AND deleted_at IS NOT NULL`,
    [id]
  );
  return rows[0];
};

export const restore = async (id, sortOrder) => {
  const [result] = await pool.execute(
    `UPDATE banners SET deleted_at = NULL, sort_order = ? WHERE id = ? AND deleted_at IS NOT NULL`,
    [sortOrder, id]
  );
  return result.affectedRows > 0;
};
