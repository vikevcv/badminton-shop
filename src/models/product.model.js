import pool from '../config/database.js';

export const findRelatedProducts = async (productId, categoryId, limit = 4) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug,
            MIN(pv.price) AS price,
            pi.image_url
     FROM products p
     LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active'
     LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
     WHERE p.category_id = ? AND p.id != ? AND p.status = 'active'
     GROUP BY p.id, p.name, p.slug, pi.image_url
     ORDER BY RAND()
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
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (fields.length === 0) return;
  params.push(id);
  await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
};

export const deleteProduct = async (id, deletedBy = null) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `UPDATE products SET status = 'discontinued', deleted_at = NOW(), deleted_by = ? WHERE id = ? AND deleted_at IS NULL`,
      [deletedBy, id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return null;
    }
    await conn.execute(
      `UPDATE product_variants SET status = 'discontinued', deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND deleted_at IS NULL`,
      [deletedBy, id]
    );
    await conn.execute(
      `UPDATE product_images SET deleted_at = NOW(), deleted_by = ? WHERE product_id = ? AND deleted_at IS NULL`,
      [deletedBy, id]
    );
    await conn.commit();
    return { id };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
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
  await pool.execute(
    `UPDATE product_variants SET status = 'discontinued', deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
    [deletedBy, id]
  );
};

export const findProductById = async (id) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug, c.slug AS category_slug
     FROM products p
     INNER JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? AND p.status != 'discontinued'`, [id]);
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
    `INSERT INTO product_images (product_id, variant_id, image_url, is_thumbnail, sort_order) VALUES (?, ?, ?, ?, ?)`,
    [data.product_id, data.variant_id || null, data.image_url, data.is_thumbnail ? 1 : 0, sortOrder]
  );
  return result.insertId;
};

const ALLOWED_IMAGE_FIELDS = ['image_url', 'is_thumbnail', 'sort_order', 'variant_id'];

export const updateImage = async (id, data) => {
  if (data.is_thumbnail) {
    const [rows] = await pool.query(`SELECT product_id FROM product_images WHERE id = ? AND deleted_at IS NULL`, [id]);
    if (rows[0]) {
      await pool.execute(`UPDATE product_images SET is_thumbnail = 0 WHERE product_id = ? AND deleted_at IS NULL`, [rows[0].product_id]);
    }
  }
  const fields = [];
  const params = [];
  for (const key of ALLOWED_IMAGE_FIELDS) {
    if (data[key] !== undefined) {
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
  const [rows] = await pool.query(`SELECT image_url, product_id, is_thumbnail FROM product_images WHERE id = ? AND deleted_at IS NULL`, [id]);
  const image = rows[0] || null;
  if (!image) return null;

  if (deletedBy) {
    await pool.execute(`UPDATE product_images SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`, [deletedBy, id]);
  } else {
    await pool.execute(`UPDATE product_images SET deleted_at = NOW() WHERE id = ?`, [id]);
  }

  if (image.is_thumbnail) {
    await setFirstImageAsThumbnail(image.product_id);
  }

  return image;
};

export const findBySku = async (sku) => {
  const [rows] = await pool.query(`SELECT id FROM product_variants WHERE sku = ?`, [sku]);
  return rows[0];
};

export const findVariantById = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id, sku FROM product_variants WHERE id = ? AND status != 'discontinued'`, [id]);
  return rows[0] || null;
};

export const restoreProduct = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT id FROM products WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
    if (!rows[0]) {
      await conn.commit();
      return null;
    }
    await conn.execute(`UPDATE products SET deleted_at = NULL, status = 'active', deleted_by = NULL WHERE id = ?`, [id]);
    await conn.execute(`UPDATE product_variants SET deleted_at = NULL, status = 'active', deleted_by = NULL WHERE product_id = ?`, [id]);
    await conn.execute(`UPDATE product_images SET deleted_at = NULL, deleted_by = NULL WHERE product_id = ?`, [id]);
    await conn.commit();
    return rows[0];
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export const restoreVariant = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id FROM product_variants WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  if (!rows[0]) return null;
  await pool.execute(`UPDATE product_variants SET deleted_at = NULL, status = 'active', deleted_by = NULL WHERE id = ?`, [id]);
  return rows[0];
};

export const restoreImage = async (id) => {
  const [rows] = await pool.query(`SELECT id, product_id, image_url FROM product_images WHERE id = ? AND deleted_at IS NOT NULL`, [id]);
  if (!rows[0]) return null;
  await pool.execute(`UPDATE product_images SET deleted_at = NULL, deleted_by = NULL WHERE id = ?`, [id]);
  return rows[0];
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
    WHERE p.status = 'active' AND c.slug = ?
    GROUP BY p.id, p.name, p.slug, pi.image_url, p.created_at
    ORDER BY p.created_at DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(query, [categorySlug, numericLimit]);
  return rows;
};

export const findAllProducts = async () => {
  const query = `
    SELECT 
        p.id, p.name, p.slug, 
        c.name AS category_name, c.slug AS category_slug, 
        b.name AS brand_name, 
        MIN(pv.price) AS price, 
        pi.image_url
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
    INNER JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active'
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.slug, c.name, c.slug, b.name, pi.image_url, p.created_at
    ORDER BY p.created_at DESC
  `;

  const [rows] = await pool.query(query);
  return rows;
};

export const findAllProductsPaginated = async (page = 1, limit = 8) => {
  const offset = (page - 1) * limit;

  const [[{ totalItems }]] = await pool.query(`
    SELECT COUNT(*) AS totalItems FROM (
      SELECT p.id FROM products p
      INNER JOIN categories c ON p.category_id = c.id AND c.deleted_at IS NULL
      INNER JOIN brands b ON p.brand_id = b.id AND b.deleted_at IS NULL
      WHERE p.status = 'active'
      GROUP BY p.id
    ) AS count_table
  `);

  const [rows] = await pool.query(`
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
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.slug, c.name, c.slug, b.name, pi.image_url
    ORDER BY totalSold DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `, [Number(limit), Number(offset)]);

  return { totalItems, products: rows };
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
    WHERE p.slug = ? AND p.status != 'discontinued'
  `;
  const [rows] = await pool.query(query, [slug]);
  return rows[0];
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
        pv.id AS variant_id, pv.sku, pv.price, pv.status,
        inv.quantity AS stock_quantity,
        va.name AS attribute_name, 
        vav.value AS attribute_value
    FROM product_variants pv
    LEFT JOIN inventories inv ON pv.id = inv.variant_id
    LEFT JOIN product_variant_values pvv ON pv.id = pvv.variant_id
    LEFT JOIN variant_attribute_values vav ON pvv.attribute_value_id = vav.id
    LEFT JOIN variant_attributes va ON vav.attribute_id = va.id
    WHERE pv.product_id = ? AND pv.status != 'discontinued'
  `;
  const [rows] = await pool.query(query, [productId]);
  return rows;
};

export const searchAndFilterProducts = async (params) => {
  const { keyword, category, brands, minPrice, maxPrice, sort, limit, offset } = params;

  const queryParams = [];
  const whereConditions = ["p.status = 'active'"];

  // 1. WHERE (keyword, category)
  if (keyword) {
    const searchWords = keyword.trim().split(/\s+/);
    
    searchWords.forEach(word => {
      whereConditions.push(`p.name LIKE ?`);
      queryParams.push(`%${word}%`);
    });
  }
  if (category) {
    whereConditions.push(`c.slug = ?`);
    queryParams.push(category);
  }
  
  // Multiple brands (IN clause)
  if (brands && brands.length > 0) {
    const placeholders = brands.map(() => '?').join(',');
    whereConditions.push(`b.slug IN (${placeholders})`);
    queryParams.push(...brands);
  }

  // Base SQL (shared by count + data queries)
  const baseQuery = `
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    INNER JOIN brands b ON p.brand_id = b.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active'
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY p.id, p.name, p.slug, c.name, c.slug, b.name, pi.image_url, p.created_at
  `;

  // 2. HAVING (price range)
  const havingClauses = [];
  if (minPrice) {
    havingClauses.push(`MIN(pv.price) >= ?`);
    queryParams.push(minPrice);
  }
  if (maxPrice) {
    havingClauses.push(`MIN(pv.price) <= ?`);
    queryParams.push(maxPrice);
  }
  const havingString = havingClauses.length > 0 ? ` HAVING ${havingClauses.join(' AND ')}` : '';

  // A. Count (pagination)
  const countQuery = `SELECT COUNT(*) AS totalItems FROM (SELECT p.id ${baseQuery} ${havingString}) AS count_table`;
  const [countResult] = await pool.query(countQuery, queryParams);
  const totalItems = countResult[0].totalItems;

  // B. Data query
  let dataQuery = `
    SELECT p.id, p.name, p.slug, c.name AS category_name, c.slug AS category_slug, 
           b.name AS brand_name, MIN(pv.price) AS price, pi.image_url, p.created_at,
           COALESCE(SUM(CASE WHEN o.status IN ('completed','shipping','confirmed') THEN oi.quantity ELSE 0 END), 0) AS totalSold
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    INNER JOIN brands b ON p.brand_id = b.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status = 'active'
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
    LEFT JOIN order_items oi ON pv.id = oi.variant_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE ${whereConditions.join(' AND ')}
    GROUP BY p.id, p.name, p.slug, c.name, c.slug, b.name, pi.image_url, p.created_at
    ${havingString}
  `;

  // Sort
  switch (sort) {
    case 'price_asc': dataQuery += ` ORDER BY price ASC`; break;
    case 'price_desc': dataQuery += ` ORDER BY price DESC`; break;
    case 'popular': dataQuery += ` ORDER BY totalSold DESC, p.created_at DESC`; break;
    case 'newest': default: dataQuery += ` ORDER BY p.created_at DESC`; break;
  }

  // Paginate
  dataQuery += ` LIMIT ? OFFSET ?`;

  const [rows] = await pool.query(dataQuery, [...queryParams, Number(limit), Number(offset)]);

  return {
    totalItems: totalItems,
    products: rows
  };
};

export const findAllAdmin = async (params) => {
  const { keyword, categoryId, brandId, status, page, limit } = params;
  const offset = (page - 1) * limit;
  const queryParams = [];
  const whereConditions = [];

  if (keyword) {
    whereConditions.push(`p.name LIKE ?`);
    queryParams.push(`%${keyword}%`);
  }
  if (categoryId) {
    whereConditions.push(`p.category_id = ?`);
    queryParams.push(categoryId);
  }
  if (brandId) {
    whereConditions.push(`p.brand_id = ?`);
    queryParams.push(brandId);
  }
  if (status) {
    whereConditions.push(`p.status = ?`);
    queryParams.push(status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const baseQuery = `
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    INNER JOIN brands b ON p.brand_id = b.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.status != 'discontinued'
    LEFT JOIN inventories inv ON pv.id = inv.variant_id
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_thumbnail = 1
    ${whereClause}
    GROUP BY p.id, p.name, p.slug, p.status, c.name, c.slug, b.name, pi.image_url, p.created_at
  `;

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS totalItems FROM (SELECT p.id ${baseQuery}) AS count_table`,
    queryParams
  );
  const totalItems = countResult[0].totalItems;

  const [rows] = await pool.query(
    `SELECT p.id, p.name, p.slug, p.status, p.created_at,
            c.name AS category_name, c.slug AS category_slug,
            b.name AS brand_name,
            MIN(pv.price) AS price,
            SUM(inv.quantity) AS stock,
            pi.image_url
     ${baseQuery}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, Number(limit), Number(offset)]
  );

  return { totalItems, products: rows };
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