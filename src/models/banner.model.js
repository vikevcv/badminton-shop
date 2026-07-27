import pool from '../config/database.js';

export const findAll = async ({ displayDeleted = false, displayInactive = false } = {}) => {
  const isDefault = !displayDeleted && !displayInactive;
  let sql = `SELECT id, title, image_url, link_url, description, sort_order`;
  if (!isDefault) {
    sql += `, status, deleted_at`;
  }
  sql += ` FROM banners WHERE 1 = 1`;
  if (!displayInactive) {
    sql += ` AND status = 'active'`;
  }
  if (!displayDeleted) {
    sql += ` AND deleted_at IS NULL`;
  }
  sql += ` ORDER BY sort_order ASC, created_at DESC`;
  const [rows] = await pool.query(sql);
  return rows;
};

export const findForUpdate = async (id) => {
  const [rows] = await pool.query(
    `SELECT *
     FROM banners
     WHERE id = ?
       AND deleted_at IS NULL`,
    [id]
  );

  return rows[0];
};

export const findPublicById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
        id,
        title,
        image_url,
        link_url,
        description,
        sort_order
     FROM banners
     WHERE id = ?
       AND status = 'active'
       AND deleted_at IS NULL`,
    [id]
  );

  return rows[0];
};

export const findByIdIncludingHidden = async (id) => {
  const [rows] = await pool.query(
    `SELECT *
     FROM banners
     WHERE id = ?`,
    [id]
  );

  return rows[0];
};

export const create = async (data, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `INSERT INTO banners (title, image_url, link_url, description, sort_order, status, upload_status, local_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.image_url, data.link_url || null, data.description || null, data.sort_order || 0, data.status || 'active', data.upload_status || 'completed', data.local_path || null]
  );
  return result.insertId;
};

export const update = async (id, data, conn = null) => {
  const exec = conn || pool;
  const fields = [];
  const params = [];
  const allowed = ['title', 'image_url', 'link_url', 'description', 'sort_order', 'status', 'upload_status', 'local_path', 'cloud_public_id', 'retry_count', 'error_message'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return false;
  params.push(id);
  const [result] = await exec.execute(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
};

export const softDelete = async (id, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `UPDATE banners SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return result.affectedRows > 0;
};

export const shiftUp = async (sortOrder, excludeId = null, conn = null) => {
  const exec = conn || pool;
  const params = [sortOrder];
  let sql = `UPDATE banners SET sort_order = sort_order + 1 WHERE sort_order >= ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }
  await exec.execute(sql, params);
};

export const shiftDown = async (sortOrder, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `UPDATE banners SET sort_order = sort_order - 1 WHERE sort_order > ? AND deleted_at IS NULL`,
    [sortOrder]
  );
};

export const shiftUpRange = async (from, to, excludeId = null, conn = null) => {
  const exec = conn || pool;
  const params = [from, to];
  let sql = `UPDATE banners SET sort_order = sort_order + 1 WHERE sort_order >= ? AND sort_order < ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }
  await exec.execute(sql, params);
};

export const shiftDownRange = async (from, to, excludeId = null, conn = null) => {
  const exec = conn || pool;
  const params = [from, to];
  let sql = `UPDATE banners SET sort_order = sort_order - 1 WHERE sort_order > ? AND sort_order <= ? AND deleted_at IS NULL`;
  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }
  await exec.execute(sql, params);
};

export const findDeletedById = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM banners WHERE id = ? AND deleted_at IS NOT NULL`,
    [id]
  );
  return rows[0];
};

export const restore = async (id, sortOrder, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `UPDATE banners SET deleted_at = NULL, sort_order = ? WHERE id = ? AND deleted_at IS NOT NULL`,
    [sortOrder, id]
  );
  return result.affectedRows > 0;
};

export const existsAtOrAbove = async (sortOrder, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT id FROM banners WHERE sort_order >= ? AND deleted_at IS NULL FOR UPDATE`,
    [sortOrder]
  );
  return rows.length > 0;
};

export const existsInRange = async (from, to, excludeId, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT id FROM banners WHERE sort_order >= ? AND sort_order <= ? AND id != ? AND deleted_at IS NULL FOR UPDATE`,
    [from, to, excludeId]
  );
  return rows.length > 0;
};

export const findPendingUploads = async (maxRetry) => {
  const [rows] = await pool.query(
    `SELECT id, local_path, 'banner' AS type FROM banners
     WHERE upload_status = 'pending_upload' AND retry_count < ?
     ORDER BY created_at ASC LIMIT 10`,
    [maxRetry]
  );
  return rows;
};

export const setUploading = async (id, conn = null) => {
  const exec = conn || pool;
  await exec.query(`UPDATE banners SET upload_status = 'uploading' WHERE id = ?`, [id]);
};

export const setFailed = async (id, errorMessage, conn = null) => {
  const exec = conn || pool;
  await exec.query(
    `UPDATE banners SET upload_status = 'failed', retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
    [errorMessage, id]
  );
};

export const setCompleted = async (id, imageUrl, publicId, conn = null) => {
  const exec = conn || pool;
  await exec.query(
    `UPDATE banners SET image_url = ?, upload_status = 'completed', cloud_public_id = ?, local_path = NULL, error_message = NULL WHERE id = ?`,
    [imageUrl, publicId, id]
  );
};

export const retryFailed = async (maxRetry) => {
  await pool.query(
    `UPDATE banners SET upload_status = 'pending_upload', error_message = NULL
     WHERE upload_status = 'failed' AND retry_count < ?`,
    [maxRetry]
  );
};
