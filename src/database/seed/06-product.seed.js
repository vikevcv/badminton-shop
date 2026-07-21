import slugify from 'slugify';

export default async function seedProducts(pool) {
  const [brands] = await pool.query(`
    SELECT id,name
    FROM brands
  `);

  const [categories] = await pool.query(`
    SELECT id,name
    FROM categories
  `);

  const brandMap = Object.fromEntries(
    brands.map((b) => [b.name, b.id])
  );

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.name, c.id])
  );

  const products = [
    {
      brand: 'Yonex',
      category: 'Vợt cầu lông',
      name: 'Yonex Astrox 100ZZ'
    },
    {
      brand: 'Yonex',
      category: 'Vợt cầu lông',
      name: 'Yonex Astrox 88D Pro'
    },
    {
      brand: 'Yonex',
      category: 'Vợt cầu lông',
      name: 'Yonex Astrox 88S Pro'
    },
    {
      brand: 'Yonex',
      category: 'Vợt cầu lông',
      name: 'Yonex Nanoflare 1000Z'
    },
    {
      brand: 'Yonex',
      category: 'Vợt cầu lông',
      name: 'Yonex Arcsaber 11 Pro'
    },
    {
      brand: 'Victor',
      category: 'Vợt cầu lông',
      name: 'Victor Thruster Ryuga'
    },
    {
      brand: 'Victor',
      category: 'Vợt cầu lông',
      name: 'Victor Auraspeed 90K II'
    },
    {
      brand: 'Victor',
      category: 'Vợt cầu lông',
      name: 'Victor DriveX 10 Metallic'
    },
    {
      brand: 'Lining',
      category: 'Vợt cầu lông',
      name: 'Lining Axforce 90 Dragon'
    },
    {
      brand: 'Lining',
      category: 'Vợt cầu lông',
      name: 'Lining Axforce 80'
    },
    {
      brand: 'Lining',
      category: 'Vợt cầu lông',
      name: 'Lining Tectonic 9'
    },
    {
      brand: 'Lining',
      category: 'Vợt cầu lông',
      name: 'Lining Windstorm 72'
    },
    {
      brand: 'Mizuno',
      category: 'Vợt cầu lông',
      name: 'Mizuno Fortius 10'
    },
    {
      brand: 'Apacs',
      category: 'Vợt cầu lông',
      name: 'Apacs Z Ziggler'
    },

    {
      brand: 'Yonex',
      category: 'Giày cầu lông',
      name: 'Yonex SHB 65Z3'
    },
    {
      brand: 'Yonex',
      category: 'Giày cầu lông',
      name: 'Yonex Comfort Z3'
    },
    {
      brand: 'Victor',
      category: 'Giày cầu lông',
      name: 'Victor P9200 III'
    },
    {
      brand: 'Victor',
      category: 'Giày cầu lông',
      name: 'Victor A970 ACE'
    },
    {
      brand: 'Lining',
      category: 'Giày cầu lông',
      name: 'Lining AYAT005'
    },
    {
      brand: 'Mizuno',
      category: 'Giày cầu lông',
      name: 'Mizuno Wave Fang'
    },

    {
      brand: 'Yonex',
      category: 'Áo cầu lông',
      name: 'Yonex Tournament Shirt'
    },
    {
      brand: 'Victor',
      category: 'Áo cầu lông',
      name: 'Victor Professional Shirt'
    },
    {
      brand: 'Lining',
      category: 'Áo cầu lông',
      name: 'Lining National Team Shirt'
    },

    {
      brand: 'Yonex',
      category: 'Quần cầu lông',
      name: 'Yonex Game Shorts'
    },
    {
      brand: 'Victor',
      category: 'Quần cầu lông',
      name: 'Victor Training Shorts'
    },

    {
      brand: 'Yonex',
      category: 'Balo',
      name: 'Yonex Backpack BA02312'
    },
    {
      brand: 'Victor',
      category: 'Balo',
      name: 'Victor BR9613'
    },

    {
      brand: 'Yonex',
      category: 'Phụ kiện',
      name: 'Yonex AC102EX Overgrip'
    },
    {
      brand: 'Yonex',
      category: 'Phụ kiện',
      name: 'Yonex BG80 String'
    },
    {
      brand: 'Victor',
      category: 'Phụ kiện',
      name: 'Victor VS850 String'
    }
  ];

  for (const product of products) {

    const slug = slugify(product.name, {
      lower: true,
      strict: true,
    });

    await pool.execute(
      `
      INSERT INTO products
      (
        category_id,
        brand_id,
        name,
        slug,
        description,
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
        categoryMap[product.category],
        brandMap[product.brand],
        product.name,
        slug,
        `${product.name} chính hãng 100%, bảo hành đầy đủ, phù hợp luyện tập và thi đấu.`,
        'active',
      ]
    );

  }

  console.log(`✔ Seeded ${products.length} products`);
}