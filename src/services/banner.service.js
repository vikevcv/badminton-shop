import slugify from 'slugify';
import path from 'path';
import { fileURLToPath } from 'url';
import * as bannerModel from '../models/banner.model.js';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLocalPath = (file) => {
  return file ? path.join(__dirname, '../../public/uploads', path.basename(file.path)) : null;
};

export const getAllBanners = async (displayDeleted = false) => {
  if (displayDeleted) {
    return await bannerModel.findAllAdmin(true);
  }
  return await bannerModel.findAllActive();
};

export const getBannerDetail = async (id, displayDeleted = false) => {
  const banner = await bannerModel.findByIdAdmin(id, displayDeleted);
  if (!banner) {
    const error = new Error('Không tìm thấy banner');
    error.status = 404;
    throw error;
  }
  if (!displayDeleted && banner.deleted_at) {
    const error = new Error('Không tìm thấy banner');
    error.status = 404;
    throw error;
  }
  return banner;
};

export const createBanner = async (data, file) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (file) {
      data.image_url = '/images/default-banner.png';
      data.upload_status = 'pending_upload';
      data.local_path = getLocalPath(file);
    } else {
      data.upload_status = 'completed';
    }

    const hasExisting = await bannerModel.existsAtOrAbove(data.sort_order || 0, conn);
    if (hasExisting) {
      await bannerModel.shiftUp(data.sort_order || 0, null, conn);
    }
    const insertId = await bannerModel.create(data, conn);

    await conn.commit();
    return insertId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const updateBanner = async (id, data, file) => {
  const banner = await bannerModel.findByIdAdmin(id);
  if (!banner) {
    const error = new Error('Không tìm thấy banner');
    error.status = 404;
    throw error;
  }

  if (file) {
    data.image_url = '/images/default-banner.png';
    data.upload_status = 'pending_upload';
    data.local_path = getLocalPath(file);
    data.retry_count = 0;
    data.error_message = null;
  }

  const newSortOrder = data.sort_order !== undefined ? data.sort_order : banner.sort_order;
  const oldSortOrder = banner.sort_order;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (newSortOrder !== oldSortOrder) {
      if (newSortOrder < oldSortOrder) {
        const hasInRange = await bannerModel.existsInRange(newSortOrder, oldSortOrder, id, conn);
        if (hasInRange) {
          await bannerModel.shiftDown(newSortOrder, conn);
        }
      } else {
        const hasInRange = await bannerModel.existsInRange(oldSortOrder, newSortOrder, id, conn);
        if (hasInRange) {
          await bannerModel.shiftUp(oldSortOrder, id, conn);
        }
      }
    }

    await bannerModel.update(id, data, conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const deleteBanner = async (id) => {
  const banner = await bannerModel.findByIdAdmin(id);
  if (!banner) {
    const error = new Error('Không tìm thấy banner');
    error.status = 404;
    throw error;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await bannerModel.softDelete(id, conn);
    await bannerModel.shiftDown(banner.sort_order, conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const restoreBanner = async (id, sortOrder) => {
  const banner = await bannerModel.findDeletedById(id);
  if (!banner) {
    const error = new Error('Không tìm thấy banner đã xóa');
    error.status = 404;
    throw error;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const newSortOrder = sortOrder ?? banner.sort_order;

    const hasExisting = await bannerModel.existsAtOrAbove(newSortOrder, conn);
    if (hasExisting) {
      await bannerModel.shiftUp(newSortOrder, null, conn);
    }

    await bannerModel.restore(id, newSortOrder, conn);

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
