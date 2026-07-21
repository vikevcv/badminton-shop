import * as brandService from '../../services/brand.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';
import jwt from 'jsonwebtoken';
import { isBlacklisted, hashToken } from '../../models/token-blacklist.model.js';

const verifyAdminOrStaff = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    const token = authHeader.split(' ')[1];
    const blacklisted = await isBlacklisted(hashToken(token));
    if (blacklisted) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.role === 'admin' || decoded.role === 'staff';
  } catch {
    return false;
  }
};

export const getAllBrands = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    if (includeInactive && !await verifyAdminOrStaff(req)) {
      const error = new Error('Không có quyền truy cập');
      error.status = 403;
      throw error;
    }
    const brands = await brandService.getAllBrands(includeInactive);
    sendSuccess(res, brands);
  } catch (error) {
    next(error);
  }
};

export const getBrand = async (req, res, next) => {
  try {
    const brand = await brandService.getBrand(parseInt(req.params.id));
    sendSuccess(res, brand);
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req, res, next) => {
  try {
    const brandId = await brandService.createBrand(req.body, req.file || null);
    sendSuccess(res, { brandId }, 'Tạo thương hiệu thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateBrand = async (req, res, next) => {
  try {
    await brandService.updateBrand(parseInt(req.params.id), req.body, req.file || null);
    sendSuccess(res, null, 'Cập nhật thương hiệu thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteBrand = async (req, res, next) => {
  try {
    await brandService.deleteBrand(parseInt(req.params.id), req.user.userId);
    sendSuccess(res, null, 'Xóa thương hiệu thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreBrand = async (req, res, next) => {
  try {
    await brandService.restoreBrand(parseInt(req.params.id));
    sendSuccess(res, null, 'Khôi phục thương hiệu thành công');
  } catch (error) {
    next(error);
  }
};
