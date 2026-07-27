import * as bannerService from '../../services/banner.service.js';
import { sendSuccess } from '../../helpers/response.helper.js';

export const getAllBanners = async (req, res, next) => {
  try {
    const canViewHidden = ['admin', 'staff'].includes(req.user?.role);
    const filter = {
      displayDeleted: canViewHidden && req.query.display_deleted === 'true',
      displayInactive: canViewHidden && req.query.display_inactive === 'true'
    };
    const banners = await bannerService.getAllBanners(filter);
    sendSuccess(res, banners);
  } catch (error) {
    next(error);
  }
};

export const getBannerDetail = async (req, res, next) => {
  try {
    const isManager = ['admin', 'staff'].includes(req.user?.role);
    const banner = await bannerService.getBannerDetail(req.params.id, isManager);
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
    if (data.sort_order !== undefined) {
      data.sort_order = Number(data.sort_order);
    }
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
    await bannerService.restoreBanner(req.params.id);
    sendSuccess(res, null, 'Khôi phục banner thành công');
  } catch (error) {
    next(error);
  }
};
