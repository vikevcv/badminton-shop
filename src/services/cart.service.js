import * as cartModel from '../models/cart.model.js';
import { formatVND } from '../helpers/currency.helper.js';

export const getCart = async (userId) => {
  const cart = await cartModel.findOrCreateCart(userId);
  const items = await cartModel.getCartItems(cart.id);

  const formattedItems = items.map(item => ({
    ...item,
    formattedPrice: formatVND(item.price),
    total: item.quantity * parseFloat(item.price),
    formattedTotal: formatVND(item.quantity * parseFloat(item.price)),
    metadata: item.metadata ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata) : null
  }));

  const totalAmount = formattedItems.reduce((sum, item) => sum + item.total, 0);

  return {
    cart_id: cart.id,
    items: formattedItems,
    total_items: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
    total_amount: totalAmount,
    formatted_total_amount: formatVND(totalAmount)
  };
};

export const addToCart = async (userId, variantId, quantity, metadata = null) => {
  const cart = await cartModel.findOrCreateCart(userId);
  const itemId = await cartModel.addItem(cart.id, variantId, quantity, metadata);
  return itemId;
};

export const updateQuantity = async (userId, itemId, quantity) => {
  const cart = await cartModel.findOrCreateCart(userId);
  const updated = await cartModel.updateItemQuantity(itemId, cart.id, quantity);
  if (!updated) {
    const error = new Error('Không tìm thấy sản phẩm trong giỏ hàng');
    error.status = 404;
    throw error;
  }
  return true;
};

export const removeItem = async (userId, itemId) => {
  const cart = await cartModel.findOrCreateCart(userId);
  const removed = await cartModel.removeItem(itemId, cart.id);
  if (!removed) {
    const error = new Error('Không tìm thấy sản phẩm trong giỏ hàng');
    error.status = 404;
    throw error;
  }
  return true;
};

export const clearCart = async (userId) => {
  const cart = await cartModel.findOrCreateCart(userId);
  await cartModel.clearCart(cart.id);
};
