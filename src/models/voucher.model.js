import pool from '../config/database.js';

export const findAll = async () => {
  const [rows] = await pool.query(
    `SELECT code, discount_type, discount_value, min_order_value, max_discount_amount,
            usage_limit, used_count, start_date, end_date, status
     FROM vouchers
     WHERE status = 'active' AND (end_date IS NULL OR end_date > NOW()) AND deleted_at IS NULL
     ORDER BY created_at DESC`
  );
  return rows;
};

export const findByCode = async (code) => {
  const [rows] = await pool.query(
    `SELECT * FROM vouchers WHERE code = ? AND status = 'active' AND deleted_at IS NULL`,
    [code]
  );
  return rows[0];
};

export const incrementUsedCount = async (id, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?`,
    [id]
  );
};

export const decrementUsedCount = async (id, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `UPDATE vouchers SET used_count = GREATEST(used_count - 1, 0) WHERE id = ?`,
    [id]
  );
};

export const findByCodeAdmin = async (code) => {
  const [rows] = await pool.query('SELECT * FROM vouchers WHERE code = ?', [code]);
  return rows[0];
};

export const findAllAdmin = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM vouchers WHERE deleted_at IS NULL ORDER BY created_at DESC'
  );
  return rows;
};

export const create = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO vouchers (code, discount_type, discount_value, min_order_value, max_discount_amount, usage_limit, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.code, data.discount_type, data.discount_value,
     data.min_order_value || 0, data.max_discount_amount || null,
     data.usage_limit || null, data.start_date || null,
     data.end_date || null, data.status || 'active']
  );
  return result.insertId;
};

export const update = async (id, data) => {
  const fields = [];
  const params = [];
  const allowed = ['code', 'discount_type', 'discount_value', 'min_order_value', 'max_discount_amount', 'usage_limit', 'start_date', 'end_date', 'status'];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return false;
  params.push(id);
  const [result] = await pool.execute(`UPDATE vouchers SET ${fields.join(', ')} WHERE id = ?`, params);
  return result.affectedRows > 0;
};

export const softDelete = async (id) => {
  const [result] = await pool.execute(
    "UPDATE vouchers SET deleted_at = NOW(), status = 'inactive' WHERE id = ? AND deleted_at IS NULL",
    [id]
  );
  return result.affectedRows > 0;
};
