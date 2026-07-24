import * as productService from '../../services/product.service.js';
import { verifyAdminOrStaff } from '../../services/auth.service.js';
import { sendSuccess, sendError } from '../../helpers/response.helper.js';

export const getNewestByCategory = async (req, res, next) => {
  try {
    const { categorySlug } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 8;
    const products = await productService.getNewestByCategory(categorySlug, limit);
    sendSuccess(res, products, `Lấy danh sách sản phẩm mới thuộc danh mục ${categorySlug} thành công`);
  } catch (error) {
    next(error);
  }
};

export const getAllProducts = async (req, res, next) => {
    try {
        if (req.query.display_deleted === 'true') {
          if (!await verifyAdminOrStaff(req)) {
            const error = new Error('Không có quyền truy cập');
            error.status = 403;
            throw error;
          }
          const result = await productService.getAllProductsAdmin(req.query);
          return sendSuccess(res, result);
        }
        const result = await productService.getAllProducts(req.query);
        sendSuccess(res, result.products, 'Lấy danh sách sản phẩm thành công', { pagination: result.pagination });
    } catch (error) {
        next(error);
    }
};

export const getProductDetail = async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (req.query.display_deleted === 'true') {
      if (!await verifyAdminOrStaff(req)) {
        const error = new Error('Không có quyền truy cập');
        error.status = 403;
        throw error;
      }
      const id = parseInt(slug);
      if (!isNaN(id)) {
        const product = await productService.getProductAdmin(id);
        return sendSuccess(res, product, 'Lấy chi tiết sản phẩm thành công');
      }
    }
    const product = await productService.getProductDetail(slug);
    sendSuccess(res, product, 'Lấy chi tiết sản phẩm thành công');
  } catch (error) {
    next(error);
  }
};

export const searchAndFilter = async (req, res, next) => {
  try {
    const queryObj = req.query;
    const result = await productService.getFilteredProducts(queryObj);
    sendSuccess(res, result.products, 'Lọc sản phẩm thành công', { total: result.pagination.totalItems, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

// Admin
export const createProduct = async (req, res, next) => {
  try {
    const file = req.file || null;
    const result = await productService.createProduct(req.body, file);
    sendSuccess(res, result, 'Tạo sản phẩm thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    await productService.updateProduct(parseInt(req.params.id), req.body);
    sendSuccess(res, null, 'Cập nhật sản phẩm thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(parseInt(req.params.id), req.user.userId);
    sendSuccess(res, null, 'Xóa sản phẩm thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreProduct = async (req, res, next) => {
  try {
    await productService.restoreProduct(parseInt(req.params.id));
    sendSuccess(res, null, 'Khôi phục sản phẩm thành công');
  } catch (error) {
    next(error);
  }
};

export const createVariant = async (req, res, next) => {
  try {
    const variantId = await productService.createVariant(parseInt(req.params.id), req.body);
    sendSuccess(res, { variantId }, 'Tạo biến thể thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const updateVariant = async (req, res, next) => {
  try {
    await productService.updateVariant(parseInt(req.params.id), parseInt(req.params.variantId), req.body);
    sendSuccess(res, null, 'Cập nhật biến thể thành công');
  } catch (error) {
    next(error);
  }
};

export const deleteVariant = async (req, res, next) => {
  try {
    await productService.deleteVariant(parseInt(req.params.id), parseInt(req.params.variantId), req.user.userId);
    sendSuccess(res, null, 'Xóa biến thể thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreVariant = async (req, res, next) => {
  try {
    await productService.restoreVariant(parseInt(req.params.id), parseInt(req.params.variantId));
    sendSuccess(res, null, 'Khôi phục biến thể thành công');
  } catch (error) {
    next(error);
  }
};

export const addImage = async (req, res, next) => {
  try {
    const file = req.file || null;
    if (!file) {
      const error = new Error('Vui lòng chọn ảnh');
      error.status = 400;
      throw error;
    }
    const result = await productService.addImage(
      parseInt(req.params.id), file, req.body.is_thumbnail, req.body.variant_id || null
    );
    sendSuccess(res, result, 'Thêm ảnh thành công', {}, 201);
  } catch (error) {
    next(error);
  }
};

export const deleteImage = async (req, res, next) => {
  try {
    await productService.deleteImage(parseInt(req.params.id), parseInt(req.params.imageId), req.user.userId);
    sendSuccess(res, null, 'Xóa ảnh thành công');
  } catch (error) {
    next(error);
  }
};

export const restoreImage = async (req, res, next) => {
  try {
    await productService.restoreImage(parseInt(req.params.id), parseInt(req.params.imageId));
    sendSuccess(res, null, 'Khôi phục ảnh thành công');
  } catch (error) {
    next(error);
  }
};

export const updateImage = async (req, res, next) => {
  try {
    await productService.updateImage(
      parseInt(req.params.id), parseInt(req.params.imageId), req.body, req.file || null
    );
    sendSuccess(res, null, 'Cập nhật ảnh thành công');
  } catch (error) {
    next(error);
  }
};
