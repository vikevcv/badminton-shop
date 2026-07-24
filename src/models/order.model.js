import pool from '../config/database.js';

export const createOrder = async (data, conn = null) => {
  const exec = conn || pool;
  const {
    user_id, voucher_id, order_code, subtotal,
    discount_amount, shipping_fee, final_amount,
    receiver_name, receiver_phone, receiver_address, note
  } = data;

  const [result] = await exec.execute(
    `INSERT INTO orders (user_id, voucher_id, order_code, subtotal, discount_amount, shipping_fee, final_amount, status, receiver_name, receiver_phone, receiver_address, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?)`,
    [user_id, voucher_id, order_code, subtotal, discount_amount, shipping_fee, final_amount, receiver_name, receiver_phone, receiver_address, note]
  );
  return result.insertId;
};

export const createOrderItem = async (orderId, variantId, quantity, unitPrice, totalPrice, metadata = null, conn = null) => {
  const exec = conn || pool;
  const metaJson = metadata ? JSON.stringify(metadata) : null;
  await exec.execute(
    `INSERT INTO order_items (order_id, variant_id, quantity, unit_price, total_price, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
    [orderId, variantId, quantity, unitPrice, totalPrice, metaJson]
  );
};

export const findByUserId = async (userId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM orders WHERE user_id = ?`,
    [userId]
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, Number(limit), Number(offset)]
  );
  return { orders: rows, total };
};

export const findAll = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (filters.status) {
    where.push(`o.status = ?`);
    params.push(filters.status);
  }
  if (filters.keyword) {
    where.push(`(o.order_code LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)`);
    const kw = `%${filters.keyword}%`;
    params.push(kw, kw, kw);
  }
  if (filters.fromDate) {
    where.push(`o.created_at >= ?`);
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    where.push(`o.created_at <= ?`);
    params.push(filters.toDate);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM orders o ${whereClause}`, params
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT o.*, u.full_name AS user_name, u.email AS user_email
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     ${whereClause}
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { orders: rows, total };
};

export const findByOrderCode = async (orderCode, userId = null) => {
  let query = `SELECT o.*, u.full_name AS user_name, u.email AS user_email FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.order_code = ?`;
  const params = [orderCode];
  if (userId !== null) {
    query += ` AND o.user_id = ?`;
    params.push(userId);
  }
  const [rows] = await pool.query(query, params);
  return rows[0];
};

export const findItemsByOrderId = async (orderId) => {
  const [rows] = await pool.query(
    `SELECT oi.*, pv.sku, pv.price, p.name AS product_name, p.slug AS product_slug,
            pi.image_url
     FROM order_items oi
     INNER JOIN product_variants pv ON oi.variant_id = pv.id
     INNER JOIN products p ON pv.product_id = p.id
     LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
     WHERE oi.order_id = ?`,
    [orderId]
  );
  return rows;
};

export const updateStatus = async (orderId, status) => {
  await pool.execute(`UPDATE orders SET status = ? WHERE id = ?`, [status, orderId]);
};

export const updateShipping = async (orderId, shippingProvider, trackingCode) => {
  await pool.execute(
    `UPDATE orders SET shipping_provider = ?, tracking_code = ? WHERE id = ?`,
    [shippingProvider, trackingCode, orderId]
  );
};

export const findById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM orders WHERE id = ?`, [id]);
  return rows[0];
};

export const findByIdForUpdate = async (id, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(`SELECT * FROM orders WHERE id = ? FOR UPDATE`, [id]);
  return rows[0];
};

export const lockById = async (id, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT id, status FROM orders WHERE id = ? FOR UPDATE`, [id]
  );
  return rows[0];
};

export const lockByOrderCode = async (orderCode, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(
    `SELECT * FROM orders WHERE order_code = ? FOR UPDATE`, [orderCode]
  );
  return rows[0];
};

export const updateStatusWithHistory = async (orderId, fromStatus, toStatus, changedBy, note = null, conn = null) => {
  const exec = conn || pool;
  await exec.execute('UPDATE orders SET status = ? WHERE id = ?', [toStatus, orderId]);
  await exec.execute(
    'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
    [orderId, fromStatus, toStatus, changedBy, note]
  );
};

export const updateStatusAndCancelReason = async (orderId, status, cancelReason, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    'UPDATE orders SET status = ?, cancel_reason = ? WHERE id = ?',
    [status, cancelReason, orderId]
  );
};

export const addStatusHistory = async (orderId, fromStatus, toStatus, changedBy, note = null, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    'INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
    [orderId, fromStatus, toStatus, changedBy, note]
  );
};

export const getStatusHistory = async (orderId) => {
  const [rows] = await pool.execute(
    `SELECT osh.*, u.full_name AS changed_by_name
     FROM order_status_history osh
     LEFT JOIN users u ON osh.changed_by = u.id
     WHERE osh.order_id = ?
     ORDER BY osh.id DESC`,
    [orderId]
  );
  return rows;
};


