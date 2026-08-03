import slugify from 'slugify';
import path from 'path';
import { fileURLToPath } from 'url';
import * as productModel from '../models/product.model.js';
import * as inventoryModel from '../models/inventory.model.js';
import * as categoryModel from '../models/category.model.js';
import * as brandModel from '../models/brand.model.js';
import * as reviewModel from '../models/review.model.js';
import pool from '../config/database.js';
import { formatVND } from '../helpers/currency.helper.js';
import { addUploadJob } from '../queues/upload.queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateSlug = (name) => {
  return slugify(name, { lower: true, strict: true, locale: 'vi' });
};

const getLocalPath = (file) => {
  return file ? path.join(__dirname, '../../public/uploads', path.basename(file.path)) : null;
};

const validateVariantOwnership = async (productId, variantId) => {
  const variant = await productModel.findVariantById(variantId);
  if (!variant) {
    const error = new Error('Không tìm thấy biến thể');
    error.status = 404;
    throw error;
  }
  if (variant.product_id !== productId) {
    const error = new Error('Biến thể không thuộc sản phẩm này');
    error.status = 400;
    throw error;
  }
  return variant;
};

export const getAllProductsAdmin = async (params) => {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 20));
  const offset = (page - 1) * limit;

  const queryParams = [];
  const where = [];

  if (params.status) {
    where.push('p.status = ?');
    queryParams.push(params.status);
  }

  const whereClause =
    where.length > 0
      ? `WHERE ${where.join(' AND ')}`
      : '';

  const totalItems = await productModel.countAllAdmin(
    whereClause,
    queryParams
  );

  const products = await productModel.findAllAdmin(
    whereClause,
    queryParams,
    limit,
    offset
  );

  return {
    totalItems,
    products
  };
};

export const getProductAdmin = async (id) => {
  const product = await productModel.findByIdAdmin(id);
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }
  return product;
};

export const getNewestByCategory = async (categorySlug, limit = 8) => {
  const category = await categoryModel.findBySlug(categorySlug);
  if (!category) {
    const error = new Error(`Danh mục ${categorySlug} không tồn tại`);
    error.status = 404;
    throw error;
  }
  const products = await productModel.findNewestProductsByCategory(categorySlug, limit);
  
  const formatProduct = products.map((product) => {
      return {
          ...product,
          formattedPrice: formatVND(product.price),
          image_url: product.image_url || '/images/default-racket.png'
      };
  });
  return formatProduct;
};

export const getAllProducts = async (params = {}) => {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 8));
  const offset = (page - 1) * limit;

  const where = ["p.status = 'active'", "p.deleted_at IS NULL"];
  const queryParams = [];

  const whereClause =
    where.length > 0
      ? `WHERE ${where.join(' AND ')}`
      : '';

  const totalItems = await productModel.countAllProducts(
    whereClause,
    queryParams
  );

  const products = await productModel.findAllProducts(
    whereClause,
    queryParams,
    limit,
    offset
  );

  const formattedProducts = products.map((product) => ({
    ...product,
    price: Number(product.price),
    formattedPrice: formatVND(product.price),
    image_url: product.image_url || '/images/default-racket.png',
  }));

  return {
    products: formattedProducts,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

export const getProductDetail = async (slug) => {
  const product = await productModel.findProductBySlug(slug);
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }

  const [images, rawVariants, ratingStats, relatedProducts] = await Promise.all([
    productModel.findProductImages(product.id),
    productModel.findProductVariants(product.id),
    reviewModel.getRatingStats(product.id),
    productModel.findRelatedProducts(product.id, product.category_id)
  ]);

  const variantMap = new Map();

  rawVariants.forEach((row) => {
    const attrValue = row.attribute_value || '';

    if (!variantMap.has(row.variant_id)) {
      variantMap.set(row.variant_id, {
        variant_id: row.variant_id,
        sku: row.sku,
        price: Number(row.price),
        formattedPrice: formatVND(row.price),
        stock_quantity: row.stock_quantity,
        variant_name: attrValue || row.sku
      });
    } else {
      if (attrValue) {
        const existing = variantMap.get(row.variant_id);
        existing.variant_name += ` - ${attrValue}`;
      }
    }
  });

  const variants = Array.from(variantMap.values());

  const defaultPrice = variants.length > 0
    ? Math.min(...variants.map(v => parseFloat(v.price)))
    : 0;

  return {
    ...product,
    formattedDefaultPrice: formatVND(defaultPrice),
    images: images,
    variants: variants,
    rating_stats: ratingStats,
    related_products: relatedProducts.map(p => ({
      ...p,
      formattedPrice: formatVND(p.price)
    }))
  };
};

export const getFilteredProducts = async (queryObj) => {
  const brands = queryObj.brand
    ? queryObj.brand.split(',')
    : [];

  const page = Number(queryObj.page) || 1;
  const limit = Number(queryObj.limit) || 8;
  const offset = (page - 1) * limit;

  const where = ["p.status = 'active'", "p.deleted_at IS NULL"];
  const params = [];

  if (queryObj.keyword) {
    const keyword = queryObj.keyword;

    keyword
      .trim()
      .split(/\s+/)
      .forEach((word) => {
        where.push('(p.name LIKE ? OR c.name LIKE ?)');
        params.push(`%${word}%`, `%${word}%`);
      });
  }

  if (queryObj.category) {
    where.push('c.slug = ?');
    params.push(queryObj.category);
  }

  if (brands.length) {
    const placeholders = brands.map(() => '?').join(',');

    where.push(`b.slug IN (${placeholders})`);
    params.push(...brands);
  }

  const having = [];

  if (queryObj.minPrice) {
    having.push('MIN(pv.price) >= ?');
    params.push(Number(queryObj.minPrice));
  }

  if (queryObj.maxPrice) {
    having.push('MIN(pv.price) <= ?');
    params.push(Number(queryObj.maxPrice));
  }

  const whereClause =
    where.length > 0
      ? `WHERE ${where.join(' AND ')}`
      : '';

  const havingClause =
    having.length > 0
      ? `HAVING ${having.join(' AND ')}`
      : '';

  const sort = queryObj.sort || 'newest';

  const totalItems = await productModel.countFilteredProducts(
    whereClause,
    havingClause,
    params
  );

  const products = await productModel.findFilteredProducts(
    whereClause,
    havingClause,
    params,
    sort,
    limit,
    offset
  );

  return {
    products: products.map((product) => ({
      ...product,
      price: Number(product.price),
      formattedPrice: formatVND(product.price),
      image_url:
        product.image_url ||
        '/images/default-racket.png'
    })),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  };
};

export const createProduct = async (data, file) => {
  const categoryId = Number(data.category_id);
  const brandId = Number(data.brand_id);

  const [category, brand] = await Promise.all([
    categoryModel.findById(categoryId),
    brandModel.findById(brandId)
  ]);
  if (!category) {
    const error = new Error('Danh mục không tồn tại');
    error.status = 400;
    throw error;
  }
  if (!brand) {
    const error = new Error('Thương hiệu không tồn tại');
    error.status = 400;
    throw error;
  }

  const baseSlug = generateSlug(data.name);
  let slug = baseSlug;
  let counter = 1;

  while (await productModel.findBySlugAll(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const productId = await productModel.createProduct({
    category_id: categoryId,
    brand_id: brandId,
    name: data.name,
    slug,
    description: data.description || null,
    status: data.status || 'active'
  });

  if (file) {
    const localPath = getLocalPath(file);
    const imageId = await productModel.addImage({
      product_id: productId,
      image_url: '/images/default-racket.png',
      is_thumbnail: true,
      sort_order: 0,
      upload_status: 'pending_upload',
      local_path: localPath,
    });
    await addUploadJob({ table: 'product_images', id: imageId, localPath, type: 'product' });
  }

  return { productId, slug };
};

export const updateProduct = async (id, data) => {
  const product = await productModel.findProductByIdForAdmin(id);
  if (!product || product.deleted_at !== null) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }
  const updateData = {};
  if ('name' in data && data.name.trim() === ''){
    const error = new Error('Tên sản phẩm không được để trống');
    error.status = 400;
    throw error;
  }
  if ('description' in data && data.description.trim() === ''){
    const error = new Error('Mô tả sản phẩm không được để trống');
    error.status = 400;
    throw error;
  }
  if ('status' in data && !['active', 'inactive', 'discontinued'].includes(data.status)){
    const error = new Error('Trạng thái sản phẩm không hợp lệ');
    error.status = 400;
    throw error;
  }

  if ('name' in data) {
    updateData.name = data.name;
  }
  if ('category_id' in data) {
    updateData.category_id = Number(data.category_id);
    const category = await categoryModel.findById(updateData.category_id);
    if (!category) {
      const error = new Error('Danh mục không tồn tại');
      error.status = 400;
      throw error;
    }
  }
  if ('brand_id' in data) {
    updateData.brand_id = Number(data.brand_id);
    const brand = await brandModel.findById(updateData.brand_id);
    if (!brand) {
      const error = new Error('Thương hiệu không tồn tại');
      error.status = 400;
      throw error;
    }
  }
  
  if ('description' in data) updateData.description = data.description;
  if ('status' in data) updateData.status = data.status;

  await productModel.updateProduct(id, updateData);
};
export const updateProductSlug = async (slug, productId) => {
  const exists = await productModel.findProductById(productId);
  if (!exists) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }
  const oldSlug = exists.slug;
  const normalized = slugify(slug, { lower: true, strict: true, locale: 'vi' });
  if (!normalized) {
    const error = new Error('Slug không hợp lệ');
    error.status = 400;
    throw error;
  }
  if (normalized === oldSlug) {
    const error = new Error('Slug mới phải khác slug hiện tại');
    error.status = 400;
    throw error;
  }

  const clash = await productModel.findBySlugAll(normalized);
  if (clash && clash.id !== productId) {
    const error = new Error('Slug đã tồn tại');
    error.status = 400;
    throw error;
  }

  await productModel.updateProduct(productId, { slug: normalized });
};

export const deleteProduct = async (id, deletedBy = null) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const affected = await productModel.deleteProduct(id, deletedBy, conn);
    if (affected === 0) {
      const error = new Error('Không tìm thấy sản phẩm');
      error.status = 404;
      throw error;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const restoreProduct = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const affected = await productModel.restoreProduct(id, conn);
    if (affected === 0) {
      const error = new Error('Không tìm thấy sản phẩm đã xóa');
      error.status = 404;
      throw error;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const createVariant = async (productId, data) => {
  const sku = data.sku || `${productId}-${Date.now()}`;
  const existing = await productModel.findBySku(sku);
  if (existing) {
    const error = new Error('SKU đã tồn tại');
    error.status = 400;
    throw error;
  }

  const variantId = await productModel.createVariant(productId, {
    sku,
    barcode: data.barcode || null,
    price: Number(data.price),
    cost_price: Number(data.cost_price || 0),
    status: data.status || 'active'
  });

  await inventoryModel.createInventory(variantId, Number(data.stock_quantity || 0));

  return variantId;
};

export const updateVariant = async (productId, variantId, data) => {
  await validateVariantOwnership(productId, variantId);
  const updateData = {};
  if ('sku' in data) {
    if(data.sku.trim() === ''){
      const error = new Error('SKU không được để trống');
      error.status = 400;
      throw error;
    }
    const existing = await productModel.findBySku(data.sku);
    if (existing && existing.id !== variantId) {
      const error = new Error('SKU đã tồn tại');
      error.status = 400;
      throw error;
    }
    updateData.sku = data.sku;
  }
  if ('price' in data && (data.price === null || data.price.trim() === '')) {
    const error = new Error('Giá bán không được để trống');
    error.status = 400;
    throw error;
  }
  if ('cost_price' in data && (data.cost_price === null || data.cost_price.trim() === '')) {
    const error = new Error('Giá vốn không được để trống');
    error.status = 400;
    throw error;
  }
  if ('status' in data && (data.status === null || data.status.trim() === '')) {
    const error = new Error('Trạng thái không được để trống');
    error.status = 400;
    throw error;
  }
  if ('barcode' in data) updateData.barcode = data.barcode;
  if ('price' in data) updateData.price = data.price;
  if ('cost_price' in data) updateData.cost_price = data.cost_price;
  if ('status' in data) updateData.status = data.status;

  await productModel.updateVariant(variantId, updateData);
};

export const deleteVariant = async (productId, variantId, deletedBy = null) => {
  await validateVariantOwnership(productId, variantId);
  const affected = await productModel.deleteVariant(variantId, deletedBy);
  if (affected === 0) {
    const error = new Error('Không tìm thấy biến thể');
    error.status = 404;
    throw error;
  }
};

export const restoreVariant = async (productId, variantId) => {
  const variant = await productModel.findDeletedVariantById(variantId);
  if (!variant) {
    const error = new Error('Không tìm thấy biến thể đã xóa');
    error.status = 404;
    throw error;
  }
  if (variant.product_id !== productId) {
    const error = new Error('Biến thể không thuộc sản phẩm này');
    error.status = 400;
    throw error;
  }
  await productModel.restoreVariant(variantId);
};

export const addImage = async (productId, file, isThumbnail) => {
  const product = await productModel.findProductById(productId);
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }

  const parsedThumbnail = isThumbnail === 'true';

  if (parsedThumbnail) {
    const existingThumbnail = await productModel.findThumbnailByProductId(productId);
    if (existingThumbnail) {
      const error = new Error('Sản phẩm đã có ảnh thumbnail. Vui lòng dùng chức năng cập nhật để thay thế.');
      error.status = 400;
      throw error;
    }
  }

  const nextSort = (await productModel.findMaxSortOrder(productId)) + 1;

  const localPath = getLocalPath(file);

  const imageId = await productModel.addImage({
    product_id: productId,
    image_url: '/images/default-racket.png',
    is_thumbnail: parsedThumbnail,
    sort_order: nextSort,
    upload_status: 'pending_upload',
    local_path: localPath,
  });

  await addUploadJob({ table: 'product_images', id: imageId, localPath, type: 'product' });

  return { imageId, imageUrl: '/images/default-racket.png' };
};

export const deleteImage = async (productId, imageId, deletedBy = null) => {
  const image = await productModel.findImageById(imageId);
  if (!image) {
    const error = new Error('Không tìm thấy ảnh');
    error.status = 404;
    throw error;
  }
  if (image.product_id !== productId) {
    const error = new Error('Ảnh không thuộc sản phẩm này');
    error.status = 400;
    throw error;
  }

  await productModel.deleteImage(imageId, deletedBy);

  if (image.is_thumbnail) {
    await productModel.setFirstImageAsThumbnail(image.product_id);
  }
};

export const restoreImage = async (productId, imageId) => {
  const image = await productModel.findDeletedImageById(imageId);
  if (!image) {
    const error = new Error('Không tìm thấy ảnh đã xóa');
    error.status = 404;
    throw error;
  }
  if (image.product_id !== productId) {
    const error = new Error('Ảnh không thuộc sản phẩm này');
    error.status = 400;
    throw error;
  }
  await productModel.restoreImage(imageId);
};

export const updateImage = async (productId, imageId, data, file = null) => {
  const image = await productModel.findImageById(imageId);
  if (!image) {
    const error = new Error('Không tìm thấy ảnh');
    error.status = 404;
    throw error;
  }
  if (image.product_id !== productId) {
    const error = new Error('Ảnh không thuộc sản phẩm này');
    error.status = 400;
    throw error;
  }

  if (file) {
    const localPath = getLocalPath(file);
    data.image_url = '/images/default-racket.png';
    data.upload_status = 'pending_upload';
    data.local_path = localPath;
    data.retry_count = 0;
    data.error_message = null;
  }

  const isThumb = data.is_thumbnail === true || data.is_thumbnail === 1 ||
                  data.is_thumbnail === 'true' || data.is_thumbnail === '1';
  if (isThumb) {
    await productModel.clearThumbnail(productId);
    data.is_thumbnail = 1;
  } else if ('is_thumbnail' in data) {
    data.is_thumbnail = 0;
  }

  if (data.sort_order !== undefined) data.sort_order = Number(data.sort_order);

  await productModel.updateImage(imageId, data);

  if (file) {
    const localPath = getLocalPath(file);
    await addUploadJob({ table: 'product_images', id: imageId, localPath, type: 'product' });
  }
};
