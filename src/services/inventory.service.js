import pool from '../config/database.js';
import * as inventoryModel from '../models/inventory.model.js';

export const getAllInventory = async (page, limit, filters) => {
  return await inventoryModel.findAllWithProduct(page, limit, filters);
};

export const adjustStock = async (variantId, quantity, note, userId) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const locked = await inventoryModel.findByVariantIdForUpdate(variantId, conn);
    if (!locked) {
      const error = new Error('Không tìm thấy biến thể trong kho');
      error.status = 404;
      throw error;
    }

    const diff = quantity - locked.quantity;

    await inventoryModel.setQuantity(variantId, quantity, conn);
    await inventoryModel.logTransaction({
      variant_id: variantId,
      transaction_type: 'adjustment',
      quantity: diff,
      reference_type: 'manual',
      note: note || null,
      created_by: userId
    }, conn);

    await conn.commit();
    return { previousQuantity: locked.quantity, newQuantity: quantity, diff };
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
