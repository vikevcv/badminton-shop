import slugify from 'slugify';
import * as categoryModel from '../models/category.model.js';

export const getAllCategories = async () => {
  return await categoryModel.findAll();
};

export const getCategory = async (id, role) => {
  const isManager = ['admin', 'staff'].includes(role);
  const category = await categoryModel.findById(id, isManager);
  if (!category) {
    const error = new Error('Không tìm thấy danh mục');
    error.status = 404;
    throw error;
  }
  return category;
};

export const createCategory = async (data) => {
  if ('slug' in data) {
    const error = new Error('Slug được hệ thống tự động tạo.');
    error.status = 400;
    throw error;
  }
  
  const existingName = await categoryModel.findByName(data.name);
  if (existingName) {
    const error = new Error('Tên danh mục đã tồn tại');
    error.status = 400;
    throw error;
  }
  const slug = slugify(data.name, { lower: true, strict: true, locale: 'vi' });
  const existingSlug = await categoryModel.findBySlug(slug);
  if (existingSlug) {
    const error = new Error('Slug đã tồn tại');
    error.status = 400;
    throw error;
  }

  const categoryId = await categoryModel.create({ ...data, slug });
  return categoryId;
};

export const updateCategory = async (id, data, role) => {
  const isAdmin = role === 'admin';
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
  if ('slug' in data && !isAdmin) {
    const error = new Error('Bạn không có quyền thay đổi slug');
    error.status = 403;
    throw error;
  }
  if ('slug' in data) {
    if (typeof data.slug !== 'string' || data.slug.trim() === '') {
        const error = new Error('Slug không được để trống');
        error.status = 400;
        throw error;
    }

    const slug = slugify(data.slug, {
        lower: true,
        strict: true,
        locale: 'vi'
    });

    const existingSlug = await categoryModel.findBySlug(slug);

    if (existingSlug && existingSlug.id !== id) {
        const error = new Error('Slug đã tồn tại');
        error.status = 400;
        throw error;
    }

    data.slug = slug;
  }

  await categoryModel.update(id, data);
};

export const restoreCategory = async (id) => {
  const category = await categoryModel.findDeletedById(id);
  if (!category) {
    const error = new Error('Không tìm thấy danh mục đã xóa');
    error.status = 404;
    throw error;
  }
  await categoryModel.restoreCategory(id);
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
