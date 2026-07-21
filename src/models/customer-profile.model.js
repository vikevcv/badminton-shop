import pool from '../config/database.js';

export const findByUserId = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM customer_profiles WHERE user_id = ?`,
    [userId]
  );
  return rows[0];
};

export const createOrUpdate = async (userId, data) => {
  const existing = await findByUserId(userId);
  if (existing) {
    const updates = [];
    const params = [];
    if (data.birthday !== undefined) {
      updates.push('birthday = ?');
      params.push(data.birthday);
    }
    if (updates.length > 0) {
      params.push(userId);
      await pool.execute(
        `UPDATE customer_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    }
    return;
  }
  await pool.execute(
    `INSERT INTO customer_profiles (user_id, birthday) VALUES (?, ?)`,
    [userId, data.birthday || null]
  );
};

export const updateTotalSpent = async (userId, amount, conn = null) => {
  const exec = conn || pool;
  await exec.execute(
    `INSERT INTO customer_profiles (user_id, total_spent) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_spent = GREATEST(total_spent + VALUES(total_spent), 0)`,
    [userId, amount]
  );
};
