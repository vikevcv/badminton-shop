import pool from '../config/database.js';

export const findOrCreateCart = async (userId) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(`SELECT * FROM carts WHERE user_id = ? FOR UPDATE`, [userId]);
    if (rows.length === 0) {
      const [result] = await conn.execute(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
      conn.release();
      return { id: result.insertId, user_id: userId };
    }
    conn.release();
    return rows[0];
  } catch (error) {
    conn.release();
    throw error;
  }
};

export const getCartItems = async (cartId) => {
  const [rows] = await pool.query(
    `SELECT ci.id, ci.variant_id, ci.quantity, ci.metadata,
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

export const addItem = async (cartId, variantId, quantity, metadata = null) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ? FOR UPDATE`,
      [cartId, variantId]
    );

    const [stock] = await conn.query(
      `SELECT quantity FROM inventories WHERE variant_id = ? FOR UPDATE`,
      [variantId]
    );
    const stockQty = stock[0]?.quantity || 0;

    if (existing.length > 0) {
      const newQty = existing[0].quantity + quantity;
      if (newQty > stockQty) {
        const error = new Error(`Số lượng vượt quá tồn kho (còn ${stockQty})`);
        error.status = 400;
        throw error;
      }
      await conn.execute(
        `UPDATE cart_items SET quantity = ? WHERE id = ?`,
        [newQty, existing[0].id]
      );
      await conn.commit();
      return existing[0].id;
    }

    if (quantity > stockQty) {
      const error = new Error(`Số lượng vượt quá tồn kho (còn ${stockQty})`);
      error.status = 400;
      throw error;
    }

    const metaJson = metadata ? JSON.stringify(metadata) : null;
    const [result] = await conn.execute(
      `INSERT INTO cart_items (cart_id, variant_id, quantity, metadata) VALUES (?, ?, ?, ?)`,
      [cartId, variantId, quantity, metaJson]
    );
    await conn.commit();
    return result.insertId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const updateItemQuantity = async (itemId, cartId, quantity) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [item] = await conn.query(
      `SELECT ci.variant_id FROM cart_items ci WHERE ci.id = ? AND ci.cart_id = ? FOR UPDATE`,
      [itemId, cartId]
    );
    if (!item[0]) {
      await conn.commit();
      return false;
    }

    const [stock] = await conn.query(
      `SELECT quantity FROM inventories WHERE variant_id = ? FOR UPDATE`,
      [item[0].variant_id]
    );
    const stockQty = stock[0]?.quantity || 0;
    if (quantity > stockQty) {
      const error = new Error(`Số lượng vượt quá tồn kho (còn ${stockQty})`);
      error.status = 400;
      throw error;
    }

    const [result] = await conn.execute(
      `UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?`,
      [quantity, itemId, cartId]
    );
    await conn.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const removeItem = async (itemId, cartId, conn = null) => {
  const exec = conn || pool;
  const [result] = await exec.execute(
    `DELETE FROM cart_items WHERE id = ? AND cart_id = ?`,
    [itemId, cartId]
  );
  return result.affectedRows > 0;
};

export const clearCart = async (cartId) => {
  await pool.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
};
