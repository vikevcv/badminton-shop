import pool from '../config/database.js';
import * as cloudinaryService from './cloudinary.service.js';

const MAX_RETRY = parseInt(process.env.UPLOAD_MAX_RETRY, 10) || 3;

const findPendingUploads = async (conn) => {
  const [productImages] = await conn.query(
    `SELECT id, local_path, 'product' AS type FROM product_images
     WHERE upload_status = 'pending_upload' AND retry_count < ?
     ORDER BY created_at ASC LIMIT 10`,
    [MAX_RETRY]
  );

  const [brands] = await conn.query(
    `SELECT id, local_path, 'brand' AS type FROM brands
     WHERE upload_status = 'pending_upload' AND retry_count < ?
     ORDER BY created_at ASC LIMIT 10`,
    [MAX_RETRY]
  );

  const [banners] = await conn.query(
    `SELECT id, local_path, 'banner' AS type FROM banners
     WHERE upload_status = 'pending_upload' AND retry_count < ?
     ORDER BY created_at ASC LIMIT 10`,
    [MAX_RETRY]
  );

  return [...productImages, ...brands, ...banners];
};

const setUploading = async (conn, table, id) => {
  await conn.query(
    `UPDATE ${table} SET upload_status = 'uploading' WHERE id = ?`,
    [id]
  );
};

const setFailed = async (conn, table, id, errorMessage) => {
  await conn.query(
    `UPDATE ${table} SET upload_status = 'failed', retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
    [errorMessage, id]
  );
};

const processUpload = async (conn, item) => {
  const table = item.type === 'brand' ? 'brands' : item.type === 'banner' ? 'banners' : 'product_images';
  const folder = item.type;
  const urlColumn = 'image_url';

  try {
    await setUploading(conn, table, item.id);

    const result = await cloudinaryService.uploadImage(item.local_path, folder);

    await conn.query(
      `UPDATE ${table} SET ${urlColumn} = ?, upload_status = 'completed', cloud_public_id = ?, local_path = NULL, error_message = NULL WHERE id = ?`,
      [result.secure_url, result.public_id, item.id]
    );

    await cloudinaryService.cleanupLocalFile(item.local_path);

    return true;
  } catch (err) {
    const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'Unknown error';
    await setFailed(conn, table, item.id, errorMsg);
    return false;
  }
};

export const processPendingUploads = async () => {
  const conn = await pool.getConnection();
  try {
    const pendingItems = await findPendingUploads(conn);
    if (pendingItems.length === 0) return 0;

    let processed = 0;
    for (const item of pendingItems) {
      const success = await processUpload(conn, item);
      if (success) processed++;
    }
    return processed;
  } catch {
    return 0;
  } finally {
    conn.release();
  }
};

export const retryFailedUploads = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `UPDATE product_images SET upload_status = 'pending_upload', error_message = NULL
       WHERE upload_status = 'failed' AND retry_count < ?`,
      [MAX_RETRY]
    );
    await conn.query(
      `UPDATE brands SET upload_status = 'pending_upload', error_message = NULL
       WHERE upload_status = 'failed' AND retry_count < ?`,
      [MAX_RETRY]
    );
    await conn.query(
      `UPDATE banners SET upload_status = 'pending_upload', error_message = NULL
       WHERE upload_status = 'failed' AND retry_count < ?`,
      [MAX_RETRY]
    );
  } finally {
    conn.release();
  }
};
