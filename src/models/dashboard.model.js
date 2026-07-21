import pool from '../config/database.js';

export const getRevenueStats = async () => {
  const [[{ totalRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(final_amount), 0) AS totalRevenue
     FROM orders WHERE status IN ('completed','shipping','confirmed')`
  );
  const [[{ todayRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(final_amount), 0) AS todayRevenue
     FROM orders WHERE status IN ('completed','shipping','confirmed')
     AND DATE(created_at) = CURDATE()`
  );
  const [[{ thisMonthRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(final_amount), 0) AS thisMonthRevenue
     FROM orders WHERE status IN ('completed','shipping','confirmed')
     AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())`
  );
  const [[{ pendingRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(final_amount), 0) AS pendingRevenue
     FROM orders WHERE status = 'pending_payment'`
  );
  return { totalRevenue, todayRevenue, thisMonthRevenue, pendingRevenue };
};

export const getOrderStats = async () => {
  const [[{ totalOrders }]] = await pool.query(`SELECT COUNT(*) AS totalOrders FROM orders`);
  const [[{ todayOrders }]] = await pool.query(
    `SELECT COUNT(*) AS todayOrders FROM orders WHERE DATE(created_at) = CURDATE()`
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
    `SELECT COUNT(*) AS todayRegistrations FROM users WHERE role = 'customer' AND DATE(created_at) = CURDATE()`
  );
  return { totalUsers, todayRegistrations };
};

export const getTopProducts = async (limit = 10) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug, pv.price,
            COUNT(oi.id) AS totalSold,
            COALESCE(SUM(oi.quantity), 0) AS totalQuantity
     FROM products p
     INNER JOIN product_variants pv ON p.id = pv.product_id AND pv.deleted_at IS NULL
     INNER JOIN order_items oi ON pv.id = oi.variant_id
     INNER JOIN orders o ON oi.order_id = o.id
     WHERE o.status IN ('completed','shipping','confirmed')
       AND p.deleted_at IS NULL
     GROUP BY p.id, p.name, p.slug, pv.price
     ORDER BY totalQuantity DESC
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
    `SELECT DATE(created_at) AS date,
            COUNT(*) AS orderCount,
            COALESCE(SUM(final_amount), 0) AS revenue
     FROM orders
     WHERE status IN ('completed','shipping','confirmed')
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
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
