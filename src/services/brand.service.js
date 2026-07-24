import slugify from 'slugify';
import path from 'path';
import { fileURLToPath } from 'url';
import * as brandModel from '../models/brand.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLocalPath = (file) => {
  return file ? path.join(__dirname, '../../public/uploads', path.basename(file.path)) : null;
};

export const getAllBrands = async (includeInactive) => {
  return await brandModel.findAll(includeInactive);
};

export const getBrand = async (id) => {
  const brand = await brandModel.findById(id);
  if (!brand) {
    const error = new Error('Không tìm thấy thương hiệu');
    error.status = 404;
    throw error;
  }
  return brand;
};

export const createBrand = async (data, file) => {
  const slug = data.slug || slugify(data.name, { lower: true, strict: true, locale: 'vi' });

  const existingSlug = await brandModel.findBySlug(slug);
  if (existingSlug) {
    const error = new Error('Slug đã tồn tại');
    error.status = 400;
    throw error;
  }
  const existingName = await brandModel.findByName(data.name);
  if (existingName) {
    const error = new Error('Tên thương hiệu đã tồn tại');
    error.status = 400;
    throw error;
  }

  let logoUrl = null;
  let uploadStatus = 'completed';
  let localPath = null;

  if (file) {
    logoUrl = '/images/default-brand.png';
    uploadStatus = 'pending_upload';
    localPath = getLocalPath(file);
  }

  const brandId = await brandModel.create({
    ...data,
    slug,
    logo_url: logoUrl,
    upload_status: uploadStatus,
    local_path: localPath,
  });
  return brandId;
};

export const updateBrand = async (id, data, file) => {
  const brand = await brandModel.findById(id);
  if (!brand) {
    const error = new Error('Không tìm thấy thương hiệu');
    error.status = 404;
    throw error;
  }

  if (data.name && data.name !== brand.name) {
    const existingName = await brandModel.findByName(data.name);
    if (existingName) {
      const error = new Error('Tên thương hiệu đã tồn tại');
      error.status = 400;
      throw error;
    }
  }
  if (data.slug) {
    const existingSlug = await brandModel.findBySlug(data.slug);
    if (existingSlug && existingSlug.id !== id) {
      const error = new Error('Slug đã tồn tại');
      error.status = 400;
      throw error;
    }
  }

  if (file) {
    data.logo_url = '/images/default-brand.png';
    data.upload_status = 'pending_upload';
    data.local_path = getLocalPath(file);
    data.retry_count = 0;
    data.error_message = null;
  }

  await brandModel.update(id, data);
};

export const restoreBrand = async (id) => {
  const brand = await brandModel.restoreBrand(id);
  if (!brand) {
    const error = new Error('Không tìm thấy thương hiệu đã xóa');
    error.status = 404;
    throw error;
  }
};

export const deleteBrand = async (id, deletedBy = null) => {
  const brand = await brandModel.findById(id);
  if (!brand) {
    const error = new Error('Không tìm thấy thương hiệu');
    error.status = 404;
    throw error;
  }
  await brandModel.deleteBrand(id, deletedBy);
};
