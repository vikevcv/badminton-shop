import pool from '../config/database.js';

export const findUserByEmail = async (email) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`, [email]);
  return rows[0];
};

export const findUserByPhone = async (phone) => {
  const [rows] = await pool.query(`SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL`, [phone]);
  return rows[0];
};

export const findUserById = async (id, conn = null) => {
  const exec = conn || pool;
  const [rows] = await exec.query(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`, [id]);
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

export const countCustomers = async (whereClause, params) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM users
     ${whereClause}`,
    params
  );

  return rows[0].total;
};
export const searchCustomers = async (whereClause, params, limit, offset) => {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, phone, status, created_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
};
export const countAll = async (whereClause, params) => {
  const [result] = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereClause}
    `,
    params
  );

  return result[0].total;
};
export const findAll = async ( whereClause, params, limit, offset ) => {
  const [rows] = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.email_verified_at,
        u.created_at,
        u.updated_at
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  return rows;
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

export const updateUserStatus = async (userId, status) => {
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

export const findUserForAuth = async (id) => {
  const [rows] = await pool.query(
    `SELECT status, token_version FROM users WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0];
};

export const updateUserRole = async (userId, role) => {
  await pool.execute(
    `UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?`,
    [role, userId]
  );
};

export const incrementTokenVersion = async (userId) => {
  await pool.execute(
    `UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = ?`,
    [userId]
  );
};