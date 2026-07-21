import pool from '../config/database.js';

export const findByVariantId = async (variantId) => {
  const [rows] = await pool.query(
    `SELECT * FROM inventories WHERE variant_id = ?`,
    [variantId]
  );
  return rows[0];
};

export const addStock = async (variantId, quantity, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `UPDATE inventories SET quantity = quantity + ? WHERE variant_id = ?`,
    [quantity, variantId]
  );
  return result.affectedRows > 0;
};

export const createInventory = async (variantId, quantity = 0) => {
  await pool.execute(
    `INSERT INTO inventories (variant_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
    [variantId, quantity]
  );
};

export const findAllWithProduct = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = ["pv.status != 'discontinued'"];
  const params = [];

  if (filters.keyword) {
    where.push(`(p.name LIKE ? OR pv.sku LIKE ?)`);
    const kw = `%${filters.keyword}%`;
    params.push(kw, kw);
  }
  if (filters.lowStock !== undefined) {
    where.push(`inv.quantity <= ?`);
    params.push(Number(filters.lowStock));
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM inventories inv
     INNER JOIN product_variants pv ON inv.variant_id = pv.id
     INNER JOIN products p ON pv.product_id = p.id
     ${whereClause}`, params
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT inv.id, inv.variant_id, inv.quantity, inv.reserved_quantity,
            pv.sku, pv.price, pv.status AS variant_status,
            p.name AS product_name, p.slug AS product_slug,
            c.name AS category_name
     FROM inventories inv
     INNER JOIN product_variants pv ON inv.variant_id = pv.id
     INNER JOIN products p ON pv.product_id = p.id
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ORDER BY inv.quantity ASC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { items: rows, total };
};

export const updateStockQuantity = async (variantId, quantity) => {
  await pool.execute(
    `UPDATE inventories SET quantity = ? WHERE variant_id = ?`,
    [quantity, variantId]
  );
};

export const logTransaction = async (data) => {
  await pool.execute(
    `INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, reference_type, reference_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.variant_id, data.transaction_type, data.quantity,
     data.reference_type || 'manual', data.reference_id || null,
     data.note || null, data.created_by || null]
  );
};

export const getTransactions = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (filters.variant_id) {
    where.push(`it.variant_id = ?`);
    params.push(Number(filters.variant_id));
  }
  if (filters.type) {
    where.push(`it.transaction_type = ?`);
    params.push(filters.type);
  }
  if (filters.fromDate) {
    where.push(`it.created_at >= ?`);
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    where.push(`it.created_at <= ?`);
    params.push(filters.toDate);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM inventory_transactions it ${whereClause}`, params
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT it.*, pv.sku, p.name AS product_name
     FROM inventory_transactions it
     INNER JOIN product_variants pv ON it.variant_id = pv.id
     INNER JOIN products p ON pv.product_id = p.id
     ${whereClause}
     ORDER BY it.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { transactions: rows, total };
};
