import * as inventoryService from '../../services/inventory.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllInventory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      keyword: req.query.keyword || null,
      lowStock: req.query.lowStock || undefined
    };
    const result = await inventoryService.getAllInventory(page, limit, filters);
    sendSuccess(res, result.items, null, { pagination: { page, limit, totalItems: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { quantity, note } = req.body;
    const result = await inventoryService.adjustStock(parseInt(req.params.variantId), Number(quantity), note, req.user.userId);
    sendSuccess(res, result, 'Điều chỉnh tồn kho thành công');
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      variant_id: req.query.variant_id || null,
      type: req.query.type || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null
    };
    const result = await inventoryService.getTransactionHistory(page, limit, filters);
    sendSuccess(res, result.transactions, null, { pagination: { page, limit, totalItems: result.total, totalPages: Math.ceil(result.total / limit) } });
  } catch (error) {
    next(error);
  }
};
