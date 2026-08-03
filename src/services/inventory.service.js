import pool from '../config/database.js';
import * as inventoryModel from '../models/inventory.model.js';

export const getAllInventory = async (page, limit, filters) => {
  const offset = (page - 1) * limit;

  const where = ["pv.deleted_at IS NULL"];
  const params = [];

  if (filters.keyword) {
    const kw = `%${filters.keyword}%`;

    where.push(
      `(p.name LIKE ? OR pv.sku LIKE ?)`
    );

    params.push(kw, kw);
  }

  if (filters.lowStock !== undefined) {
    where.push(`inv.quantity <= ?`);

    params.push(Number(filters.lowStock));
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const total = await inventoryModel.countInventory(
    whereClause,
    params
  );

  const items = await inventoryModel.findInventory(
    whereClause,
    params,
    limit,
    offset
  );

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    }
  };
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

export const getTransactionHistory = async (
  page = 1,
  limit = 20,
  filters = {}
) => {
  const offset = (page - 1) * limit;

  if (filters.fromDate && filters.toDate && new Date(filters.fromDate) > new Date(filters.toDate)) {
    const error = new Error('Ngày bắt đầu không được sau ngày kết thúc');
    error.status = 400;
    throw error;
  }

  const where = [];
  const params = [];

  if (filters.variant_id !== undefined) {
    where.push('it.variant_id = ?');
    params.push(Number(filters.variant_id));
  }

  if (filters.type) {
    where.push('it.transaction_type = ?');
    params.push(filters.type);
  }

  if (filters.fromDate) {
    where.push('it.created_at >= ?');
    params.push(filters.fromDate);
  }

  if (filters.toDate) {
    where.push('it.created_at <= ?');
    params.push(filters.toDate);
  }

  const whereClause =
    where.length > 0
      ? `WHERE ${where.join(' AND ')}`
      : '';

  const total = await inventoryModel.countTransactions(
    whereClause,
    params
  );

  const transactions = await inventoryModel.findTransactions(
    whereClause,
    params,
    limit,
    offset
  );

  return {
    data: transactions,
    pagination: {
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit)
    }
  };
};