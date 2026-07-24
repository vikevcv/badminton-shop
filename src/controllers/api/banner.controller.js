import * as bannerService from '../../services/banner.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllBanners = async (req, res, next) => {
  try {
    const displayDeleted = req.query.display_deleted === 'true' && req.user && ['admin', 'staff'].includes(req.user.role);
    const banners = await bannerService.getAllBanners(displayDeleted);
    sendSuccess(res, banners);
  } catch (error) {
    next(error);
  }
};

export const getBannerDetail = async (req, res, next) => {
  try {
    const displayDeleted = req.query.display_deleted === 'true' && req.user && ['admin', 'staff'].includes(req.user.role);
    const banner = await bannerService.getBannerDetail(req.params.id, displayDeleted);
    sendSuccess(res, banner);
  } catch (error) {
    next(error);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    const { title, image_url, link_url, description, sort_order } = req.body;

    if (!req.file && !image_url) {
      const error = new Error('Vui lòng chọn ảnh hoặc cung cấp image_url');
      error.status = 400;
      throw error;
    }

    const id = await bannerService.createBanner({
      title, image_url, link_url, description, sort_order: parseInt(sort_order) || 0
    }, req.file || null);

    sendSuccess(res, { id }, 'Tạo banner thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (data.sort_order) data.sort_order = parseInt(data.sort_order);

    await bannerService.updateBanner(req.params.id, data, req.file || null);
    sendSuccess(res, null, 'Cập nhật banner thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    await bannerService.deleteBanner(req.params.id);
    sendSuccess(res, null, 'Xóa banner thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreBanner = async (req, res, next) => {
  try {
    const sortOrder = req.body?.sort_order ? parseInt(req.body.sort_order) : null;
    await bannerService.restoreBanner(req.params.id, sortOrder);
    sendSuccess(res, null, 'Khôi phục banner thành công');
  } catch (error) {
    next(error);
  }
};
