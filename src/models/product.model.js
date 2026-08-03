import pool from '../config/database.js';

export const findRelatedProducts = async (productId, categoryId, limit = 2) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug,
            MIN(pv.price) AS price,
            pi.image_url
     FROM products p
     LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active'
     LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
     WHERE p.category_id = ? AND p.id != ? AND p.status = 'active' AND p.deleted_at IS NULL
     GROUP BY p.id, p.name, p.slug, pi.image_url
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [categoryId, productId, Number(limit)]
  );
  return rows;
};

export const createProduct = async (data) => {
  const [result] = await pool.execute(
    `INSERT INTO products (category_id, brand_id, name, slug, description, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.category_id, data.brand_id, data.name, data.slug, data.description || null, data.status || 'active']
  );
  return result.insertId;
};

const ALLOWED_PRODUCT_FIELDS = ['category_id', 'brand_id', 'name', 'slug', 'description', 'status'];

export const updateProduct = async (id, data) => {
  const fields = [];
  const params = [];
  for (const key of ALLOWED_PRODUCT_FIELDS) {
    if (key in data) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  params.push(id);
  await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
};

export const deleteProduct = async (id, deletedBy = null, conn = null) => {
  const exec = conn || pool;

  const [result] = await exec.execute(
    `UPDATE products SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL`,
    [deletedBy, id]
  );

  if (result.affectedRows === 0) return 0;

  await exec.execute(
    `UPDATE product_variants SET deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND deleted_at IS NULL`,
    [deletedBy, id]
  );
  await exec.execute(
    `UPDATE product_images SET deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND deleted_at IS NULL`,
    [deletedBy, id]
  );

  return result.affectedRows;
};

export const createVariant = async (productId, data) => {
  const [result] = await pool.execute(
    `INSERT INTO product_variants (product_id, sku, barcode, price, cost_price, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, data.sku, data.barcode || null, data.price, data.cost_price || 0, data.status || 'active']
  );
  return result.insertId;
};

const ALLOWED_VARIANT_FIELDS = ['sku', 'barcode', 'price', 'cost_price', 'status'];

export const updateVariant = async (id, data) => {
  const fields = [];
  const params = [];
  for (const key of ALLOWED_VARIANT_FIELDS) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  params.push(id);
  await pool.execute(`UPDATE product_variants SET ${fields.join(', ')} WHERE id = ?`, params);
};

export const deleteVariant = async (id, deletedBy = null) => {
  const [result] = await pool.execute(
    `UPDATE product_variants SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
    [deletedBy, id]
  );
  return result.affectedRows;
};

export const findProductById = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug, c.slug AS category_slug
     FROM products p
     INNER JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? AND p.deleted_at IS NULL`, [id]);
  return rows[0] || null;
};
export const findProductByIdForAdmin = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM products WHERE id = ?`, [id]
  );
  return rows[0] || null;
};

export const findImageById = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id, image_url, is_thumbnail, sort_order FROM product_images WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
};

export const findMaxSortOrder = async (productId) => {
  const [rows] = await pool.query(`SELECT MAX(sort_order) AS max_order FROM product_images WHERE product_id = ? AND deleted_at IS NULL`, [productId]);
  return rows[0].max_order ?? -1;
};

export const findThumbnailByProductId = async (productId) => {
  const [rows] = await pool.query(`SELECT id FROM product_images WHERE product_id = ? AND is_thumbnail = 1 AND deleted_at IS NULL LIMIT 1`, [productId]);
  return rows[0] || null;
};

export const addImage = async (data) => {
  const sortOrder = data.sort_order !== undefined ? data.sort_order : (await findMaxSortOrder(data.product_id)) + 1;
  const [result] = await pool.execute(
    `INSERT INTO product_images (product_id, image_url, is_thumbnail, sort_order, upload_status, local_path) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.product_id, data.image_url, data.is_thumbnail ? 1 : 0, sortOrder, data.upload_status || 'completed', data.local_path || null]
  );
  return result.insertId;
};

const ALLOWED_IMAGE_FIELDS = ['image_url', 'is_thumbnail', 'sort_order', 'upload_status', 'local_path', 'cloud_public_id', 'retry_count', 'error_message'];
export const clearThumbnail = async (productId) => {
    await pool.execute(
        `UPDATE product_images
         SET is_thumbnail = 0
         WHERE product_id = ?
         AND deleted_at IS NULL`,
        [productId]
    );
};
export const updateImage = async (id, data) => {
  const fields = [];
  const params = [];
  for (const key of ALLOWED_IMAGE_FIELDS) {
    if (key in data) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  params.push(id);
  await pool.execute(`UPDATE product_images SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, params);
};

export const setFirstImageAsThumbnail = async (productId) => {
  const [rows] = await pool.query(
    `SELECT id FROM product_images WHERE product_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC LIMIT 1`,
    [productId]
  );
  if (rows[0]) {
    await pool.execute(`UPDATE product_images SET is_thumbnail = 1 WHERE id = ?`, [rows[0].id]);
  }
};

export const deleteImage = async (id, deletedBy = null) => {
  const [result] = await pool.execute(
    `UPDATE product_images SET deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL`,
    [deletedBy, id]
  );
  return result.affectedRows;
};

export const findBySku = async (sku) => {
  const [rows] = await pool.query(`SELECT id FROM product_variants WHERE sku = ?`, [sku]);
  return rows[0];
};

export const findVariantById = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id, sku FROM product_variants WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0] || null;
};

export const restoreProduct = async (id, conn = null) => {
  const exec = conn || pool;

  const [result] = await exec.execute(
    `UPDATE products SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
    [id]
  );
  if (result.affectedRows === 0) return 0;

  await exec.execute(`UPDATE product_variants SET deleted_at = NULL, deleted_by = NULL WHERE product_id = ?`, [id]);
  await exec.execute(`UPDATE product_images SET deleted_at = NULL, deleted_by = NULL WHERE product_id = ?`, [id]);

  return result.affectedRows;
};

export const findDeletedVariantById = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id FROM product_variants WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  return rows[0] || null;
};

export const restoreVariant = async (id) => {
  const [result] = await pool.execute(
    `UPDATE product_variants SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
    [id]
  );
  return result.affectedRows;
};

export const findDeletedImageById = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id FROM product_images WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  return rows[0] || null;
};

export const restoreImage = async (id) => {
  const [result] = await pool.execute(
    `UPDATE product_images SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
    [id]
  );
  return result.affectedRows;
};

export const findNewestProductsByCategory = async (categorySlug, limit = 8) => {
  const numericLimit = Number(limit);
  const query = `
    SELECT 
      p.id, p.name, p.slug, MIN(pv.price) AS price, pi.image_url
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active'
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
    WHERE p.status = 'active' AND p.deleted_at IS NULL AND c.slug = ?
    GROUP BY p.id, p.name, p.slug, pi.image_url, p.created_at
    ORDER BY p.created_at DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(query, [categorySlug, numericLimit]);
  return rows;
};

export const countAllProducts = async (whereClause, queryParams) => {
  const query = `
    SELECT COUNT(*) AS totalItems
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
    INNER JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
    ${whereClause}
  `;

  const [rows] = await pool.query(query, queryParams);
  return rows[0].totalItems;
};

export const findAllProducts = async (whereClause, queryParams, limit, offset) => {
  const query = `
    SELECT p.id, p.name, p.slug,
           c.name AS category_name, c.slug AS category_slug,
           b.name AS brand_name,
           MIN(pv.price) AS price,
           pi.image_url,
           COALESCE(SUM(CASE WHEN o.status IN ('completed','shipping','confirmed') THEN oi.quantity ELSE 0 END), 0) AS totalSold
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
    INNER JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active' AND pv.deleted_at IS NULL
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
    LEFT JOIN order_items oi ON pv.id = oi.variant_id
    LEFT JOIN orders o ON oi.order_id = o.id
    ${whereClause}
    GROUP BY p.id, p.name, p.slug, c.name, c.slug, b.name, pi.image_url
    ORDER BY totalSold DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [...queryParams, Number(limit), Number(offset)]);
  return rows;
};

// 1. Product info by slug
export const findProductBySlug = async (slug) => {
  const query = `
    SELECT 
        p.id, p.name, p.slug, p.description, p.status, p.category_id,
        c.name AS category_name, c.slug AS category_slug,
        b.name AS brand_name
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
    INNER JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
    WHERE p.slug = ? AND p.status = 'active' AND p.deleted_at IS NULL
  `;
  const [rows] = await pool.query(query, [slug]);
  return rows[0];
};

export const findBySlugAll = async (slug) => {
  const [rows] = await pool.query(`SELECT id FROM products WHERE slug = ?`, [slug]);
  return rows[0] || null;
};

// 2. Product images
export const findProductImages = async (productId) => {
  const query = `
    SELECT id, image_url, is_thumbnail
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC
  `;
  const [rows] = await pool.query(query, [productId]);
  return rows;
};

// 3. Product variants
export const findProductVariants = async (productId) => {
  const query = `
    SELECT
         pv.id AS variant_id, pv.sku, pv.price,
         inv.quantity AS stock_quantity,
         vav.value AS attribute_value
     FROM product_variants pv
     LEFT JOIN inventories inv ON pv.id = inv.variant_id
     LEFT JOIN product_variant_values pvv ON pv.id = pvv.variant_id
     LEFT JOIN variant_attribute_values vav ON pvv.attribute_value_id = vav.id
     WHERE pv.product_id = ? AND pv.status = 'active' AND pv.deleted_at IS NULL
  `;
  const [rows] = await pool.query(query, [productId]);
  return rows;
};

export const countFilteredProducts = async (
  whereClause,
  havingClause,
  params
) => {
  const query = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT p.id
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      INNER JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variants pv
        ON p.id = pv.product_id
       AND pv.status = 'active'
      LEFT JOIN product_images pi
        ON p.id = pi.product_id
       AND pi.is_thumbnail = 1
      ${whereClause}
      GROUP BY p.id
      ${havingClause}
    ) t
  `;

  const [result] = await pool.query(query, params);

  return result[0].total;
};
export const findFilteredProducts = async (
  whereClause,
  havingClause,
  params,
  sort,
  limit,
  offset
) => {
  let orderBy = 'ORDER BY p.created_at DESC'; // Default sorting

  switch (sort) {
    case 'newest':
      orderBy = 'ORDER BY p.created_at DESC';
      break;

    case 'price_asc':
      orderBy = 'ORDER BY price ASC';
      break;

    case 'price_desc':
      orderBy = 'ORDER BY price DESC';
      break;

    case 'popular':
      orderBy =
        'ORDER BY totalSold DESC, p.created_at DESC';
      break;
  }

  const query = `
    SELECT
      p.id,
      p.name,
      p.slug,
      c.name AS category_name,
      c.slug AS category_slug,
      b.name AS brand_name,
      MIN(pv.price) AS price,
      pi.image_url,
      p.created_at,
      COALESCE(
        SUM(
          CASE
            WHEN o.status IN (
              'completed',
              'shipping',
              'confirmed'
            )
            THEN oi.quantity
            ELSE 0
          END
        ),
        0
      ) AS totalSold
    FROM products p
    INNER JOIN categories c
      ON p.category_id = c.id
    INNER JOIN brands b
      ON p.brand_id = b.id
    LEFT JOIN product_variants pv
      ON p.id = pv.product_id
     AND pv.status = 'active'
    LEFT JOIN product_images pi
      ON p.id = pi.product_id
     AND pi.is_thumbnail = 1
    LEFT JOIN order_items oi
      ON pv.id = oi.variant_id
    LEFT JOIN orders o
      ON oi.order_id = o.id
    ${whereClause}
    GROUP BY p.id, p.name, p.slug, c.name, c.slug, b.name, pi.image_url, p.created_at
    ${havingClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(query, [
    ...params,
    limit,
    offset
  ]);

  return rows;
};
export const countAllAdmin = async (
  whereClause,
  queryParams
) => {
  const query = `
    SELECT COUNT(*) AS totalItems
    FROM products p
    INNER JOIN categories c
      ON p.category_id = c.id
    INNER JOIN brands b
      ON p.brand_id = b.id
    ${whereClause}
  `;

  const [rows] = await pool.query(
    query,
    queryParams
  );

  return rows[0].totalItems;
};
export const findAllAdmin = async (
  whereClause,
  queryParams,
  limit,
  offset
) => {
  const query = `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.status,
      p.created_at,
      c.name AS category_name,
      c.slug AS category_slug,
      b.name AS brand_name,
      MIN(pv.price) AS price,
      SUM(inv.quantity) AS stock,
      pi.image_url
    FROM products p
    INNER JOIN categories c
      ON p.category_id = c.id
    INNER JOIN brands b
      ON p.brand_id = b.id
    LEFT JOIN product_variants pv
      ON p.id = pv.product_id
     AND pv.deleted_at IS NULL
    LEFT JOIN inventories inv
      ON pv.id = inv.variant_id
    LEFT JOIN product_images pi
      ON p.id = pi.product_id
     AND pi.is_thumbnail = 1
    ${whereClause}
    GROUP BY
      p.id,
      p.name,
      p.slug,
      p.status,
      c.name,
      c.slug,
      b.name,
      pi.image_url,
      p.created_at
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(
    query,
    [...queryParams, limit, offset]
  );

  return rows;
};

export const findByIdAdmin = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
            b.name AS brand_name
     FROM products p
     INNER JOIN categories c ON p.category_id = c.id
     INNER JOIN brands b ON p.brand_id = b.id
     WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) return null;

  const product = rows[0];

  const [variants] = await pool.query(
    `SELECT pv.*, inv.quantity AS stock
     FROM product_variants pv
     LEFT JOIN inventories inv ON pv.id = inv.variant_id
     WHERE pv.product_id = ?
     ORDER BY pv.id ASC`,
    [id]
  );
  product.variants = variants;

  const [images] = await pool.query(
    `SELECT id, image_url, is_thumbnail, sort_order
     FROM product_images
     WHERE product_id = ?
     ORDER BY sort_order ASC`,
    [id]
  );
  product.images = images;

  return product;
};

export const findPendingUploads = async (maxRetry) => {
  const [rows] = await pool.query(
    `SELECT id, local_path, 'product' AS type FROM product_images
     WHERE upload_status = 'pending_upload' AND retry_count < ?
     ORDER BY created_at ASC LIMIT 10`,
    [maxRetry]
  );
  return rows;
};

export const setUploading = async (id, conn = null) => {
  const exec = conn || pool;
  await exec.query(`UPDATE product_images SET upload_status = 'uploading' WHERE id = ?`, [id]);
};

export const setFailed = async (id, errorMessage, conn = null) => {
  const exec = conn || pool;
  await exec.query(
    `UPDATE product_images SET upload_status = 'failed', retry_count = retry_count + 1, error_message = ? WHERE id = ?`,
    [errorMessage, id]
  );
};

export const setCompleted = async (id, imageUrl, publicId, conn = null) => {
  const exec = conn || pool;
  await exec.query(
    `UPDATE product_images SET image_url = ?, upload_status = 'completed', cloud_public_id = ?, local_path = NULL, error_message = NULL WHERE id = ?`,
    [imageUrl, publicId, id]
  );
};

export const retryFailed = async (maxRetry) => {
  await pool.query(
    `UPDATE product_images SET upload_status = 'pending_upload', error_message = NULL
     WHERE upload_status = 'failed' AND retry_count < ?`,
    [maxRetry]
  );
};