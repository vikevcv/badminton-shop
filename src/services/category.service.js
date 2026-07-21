import slugify from 'slugify';
import * as categoryModel from '../models/category.model.js';

export const getAllCategories = async () => {
  return await categoryModel.findAll();
};

export const getCategory = async (id) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    const error = new Error('Không tìm thấy danh mục');
    error.status = 404;
    throw error;
  }
  return category;
};

export const createCategory = async (data) => {
  const slug = data.slug || slugify(data.name, { lower: true, strict: true, locale: 'vi' });

  const existingSlug = await categoryModel.findBySlug(slug);
  if (existingSlug) {
    const error = new Error('Slug đã tồn tại');
    error.status = 400;
    throw error;
  }
  const existingName = await categoryModel.findByName(data.name);
  if (existingName) {
    const error = new Error('Tên danh mục đã tồn tại');
    error.status = 400;
    throw error;
  }

  const categoryId = await categoryModel.create({ ...data, slug });
  return categoryId;
};

export const updateCategory = async (id, data) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    const error = new Error('Không tìm thấy danh mục');
    error.status = 404;
    throw error;
  }

  if (data.name && data.name !== category.name) {
    const existingName = await categoryModel.findByName(data.name);
    if (existingName) {
      const error = new Error('Tên danh mục đã tồn tại');
      error.status = 400;
      throw error;
    }
  }
  if (data.slug) {
    const existingSlug = await categoryModel.findBySlug(data.slug);
    if (existingSlug && existingSlug.id !== id) {
      const error = new Error('Slug đã tồn tại');
      error.status = 400;
      throw error;
    }
  }

  await categoryModel.update(id, data);
};

export const restoreCategory = async (id) => {
  const category = await categoryModel.restoreCategory(id);
  if (!category) {
    const error = new Error('Không tìm thấy danh mục đã xóa');
    error.status = 404;
    throw error;
  }
};

export const deleteCategory = async (id, deletedBy = null) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    const error = new Error('Không tìm thấy danh mục');
    error.status = 404;
    throw error;
  }
  await categoryModel.deleteCategory(id, deletedBy);
};
