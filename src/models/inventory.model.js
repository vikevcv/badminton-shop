import pool from '../config/database.js';

export const findByVariantId = async (variantId, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT * FROM inventories WHERE variant_id = ?`,
    [variantId]
  );
  return rows[0];
};

export const findByVariantIdForUpdate = async (variantId, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT * FROM inventories WHERE variant_id = ? FOR UPDATE`,
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

export const setQuantity = async (variantId, quantity, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `UPDATE inventories SET quantity = ? WHERE variant_id = ?`,
    [quantity, variantId]
  );
};

export const decrementStock = async (variantId, quantity, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `UPDATE inventories SET quantity = quantity - ? WHERE variant_id = ? AND quantity >= ?`,
    [quantity, variantId, quantity]
  );
  return result.affectedRows > 0;
};

export const logTransaction = async (data, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, reference_type, reference_id, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.variant_id, data.transaction_type, data.quantity,
     data.reference_type || 'manual', data.reference_id || null,
     data.note || null, data.created_by || null]
  );
};

export const createInventory = async (variantId, quantity = 0) => {
  await pool.execute(
    `INSERT INTO inventories (variant_id, quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
    [variantId, quantity]
  );
};

export const countInventory = async (whereClause, params) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM inventories inv
     INNER JOIN product_variants pv
       ON inv.variant_id = pv.id
     INNER JOIN products p
       ON pv.product_id = p.id
     ${whereClause}`,
    params
  );

  return rows[0].total;
};

export const findInventory = async (whereClause, params, limit, offset) => {
  const [rows] = await pool.query(
    `SELECT
        inv.id,
        inv.variant_id,
        inv.quantity,
        inv.reserved_quantity,
        pv.sku,
        pv.status AS variant_status,
        p.name AS product_name,
        c.name AS category_name
     FROM inventories inv
     INNER JOIN product_variants pv
       ON inv.variant_id = pv.id
     INNER JOIN products p
       ON pv.product_id = p.id
     LEFT JOIN categories c
       ON p.category_id = c.id
     ${whereClause}
     ORDER BY inv.quantity ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};

export const countTransactions = async (
  whereClause,
  params
) => {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM inventory_transactions it
      ${whereClause}
    `,
    params
  );

  return rows[0].total;
};
export const findTransactions = async (
  whereClause,
  params,
  limit,
  offset
) => {
  const [rows] = await pool.query(
    `
      SELECT
          it.*,
          pv.sku,
          p.name AS product_name
      FROM inventory_transactions it
      INNER JOIN product_variants pv
          ON it.variant_id = pv.id
      INNER JOIN products p
          ON pv.product_id = p.id
      ${whereClause}
      ORDER BY it.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return rows;
};