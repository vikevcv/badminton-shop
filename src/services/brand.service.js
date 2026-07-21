import slugify from 'slugify';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import * as brandModel from '../models/brand.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeName = (name) => {
  return slugify(name, { lower: true, strict: true, locale: 'vi' });
};

const moveLogo = async (file, name) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = normalizeName(name);
  const relativeDir = `/images/brands`;
  const absoluteDir = path.join(__dirname, '../../public', relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const filename = `${baseName}${ext}`;
  const absolutePath = path.join(absoluteDir, filename);

  try {
    const oldFiles = await fs.readdir(absoluteDir);
    for (const f of oldFiles) {
      if (f.startsWith(baseName + '.')) {
        await fs.unlink(path.join(absoluteDir, f));
      }
    }
  } catch {}

  await fs.rename(file.path, absolutePath);
  return `${relativeDir}/${filename}`;
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

  const logoUrl = file ? await moveLogo(file, data.name) : null;
  const brandId = await brandModel.create({ ...data, slug, logo_url: logoUrl });
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
    const brandName = data.name || brand.name;
    data.logo_url = await moveLogo(file, brandName);

    if (brand.logo_url) {
      const oldPath = path.join(__dirname, '../../public', brand.logo_url);
      try { await fs.unlink(oldPath); } catch {}
    }
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
