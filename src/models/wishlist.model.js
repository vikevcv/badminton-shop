import pool from '../config/database.js';

export const findByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT w.id, w.product_id, w.created_at,
            p.name, p.slug,
            MIN(pv.price) AS price,
            pi.image_url
     FROM wishlists w
     INNER JOIN products p ON w.product_id = p.id AND p.status = 'active' AND p.deleted_at IS NULL
     LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active' AND pv.deleted_at IS NULL
     LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
      WHERE w.user_id = ? AND w.deleted_at IS NULL
     GROUP BY w.id, w.product_id, w.created_at, p.name, p.slug, pi.image_url
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
};

export const findOne = async (userId, productId) => {
  const [rows] = await pool.query(
    `SELECT * FROM wishlists WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return rows[0];
};

export const create = async (userId, productId) => {
  const [result] = await pool.execute(
    `INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)`,
    [userId, productId]
  );
  return result.insertId;
};

export const reactivate = async (userId, productId) => {
  const [result] = await pool.execute(
    `UPDATE wishlists SET deleted_at = NULL WHERE user_id = ? AND product_id = ?`,
    [userId, productId]
  );
  return result.affectedRows > 0;
};

export const remove = async (userId, productId) => {
  const [result] = await pool.execute(
    `UPDATE wishlists SET deleted_at = NOW() WHERE user_id = ? AND product_id = ? AND deleted_at IS NULL`,
    [userId, productId]
  );
  return result.affectedRows > 0;
};

export const removeById = async (id) => {
  const [result] = await pool.execute(
    `UPDATE wishlists SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows > 0;
};

export const countByUser = async (userId) => {
  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) AS count FROM wishlists WHERE user_id = ? AND deleted_at IS NULL`,
    [userId]
  );
  return count;
};
