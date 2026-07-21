import pool from '../config/database.js';

export const findByProductSlug = async (slug, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM product_reviews pr
     INNER JOIN products p ON pr.product_id = p.id
      WHERE p.slug = ? AND pr.deleted_at IS NULL`,
    [slug]
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT pr.id, pr.rating, pr.comment, pr.created_at,
            u.full_name AS user_name
     FROM product_reviews pr
     INNER JOIN products p ON pr.product_id = p.id
     INNER JOIN users u ON pr.user_id = u.id
     WHERE p.slug = ? AND pr.deleted_at IS NULL
     ORDER BY pr.created_at DESC
     LIMIT ? OFFSET ?`,
    [slug, Number(limit), Number(offset)]
  );

  return { reviews: rows, total };
};

export const findByUserAndProduct = async (userId, productId) => {
  const [rows] = await pool.query(
    `SELECT * FROM product_reviews WHERE user_id = ? AND product_id = ? AND deleted_at IS NULL`,
    [userId, productId]
  );
  return rows[0];
};

export const create = async (userId, productId, rating, comment) => {
  const [result] = await pool.execute(
    `INSERT INTO product_reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)`,
    [userId, productId, rating, comment]
  );
  return result.insertId;
};

export const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT pr.*, u.id AS user_id FROM product_reviews pr
     INNER JOIN users u ON pr.user_id = u.id
     WHERE pr.id = ? AND pr.deleted_at IS NULL`,
    [id]
  );
  return rows[0];
};

export const updateReview = async (id, rating, comment) => {
  const [result] = await pool.execute(
    `UPDATE product_reviews SET rating = ?, comment = ? WHERE id = ?`,
    [rating, comment, id]
  );
  return result.affectedRows > 0;
};

export const deleteReview = async (id) => {
  const [result] = await pool.execute(
    `UPDATE product_reviews SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows > 0;
};
