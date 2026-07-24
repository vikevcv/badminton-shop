import pool from '../config/database.js';

export const findAll = async (includeInactive = false) => {
  const where = includeInactive ? '1=1' : "status = 'active'";
  const [rows] = await pool.query(
    `SELECT id, name, slug, logo_url, country, status FROM brands WHERE ${where} AND deleted_at IS NULL ORDER BY name ASC`
  );
  return rows;
};

export const findById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM brands WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
};

export const findBySlug = async (slug) => {
  const [rows] = await pool.query(`SELECT id FROM brands WHERE slug = ? AND deleted_at IS NULL`, [slug]);
  return rows[0] || null;
};

export const findByName = async (name) => {
  const [rows] = await pool.query(`SELECT id FROM brands WHERE name = ? AND deleted_at IS NULL`, [name]);
  return rows[0] || null;
};

export const create = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO brands (name, slug, logo_url, upload_status, local_path, country, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.slug, data.logo_url || null, data.upload_status || 'completed', data.local_path || null, data.country || null, data.status || 'active']
  );
  return result.insertId;
};

const ALLOWED_UPDATE_FIELDS = ['name', 'slug', 'logo_url', 'country', 'status', 'upload_status', 'local_path', 'cloud_public_id', 'retry_count', 'error_message'];

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
  await pool.execute(`UPDATE brands SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
};

export const restoreBrand = async (id) => {
  const [rows] = await pool.query(`SELECT id FROM brands WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  if (!rows[0]) return null;
  await pool.execute(`UPDATE brands SET deleted_at = NULL, deleted_by = NULL, status = 'active' WHERE id = ?`, [id]);
  return rows[0];
};

export const deleteBrand = async (id, deletedBy = null) => {
  if (deletedBy) {
    await pool.execute(`UPDATE brands SET deleted_at = NOW(), status = 'inactive', deleted_by = ? WHERE id = ?`, [deletedBy, id]);
  } else {
    await pool.execute(`UPDATE brands SET deleted_at = NOW(), status = 'inactive' WHERE id = ?`, [id]);
  }
};
