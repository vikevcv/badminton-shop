import slugify from 'slugify';

export default async function seedProductImages(pool) {
  const [products] = await pool.query(`
    SELECT
      p.id,
      p.slug AS product_slug,
      c.slug AS category_slug
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.id
  `);

  let totalImages = 0;

  for (const product of products) {
    // eg: /images/products/vot-cau-long/yonex-arcsaber-11-pro
    const imageFolder = `/images/products/${product.category_slug}/${product.product_slug}`;

    const images = [
      {
        url: `${imageFolder}/thumbnail.jpg`,
        thumbnail: true,
        sortOrder: 1,
      },
      {
        url: `${imageFolder}/1.jpg`,
        thumbnail: false,
        sortOrder: 2,
      },
      {
        url: `${imageFolder}/2.jpg`,
        thumbnail: false,
        sortOrder: 3,
      },
      {
        url: `${imageFolder}/3.jpg`,
        thumbnail: false,
        sortOrder: 4,
      },
    ];

    for (const image of images) {
      await pool.execute(
        `
        INSERT INTO product_images
        (
          product_id,
          variant_id,
          image_url,
          is_thumbnail,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          product.id,
          null,
          image.url,
          image.thumbnail,
          image.sortOrder,
        ]
      );

      totalImages++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✔ Seeded ${totalImages} product images successfully`);
}