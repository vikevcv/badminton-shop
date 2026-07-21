import slugify from 'slugify';

export default async function seedBrands(pool) {
  const brands = [
    {
      name: 'Yonex',
      country: 'Japan',
    },
    {
      name: 'Victor',
      country: 'Taiwan',
    },
    {
      name: 'Lining',
      country: 'China',
    },
    {
      name: 'Mizuno',
      country: 'Japan',
    },
    {
      name: 'Apacs',
      country: 'Malaysia',
    },
    {
      name: 'Kawasaki',
      country: 'Japan',
    },
    {
      name: 'Fleet',
      country: 'Malaysia',
    },
    {
      name: 'Kumpoo',
      country: 'China',
    },
    {
      name: 'Adidas',
      country: 'Germany',
    },
    {
      name: 'ProAce',
      country: 'United Kingdom',
    },
  ];

  for (const brand of brands) {
    const slug = slugify(brand.name, {
      lower: true,
      strict: true,
    });

    await pool.execute(
      `
      INSERT INTO brands
      (
        name,
        slug,
        logo_url,
        country,
        status
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?
      )
      `,
      [
        brand.name,
        slug,
        `/images/brands/${slug}.png`,
        brand.country,
        'active',
      ]
    );
  }

  console.log(`✔ Seeded ${brands.length} brands`);
}