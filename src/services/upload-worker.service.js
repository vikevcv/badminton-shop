import pool from '../config/database.js';
import * as cloudinaryService from './cloudinary.service.js';
import * as productModel from '../models/product.model.js';
import * as brandModel from '../models/brand.model.js';
import * as bannerModel from '../models/banner.model.js';

const MAX_RETRY = parseInt(process.env.UPLOAD_MAX_RETRY, 10) || 3;

const MODEL_MAP = {
  product: productModel,
  brand: brandModel,
  banner: bannerModel,
};

const findPendingUploads = async () => {
  const [productImages, brands, banners] = await Promise.all([
    productModel.findPendingUploads(MAX_RETRY),
    brandModel.findPendingUploads(MAX_RETRY),
    bannerModel.findPendingUploads(MAX_RETRY),
  ]);
  return [...productImages, ...brands, ...banners];
};

const processUpload = async (conn, item) => {
  const model = MODEL_MAP[item.type];
  if (!model) return false;

  try {
    await model.setUploading(item.id, conn);

    const folder = item.type;
    const result = await cloudinaryService.uploadImage(item.local_path, folder);

    await model.setCompleted(item.id, result.secure_url, result.public_id, conn);

    await cloudinaryService.cleanupLocalFile(item.local_path);

    return true;
  } catch (err) {
    const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'Unknown error';
    await model.setFailed(item.id, errorMsg, conn);
    return false;
  }
};

export const processPendingUploads = async () => {
  const conn = await pool.getConnection();
  try {
    const pendingItems = await findPendingUploads();
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
  await Promise.all([
    productModel.retryFailed(MAX_RETRY),
    brandModel.retryFailed(MAX_RETRY),
    bannerModel.retryFailed(MAX_RETRY),
  ]);
};
