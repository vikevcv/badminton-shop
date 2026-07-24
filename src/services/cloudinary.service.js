import cloudinary from '../config/cloudinary.js';
import fs from 'fs/promises';

const FOLDER_MAP = {
  product: 'badminton/products',
  brand: 'badminton/brands',
  banner: 'badminton/banners',
};

export const uploadImage = async (localPath, folder = 'product') => {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: FOLDER_MAP[folder] || FOLDER_MAP.product,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (err) {
    const error = new Error(err.message || err.error?.message || JSON.stringify(err) || 'Cloudinary upload failed');
    error.status = err.http_code || 500;
    throw error;
  }
};

export const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

export const replaceImage = async (localPath, oldPublicId, folder = 'product') => {
  if (oldPublicId) {
    await deleteImage(oldPublicId);
  }
  return await uploadImage(localPath, folder);
};

export const cleanupLocalFile = async (localPath) => {
  if (!localPath) return;
  try {
    await fs.unlink(localPath);
  } catch {
    // File may already be deleted or not exist
  }
};
