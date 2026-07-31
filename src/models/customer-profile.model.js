import pool from '../config/database.js';

export const findByUserId = async (userId) => {
  const [rows] = await pool.query(
    `SELECT user_id, total_spent, reward_points, membership_level, birthday FROM customer_profiles WHERE user_id = ?`,
    [userId]
  );
  return rows[0];
};

export const create = async (userId, data) => {
  await pool.execute(
    `INSERT INTO customer_profiles (user_id, birthday) VALUES (?, ?)`,
    [userId, data.birthday || null]
  );
};

export const update = async (userId, data) => {
  await pool.execute(
    `UPDATE customer_profiles SET birthday = ? WHERE user_id = ?`,
    [data.birthday || null, userId]
  );
};

export const updateTotalSpent = async (userId, amount, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `INSERT INTO customer_profiles (user_id, total_spent) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_spent = GREATEST(total_spent + VALUES(total_spent), 0)`,
    [userId, amount]
  );
};
