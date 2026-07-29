import pool from '../config/database.js';
import * as cartModel from '../models/cart.model.js';
import * as inventoryModel from '../models/inventory.model.js';
import { formatVND } from '../helpers/currency.helper.js';

const notFound = () => {
  const error = new Error('Không tìm thấy sản phẩm trong giỏ hàng');
  error.status = 404;
  return error;
};
const outOfStock = (stockQty) => {
  const error = new Error(`Số lượng vượt quá tồn kho (còn ${stockQty})`);
  error.status = 400;
  return error;
};

export const getCart = async (userId) => {
  const cart = await cartModel.findByUserId(userId);
  const cartId = cart ? cart.id : await cartModel.create(userId);

  const items = await cartModel.getCartItems(cartId);

  const formattedItems = items.map(item => ({
    ...item,
    formattedPrice: formatVND(item.price),
    total: item.quantity * parseFloat(item.price),
    formattedTotal: formatVND(item.quantity * parseFloat(item.price))
  }));

  const totalAmount = formattedItems.reduce((sum, item) => sum + item.total, 0);

  return {
    cart_id: cartId,
    items: formattedItems,
    total_items: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
    total_amount: totalAmount,
    formatted_total_amount: formatVND(totalAmount)
  };
};

export const addToCart = async (userId, variantId, quantity) => {
  const cart = await cartModel.findByUserId(userId);
  const cartId = cart ? cart.id : await cartModel.create(userId);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const stockLocked = await inventoryModel.findByVariantIdForUpdate(variantId, conn);
    const lockedStockQty = stockLocked?.quantity || 0;

    const existing = await cartModel.findExistingItem(cartId, variantId, conn);

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > lockedStockQty) throw outOfStock(lockedStockQty);
      await cartModel.updateItemQty(existing.id, newQty, conn);
      await conn.commit();
      return existing.id;
    }

    if (quantity > lockedStockQty) throw outOfStock(lockedStockQty);

    const itemId = await cartModel.insertItem(cartId, variantId, quantity, conn);
    await conn.commit();
    return itemId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const updateQuantity = async (userId, itemId, quantity) => {
  const cart = await cartModel.findByUserId(userId);
  const cartId = cart ? cart.id : await cartModel.create(userId);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const variantId = await cartModel.findItemVariantId(itemId, cartId);
    if (!variantId) throw notFound();

    const stock = await inventoryModel.findByVariantIdForUpdate(variantId, conn);
    const stockQty = stock?.quantity || 0;
    if (quantity > stockQty) throw outOfStock(stockQty);

    await cartModel.updateItemQty(itemId, quantity, conn);
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const removeItem = async (userId, itemId) => {
  const cart = await cartModel.findByUserId(userId);
  const cartId = cart ? cart.id : await cartModel.create(userId);
  const removed = await cartModel.removeItem(itemId, cartId);
  if (!removed) throw notFound();
  return true;
};

export const clearCart = async (userId) => {
  const cart = await cartModel.findByUserId(userId);
  if (!cart) {
    const error = new Error('Giỏ hàng đang rỗng');
    error.status = 404;
    throw error;
  };
  const cartItems = await cartModel.getCartItems(cart.id);
  if(cartItems.length === 0){
    const error = new Error('Giỏ hàng đang rỗng');
    error.status = 404;
    throw error;
  }
  await cartModel.clearCart(cart.id);
};
