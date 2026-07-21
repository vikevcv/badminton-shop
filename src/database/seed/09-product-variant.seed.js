import { faker } from '@faker-js/faker';

export default async function seedProductVariants(pool) {
  const [products] = await pool.query(`
    SELECT
      p.id,
      p.name,
      c.name AS category_name
    FROM products p
    INNER JOIN categories c
      ON c.id = p.category_id
    ORDER BY p.id
  `);

  const categoryVariants = {
    'Vợt cầu lông': [
      '3U G5',
      '4U G5',
      '4U G6',
    ],

    'Giày cầu lông': [
      '39',
      '40',
      '41',
      '42',
      '43',
    ],

    'Áo cầu lông': [
      'S',
      'M',
      'L',
      'XL',
    ],

    'Quần cầu lông': [
      'S',
      'M',
      'L',
      'XL',
    ],

    Balo: [
      'Tiêu chuẩn',
    ],

    'Phụ kiện': [
      'Mặc định',
    ],
  };

  const priceRange = {
    'Vợt cầu lông': {
      min: 1200000,
      max: 6800000,
    },

    'Giày cầu lông': {
      min: 900000,
      max: 3200000,
    },

    'Áo cầu lông': {
      min: 250000,
      max: 700000,
    },

    'Quần cầu lông': {
      min: 200000,
      max: 600000,
    },

    Balo: {
      min: 500000,
      max: 2500000,
    },

    'Phụ kiện': {
      min: 50000,
      max: 450000,
    },
  };

  let totalVariants = 0;

  for (const product of products) {
    const variants =
      categoryVariants[product.category_name] || ['Mặc định'];

    const range =
      priceRange[product.category_name] || {
        min: 100000,
        max: 500000,
      };

    const basePrice = faker.number.int({
      min: range.min,
      max: range.max,
    });

    for (const variantName of variants) {
      const sku = `${product.id}-${variantName}`
        .replace(/\s+/g, '-')
        .replace(/\//g, '-')
        .toUpperCase();

      const barcode = faker.string.numeric(13);

      const price =
        basePrice +
        faker.number.int({
          min: -100000,
          max: 100000,
        });

      const costPrice = Math.round(price * 0.7);

      await pool.execute(
        `
        INSERT INTO product_variants
        (
          product_id,
          sku,
          barcode,
          price,
          cost_price,
          status
        )
        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        )
        `,
        [
          product.id,
          sku,
          barcode,
          price,
          costPrice,
          'active',
        ]
      );

      totalVariants++;
    }
  }

  console.log(`✔ Seeded ${totalVariants} product variants`);
}