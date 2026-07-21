import pool from '../config/database.js';

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`, [email]);
  return rows[0];
};

export const findUserByPhone = async (phone) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL`, [phone]);
  return rows[0];
};

export const findUserById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0];
};

export const createUser = async (userData) => {
  const { fullName, email, hashedPassword, phone } = userData;
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)`,
    [fullName, email, hashedPassword, phone]
  );
  return result.insertId;
};

export const updatePassword = async (userId, hashedPassword) => {
  await pool.execute(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, userId]);
};

export const updateProfile = async (userId, data) => {
  const { full_name, phone } = data;
  if (phone !== undefined) {
    await pool.execute(`UPDATE users SET full_name = ?, phone = ? WHERE id = ?`, [full_name, phone, userId]);
  } else {
    await pool.execute(`UPDATE users SET full_name = ? WHERE id = ?`, [full_name, userId]);
  }
};

export const updatePasswordByEmail = async (email, hashedPassword) => {
  await pool.execute(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email]);
};

export const searchCustomers = async (keyword, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const where = ["role = 'customer'"];
  const params = [];

  if (keyword) {
    where.push(`(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)`);
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM users ${whereClause}`, params
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, status, created_at
     FROM users ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { customers: rows, total };
};

export const findAllUsers = async ({ role, status, keyword, page, limit }) => {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (role) { where.push(`role = ?`); params.push(role); }
  if (status) { where.push(`u.status = ?`); params.push(status); }
  if (keyword) {
    where.push(`(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`);
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM users u ${whereClause}`, params
  );
  const total = countResult[0].total;

  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status,
            u.email_verified_at, u.created_at, u.updated_at
     FROM users u ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  return { users: rows, total };
};

export const findUserByIdAdmin = async (id) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status,
            u.email_verified_at, u.created_at, u.updated_at,
            COALESCE(cp.total_spent, 0) AS total_spent,
            COALESCE(cp.reward_points, 0) AS reward_points,
            cp.membership_level, cp.birthday
     FROM users u
     LEFT JOIN customer_profiles cp ON u.id = cp.user_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0];
};

export const updateUserStatus = async (userId, status, changedBy) => {
  if (status === 'banned') {
    await pool.execute(
      `UPDATE users SET status = ?, token_version = token_version + 1, updated_at = NOW() WHERE id = ?`,
      [status, userId]
    );
  } else {
    await pool.execute(
      `UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, userId]
    );
  }
};

export const updateUserRole = async (userId, role) => {
  await pool.execute(
    `UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?`,
    [role, userId]
  );
};