import pool from '../config/database.js';

export const findByUserId = async (userId) => {
  const [rows] = await pool.query(`SELECT * FROM carts WHERE user_id = ?`, [userId]);
  return rows[0];
};

export const create = async (userId) => {
  const [result] = await pool.execute(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
  return result.insertId;
};

export const getCartItems = async (cartId) => {
  const [rows] = await pool.query(
    `SELECT ci.id, ci.variant_id, ci.quantity,
            pv.sku, pv.price, pv.status AS variant_status,
            p.name AS product_name, p.slug AS product_slug,
            pi.image_url,
            inv.quantity AS stock_quantity
     FROM cart_items ci
     INNER JOIN product_variants pv ON ci.variant_id = pv.id
     INNER JOIN products p ON pv.product_id = p.id
     LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
     LEFT JOIN inventories inv ON pv.id = inv.variant_id
     WHERE ci.cart_id = ?`,
    [cartId]
  );
  return rows;
};

export const findExistingItem = async (cartId, variantId, conn) => {
  const [rows] = await conn.query(
    `SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ? FOR UPDATE`,
    [cartId, variantId]
  );
  return rows[0];
};

export const insertItem = async (cartId, variantId, quantity, conn) => {
  const [result] = await conn.execute(
    `INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)`,
    [cartId, variantId, quantity]
  );
  return result.insertId;
};

export const updateItemQty = async (itemId, quantity, conn) => {
  await conn.execute(
    `UPDATE cart_items SET quantity = ? WHERE id = ?`,
    [quantity, itemId]
  );
};

export const findItemVariantId = async (itemId, cartId) => {
  const [rows] = await pool.query(
    `SELECT variant_id FROM cart_items WHERE id = ? AND cart_id = ?`,
    [itemId, cartId]
  );
  return rows[0] ? rows[0].variant_id : null;
};

export const removeItem = async (itemId, cartId, conn) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `DELETE FROM cart_items WHERE id = ? AND cart_id = ?`,
    [itemId, cartId]
  );
  return result.affectedRows > 0;
};

export const clearCart = async (cartId, conn) => {
  const exec = conn || pool;
  await exec.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
};
