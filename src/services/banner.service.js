import * as bannerModel from '../models/banner.model.js';
import pool from '../config/database.js';

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

export const createBanner = async (data) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query(
      'SELECT id FROM banners WHERE sort_order >= ? AND deleted_at IS NULL FOR UPDATE',
      [data.sort_order || 0]
    );
    if (existing.length > 0) {
      await conn.query(
        'UPDATE banners SET sort_order = sort_order + 1 WHERE sort_order >= ? AND deleted_at IS NULL',
        [data.sort_order || 0]
      );
    }
    const [result] = await conn.execute(
      `INSERT INTO banners (title, image_url, link_url, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.title, data.image_url, data.link_url || null, data.description || null, data.sort_order || 0, data.status || 'active']
    );
    await conn.commit();
    return result.insertId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const updateBanner = async (id, data) => {
  const banner = await bannerModel.findByIdAdmin(id);
  if (!banner) {
    const error = new Error('Không tìm thấy banner');
    error.status = 404;
    throw error;
  }

  const newSortOrder = data.sort_order !== undefined ? data.sort_order : banner.sort_order;
  const oldSortOrder = banner.sort_order;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (newSortOrder !== oldSortOrder) {
      if (newSortOrder < oldSortOrder) {
        const [rows] = await conn.query(
          'SELECT id FROM banners WHERE sort_order >= ? AND sort_order < ? AND id != ? AND deleted_at IS NULL FOR UPDATE',
          [newSortOrder, oldSortOrder, id]
        );
        if (rows.length > 0) {
          await conn.query(
            'UPDATE banners SET sort_order = sort_order + 1 WHERE sort_order >= ? AND sort_order < ? AND id != ? AND deleted_at IS NULL',
            [newSortOrder, oldSortOrder, id]
          );
        }
      } else {
        const [rows] = await conn.query(
          'SELECT id FROM banners WHERE sort_order > ? AND sort_order <= ? AND id != ? AND deleted_at IS NULL FOR UPDATE',
          [oldSortOrder, newSortOrder, id]
        );
        if (rows.length > 0) {
          await conn.query(
            'UPDATE banners SET sort_order = sort_order - 1 WHERE sort_order > ? AND sort_order <= ? AND id != ? AND deleted_at IS NULL',
            [oldSortOrder, newSortOrder, id]
          );
        }
      }
    }

    const updateFields = [];
    const updateParams = [];
    const allowed = ['title', 'image_url', 'link_url', 'description', 'sort_order', 'status'];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateParams.push(data[key]);
      }
    }
    if (updateFields.length > 0) {
      updateParams.push(id);
      await conn.execute(`UPDATE banners SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);
    }

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
    await conn.execute(
      `UPDATE banners SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    await conn.query(
      'SELECT id FROM banners WHERE sort_order > ? AND deleted_at IS NULL FOR UPDATE',
      [banner.sort_order]
    );
    await conn.query(
      'UPDATE banners SET sort_order = sort_order - 1 WHERE sort_order > ? AND deleted_at IS NULL',
      [banner.sort_order]
    );
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

    const [existing] = await conn.query(
      'SELECT id FROM banners WHERE sort_order >= ? AND deleted_at IS NULL FOR UPDATE',
      [newSortOrder]
    );
    if (existing.length > 0) {
      await conn.query(
        'UPDATE banners SET sort_order = sort_order + 1 WHERE sort_order >= ? AND deleted_at IS NULL',
        [newSortOrder]
      );
    }

    await conn.execute(
      'UPDATE banners SET deleted_at = NULL, sort_order = ? WHERE id = ? AND deleted_at IS NOT NULL',
      [newSortOrder, id]
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};
