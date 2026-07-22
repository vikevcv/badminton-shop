import slugify from 'slugify';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import * as productModel from '../models/product.model.js';
import * as inventoryModel from '../models/inventory.model.js';
import * as reviewModel from '../models/review.model.js';
import { formatVND } from '../helpers/currency.helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generateSlug = (name) => {
  return slugify(name, { lower: true, strict: true, locale: 'vi' });
};

const getImageDest = async (product, ext, sortOrder) => {
  const relativeDir = `/images/products/${product.category_slug}/${product.slug}`;
  const absoluteDir = path.join(__dirname, '../../public', relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  let filename = `${sortOrder}${ext}`;
  let absolutePath = path.join(absoluteDir, filename);
  let counter = 0;
  while (true) {
    try {
      await fs.access(absolutePath);
      counter++;
      filename = `${sortOrder}-${counter}${ext}`;
      absolutePath = path.join(absoluteDir, filename);
    } catch {
      break;
    }
  }

  return { relativeUrl: `${relativeDir}/${filename}`, absolutePath };
};

const moveFile = async (file, product, sortOrder = 0) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const dest = await getImageDest(product, ext, sortOrder);
  await fs.rename(file.path, dest.absolutePath);
  return dest.relativeUrl;
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

  return await productModel.findAllAdmin({
    keyword: params.keyword,
    categoryId: params.category_id ? Number(params.category_id) : undefined,
    brandId: params.brand_id ? Number(params.brand_id) : undefined,
    status: params.status,
    page,
    limit
  });
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
    try {
        const products = await productModel.findNewestProductsByCategory(categorySlug, limit);
        const formatProduct = products.map((product) => {
            return {
                ...product,
                formattedPrice: formatVND(product.price),
                imageUrl: product.image_url || '/images/default-racket.png'
            };
        });
        return formatProduct;
    } catch (error) {
        throw error;
    }
};

export const getAllProducts = async (params = {}) => {
  const page = Math.max(1, parseInt(params.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit) || 8));
  const result = await productModel.findAllProductsPaginated(page, limit);

  const formattedProducts = result.products.map((product) => ({
    ...product,
    formattedPrice: formatVND(product.price),
    imageUrl: product.image_url || '/images/default-racket.png',
  }));

  return {
    products: formattedProducts,
    pagination: {
      page, limit,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / limit)
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
        price: row.price,
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
  let brands = [];
  if (queryObj.brand) {
    brands = queryObj.brand.split(',');
  }

  const page = parseInt(queryObj.page) || 1;
  const limit = parseInt(queryObj.limit) || 8;
  const offset = (page - 1) * limit;

  const params = {
    keyword: queryObj.keyword || queryObj.q || null,
    category: queryObj.category || null,
    brands: brands,
    sort: queryObj.sort || 'newest',
    minPrice: queryObj.minPrice ? parseFloat(queryObj.minPrice) : null,
    maxPrice: queryObj.maxPrice ? parseFloat(queryObj.maxPrice) : null,
    limit: limit,
    offset: offset
  };

  const result = await productModel.searchAndFilterProducts(params);
  
  const formattedProducts = result.products.map((product) => ({
    ...product,
    formattedPrice: formatVND(product.price),
    imageUrl: product.image_url || '/images/default-racket.png',
  }));

  const totalPages = Math.ceil(result.totalItems / limit);
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push({ page: i, isCurrent: i === page });
  }

  return {
    products: formattedProducts,
    pagination: {
      page, limit, totalPages, totalItems: result.totalItems, pages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prevPage: page - 1,
      nextPage: page + 1
    }
  };
};

export const createProduct = async (data, file) => {
  let slug = data.slug || generateSlug(data.name);
  const existing = await productModel.findProductBySlug(slug);
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const productId = await productModel.createProduct({
    category_id: Number(data.category_id),
    brand_id: Number(data.brand_id),
    name: data.name,
    slug,
    description: data.description || null,
    status: data.status || 'active'
  });

  if (file) {
    const product = await productModel.findProductById(productId);
    const imageUrl = await moveFile(file, product, 0);
    await productModel.addImage({
      product_id: productId,
      image_url: imageUrl,
      is_thumbnail: true,
      sort_order: 0
    });
  }

  return { productId, slug };
};

export const updateProduct = async (id, data) => {
  const updateData = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = data.slug || generateSlug(data.name);
  }
  if (data.category_id !== undefined) updateData.category_id = data.category_id;
  if (data.brand_id !== undefined) updateData.brand_id = data.brand_id;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;

  await productModel.updateProduct(id, updateData);
};

export const deleteProduct = async (id, deletedBy = null) => {
  const result = await productModel.deleteProduct(id, deletedBy);
  if (!result) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }
};

export const restoreProduct = async (id) => {
  const result = await productModel.restoreProduct(id);
  if (!result) {
    const error = new Error('Không tìm thấy sản phẩm đã xóa');
    error.status = 404;
    throw error;
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
  if (data.sku !== undefined) {
    const existing = await productModel.findBySku(data.sku);
    if (existing && existing.id !== variantId) {
      const error = new Error('SKU đã tồn tại');
      error.status = 400;
      throw error;
    }
    updateData.sku = data.sku;
  }
  if (data.barcode !== undefined) updateData.barcode = data.barcode;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.cost_price !== undefined) updateData.cost_price = data.cost_price;
  if (data.status !== undefined) updateData.status = data.status;

  await productModel.updateVariant(variantId, updateData);
};

export const deleteVariant = async (productId, variantId, deletedBy = null) => {
  await validateVariantOwnership(productId, variantId);
  await productModel.deleteVariant(variantId, deletedBy);
};

export const restoreVariant = async (productId, variantId) => {
  const variant = await productModel.restoreVariant(variantId);
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
};

export const addImage = async (productId, file, isThumbnail, variantId = null) => {
  const product = await productModel.findProductById(productId);
  if (!product) {
    const error = new Error('Không tìm thấy sản phẩm');
    error.status = 404;
    throw error;
  }

  const parsedThumbnail = isThumbnail === 'true' || isThumbnail === true;

  if (parsedThumbnail) {
    const existingThumbnail = await productModel.findThumbnailByProductId(productId);
    if (existingThumbnail) {
      const error = new Error('Sản phẩm đã có ảnh thumbnail. Vui lòng dùng chức năng cập nhật để thay thế.');
      error.status = 400;
      throw error;
    }
  }

  const nextSort = (await productModel.findMaxSortOrder(productId)) + 1;

  const imageUrl = await moveFile(file, product, nextSort);

  const imageId = await productModel.addImage({
    product_id: productId,
    variant_id: variantId || null,
    image_url: imageUrl,
    is_thumbnail: parsedThumbnail,
    sort_order: nextSort
  });
  return { imageId, imageUrl };
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

  if (image.image_url) {
    const filePath = path.join(__dirname, '../../public', image.image_url);
    try {
      await fs.unlink(filePath);
    } catch {
    }
  }
};

export const restoreImage = async (productId, imageId) => {
  const image = await productModel.restoreImage(imageId);
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
    const product = await productModel.findProductById(productId);
    const sortOrder = data.sort_order !== undefined ? Number(data.sort_order) : image.sort_order;
    const newImageUrl = await moveFile(file, product, sortOrder);

    const oldFilePath = path.join(__dirname, '../../public', image.image_url);
    try { await fs.unlink(oldFilePath); } catch {}

    data.image_url = newImageUrl;
  }

  if (data.is_thumbnail !== undefined) {
    data.is_thumbnail = data.is_thumbnail === 'true' || data.is_thumbnail === true || data.is_thumbnail === 1 ? 1 : 0;
  }
  if (data.sort_order !== undefined) data.sort_order = Number(data.sort_order);
  if (data.variant_id !== undefined) data.variant_id = data.variant_id ? Number(data.variant_id) : null;

  await productModel.updateImage(imageId, data);
};
