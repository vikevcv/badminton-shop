import pool from '../config/database.js';

const toNumber = (value) => Number(value ?? 0);
export const getRevenueStats = async () => {
  const [[{ totalRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(subtotal - discount_amount), 0) AS totalRevenue
     FROM orders WHERE status = 'completed'`
  );
  const [[{ todayRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(subtotal - discount_amount), 0) AS todayRevenue
     FROM orders WHERE status = 'completed'
     AND created_at >= CURDATE()
     AND created_at < CURDATE() + INTERVAL 1 DAY`
  );
  const [[{ thisMonthRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(subtotal - discount_amount), 0) AS thisMonthRevenue
     FROM orders WHERE status = 'completed'
     AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
     AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01') + INTERVAL 1 MONTH`
  );
  const [[{ awaitingRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(subtotal - discount_amount), 0) AS awaitingRevenue
     FROM orders WHERE status = 'pending_payment'`
  );
  return {
    totalRevenue: toNumber(totalRevenue),
    todayRevenue: toNumber(todayRevenue),
    thisMonthRevenue: toNumber(thisMonthRevenue),
    awaitingRevenue: toNumber(awaitingRevenue)
  };
};

export const getOrderStats = async () => {
  const [[{ totalOrders }]] = await pool.query(`SELECT COUNT(*) AS totalOrders FROM orders`);
  const [[{ todayOrders }]] = await pool.query(
    `SELECT COUNT(*) AS todayOrders FROM orders WHERE created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY`
  );
  const [[{ pendingOrders }]] = await pool.query(
    `SELECT COUNT(*) AS pendingOrders FROM orders WHERE status = 'pending_payment'`
  );
  const [[{ completedOrders }]] = await pool.query(
    `SELECT COUNT(*) AS completedOrders FROM orders WHERE status = 'completed'`
  );
  const [[{ cancelledOrders }]] = await pool.query(
    `SELECT COUNT(*) AS cancelledOrders FROM orders WHERE status = 'cancelled'`
  );
  return { totalOrders, todayOrders, pendingOrders, completedOrders, cancelledOrders };
};

export const getUserStats = async () => {
  const [[{ totalUsers }]] = await pool.query(`SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'customer' AND deleted_at IS NULL`);
  const [[{ todayRegistrations }]] = await pool.query(
    `SELECT COUNT(*) AS todayRegistrations FROM users WHERE role = 'customer' AND created_at >= CURDATE() AND created_at < CURDATE() + INTERVAL 1 DAY`
  );
  return { totalUsers, todayRegistrations };
};

export const getTopProducts = async (limit = 10) => {
  const [rows] = await pool.query(
    `SELECT
        p.id,
        p.name,
        p.slug,
        SUM(oi.quantity) AS totalSold
    FROM products p
    INNER JOIN product_variants pv
        ON pv.product_id = p.id
    INNER JOIN order_items oi
        ON oi.variant_id = pv.id
    INNER JOIN orders o
        ON o.id = oi.order_id
    WHERE o.status IN ('completed', 'shipping', 'confirmed')
    AND p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY totalSold DESC
    LIMIT ?`,
    [Number(limit)]
  );
  return rows;
};

export const getRecentOrders = async (limit = 10) => {
  const [rows] = await pool.query(
    `SELECT o.id, o.order_code, o.final_amount, o.status, o.created_at,
            u.full_name AS user_name
     FROM orders o
     INNER JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC
     LIMIT ?`,
    [Number(limit)]
  );
  return rows;
};

export const getRevenueByDay = async (days = 30) => {
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS revenueDate,
            COUNT(*) AS orderCount,
            COALESCE(SUM(subtotal - discount_amount), 0) AS revenue
     FROM orders
     WHERE status = 'completed'
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY revenueDate ASC`,
    [Number(days)]
  );
  return rows;
};

export const getStatusDistribution = async () => {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC`
  );
  return rows;
};
