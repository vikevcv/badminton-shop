import pool from '../config/database.js';

export const findAll = async () => {
  const [rows] = await pool.query(
    `SELECT id, name, slug FROM categories WHERE deleted_at IS NULL ORDER BY name ASC`
  );
  return rows;
};

export const findById = async (id, includeDeleted = false) => {
  const query = includeDeleted ? `SELECT * FROM categories WHERE id = ?` 
                            : `SELECT id, name, slug, description FROM categories WHERE id = ? AND deleted_at IS NULL`;
  const [rows] = await pool.query(query, [id]);
  return rows[0] || null;
};
export const findDeletedById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM categories WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  return rows[0] || null;
};

export const findBySlug = async (slug) => {
  const [rows] = await pool.query(`SELECT id FROM categories WHERE slug = ? AND deleted_at IS NULL`, [slug]);
  return rows[0] || null;
};

export const findByName = async (name) => {
  const [rows] = await pool.query(`SELECT id FROM categories WHERE name = ? AND deleted_at IS NULL`, [name]);
  return rows[0] || null;
};

export const create = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)`,
    [data.name, data.slug, data.description || null]
  );
  return result.insertId;
};

const ALLOWED_UPDATE_FIELDS = ['name', 'slug', 'description'];

export const update = async (id, data) => {
  const fields = [];
  const params = [];
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  params.push(id);
  await pool.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
};

export const restoreCategory = async (id) => {
  await pool.execute(`UPDATE categories SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`, [id]);
};

export const deleteCategory = async (id, deletedBy = null) => {
  if (deletedBy) {
    await pool.execute(`UPDATE categories SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`, [deletedBy, id]);
  } else {
    await pool.execute(`UPDATE categories SET deleted_at = NOW() WHERE id = ?`, [id]);
  }
};
