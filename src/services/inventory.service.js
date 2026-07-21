import pool from '../config/database.js';
import * as inventoryModel from '../models/inventory.model.js';

export const getAllInventory = async (page, limit, filters) => {
  return await inventoryModel.findAllWithProduct(page, limit, filters);
};

export const adjustStock = async (variantId, quantity, note, userId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [locked] = await conn.query(
      'SELECT * FROM inventories WHERE variant_id = ? FOR UPDATE',
      [variantId]
    );
    if (!locked.length) {
      const error = new Error('Không tìm thấy biến thể trong kho');
      error.status = 404;
      throw error;
    }

    const diff = quantity - locked[0].quantity;

    await conn.execute(
      'UPDATE inventories SET quantity = ? WHERE variant_id = ?',
      [quantity, variantId]
    );
    await conn.execute(
      `INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, reference_type, note, created_by)
       VALUES (?, 'adjustment', ?, 'manual', ?, ?)`,
      [variantId, diff, note || null, userId]
    );

    await conn.commit();
    return { previousQuantity: locked[0].quantity, newQuantity: quantity, diff };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const getTransactionHistory = async (page, limit, filters) => {
  return await inventoryModel.getTransactions(page, limit, filters);
};
