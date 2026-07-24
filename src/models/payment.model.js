import pool from '../config/database.js';

import crypto from 'crypto';

export const generatePaymentCode = () => {
  return 'PAY' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
};

export const create = async (data) => {
  const { order_id, payment_code, provider, method, amount, status } = data;
  const [result] = await pool.execute(
    `INSERT INTO payments (order_id, payment_code, provider, method, amount, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [order_id, payment_code, provider, method, amount, status || 'pending']
  );
  return result.insertId;
};

export const findByPaymentCode = async (paymentCode) => {
  const [rows] = await pool.query(`SELECT * FROM payments WHERE payment_code = ?`, [paymentCode]);
  return rows[0];
};

export const updateStatus = async (id, status, transactionId = null, gatewayResponse = null, conn = null) => {
  const exec = conn || pool;
  const params = [status];
  let query = `UPDATE payments SET status = ?`;

  if (transactionId) {
    query += `, transaction_id = ?`;
    params.push(transactionId);
  }
  if (gatewayResponse) {
    query += `, gateway_response = ?`;
    params.push(JSON.stringify(gatewayResponse));
  }
  if (status === 'success') {
    query += `, paid_at = NOW()`;
  }

  query += ` WHERE id = ?`;
  params.push(id);
  await exec.execute(query, params);
};

export const findByOrderId = async (orderId) => {
  const [rows] = await pool.query('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [orderId]);
  return rows;
};

export const findPendingByOrderId = async (orderId) => {
  const [rows] = await pool.query(
    "SELECT * FROM payments WHERE order_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [orderId]
  );
  return rows[0];
};
