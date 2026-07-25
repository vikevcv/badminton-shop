import * as cloudinaryService from './cloudinary.service.js';
import * as productModel from '../models/product.model.js';
import * as brandModel from '../models/brand.model.js';
import * as bannerModel from '../models/banner.model.js';

const MODEL_MAP = {
  product: productModel,
  brand: brandModel,
  banner: bannerModel,
};

const REQUIRED_FIELDS = ['table', 'id', 'localPath', 'type'];

export const processUpload = async (jobData) => {
  for (const field of REQUIRED_FIELDS) {
    if (jobData[field] === undefined || jobData[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const model = MODEL_MAP[jobData.type];
  if (!model) {
    throw new Error(`Invalid upload type: ${jobData.type}`);
  }

  console.log(`🔄 Processing upload: ${jobData.table}:${jobData.id}`);

  await model.setUploading(jobData.id);

  try {
    const result = await cloudinaryService.uploadImage(jobData.localPath, jobData.type);

    await model.setCompleted(jobData.id, result.secure_url, result.public_id);

    await cloudinaryService.cleanupLocalFile(jobData.localPath);

    console.log(`✅ Upload completed: ${jobData.table}:${jobData.id}`);
  } catch (err) {
    const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err)) || 'Unknown error';
    await model.setFailed(jobData.id, errorMsg);
    throw err;
  }
};

export const processUploadFailed = async (jobData) => {
  try {
    for (const field of REQUIRED_FIELDS) {
      if (jobData[field] === undefined || jobData[field] === null) {
        console.error(`Cannot cleanup: missing field ${field}`);
        return;
      }
    }

    if (!MODEL_MAP[jobData.type]) {
      console.error(`Cannot cleanup: invalid type ${jobData.type}`);
      return;
    }

    await cloudinaryService.cleanupLocalFile(jobData.localPath);
    console.log(`🗑️ Cleaned up temp file after permanent failure: ${jobData.localPath}`);
  } catch (err) {
    console.error(`Failed to cleanup file: ${err.message}`);
  }
};
