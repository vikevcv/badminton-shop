import * as categoryService from '../../services/category.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const category = await categoryService.getCategory(parseInt(req.params.id));
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const categoryId = await categoryService.createCategory(req.body);
    sendSuccess(res, { categoryId }, 'Tạo danh mục thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    await categoryService.updateCategory(parseInt(req.params.id), req.body);
    sendSuccess(res, null, 'Cập nhật danh mục thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(parseInt(req.params.id), req.user.userId);
    sendSuccess(res, null, 'Xóa danh mục thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreCategory = async (req, res, next) => {
  try {
    await categoryService.restoreCategory(parseInt(req.params.id));
    sendSuccess(res, null, 'Khôi phục danh mục thành công');
  } catch (error) {
    next(error);
  }
};
