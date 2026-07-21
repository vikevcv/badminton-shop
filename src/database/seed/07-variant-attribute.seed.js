export default async function seedVariantAttributes(pool) {
  const attributes = [
    {
      name: 'Trọng lượng',
      displayOrder: 1,
    },
    {
      name: 'Kích thước cán',
      displayOrder: 2,
    },
    {
      name: 'Size',
      displayOrder: 3,
    },
    {
      name: 'Màu sắc',
      displayOrder: 4,
    },
    {
      name: 'Chiều dài',
      displayOrder: 5,
    },
    {
      name: 'Loại đóng gói',
      displayOrder: 6,
    },
  ];

  for (const attribute of attributes) {
    await pool.execute(
      `
      INSERT INTO variant_attributes
      (
        name,
        display_order,
        status
      )
      VALUES
      (
        ?,
        ?,
        ?
      )
      `,
      [
        attribute.name,
        attribute.displayOrder,
        'active',
      ]
    );
  }

  console.log(`✔ Seeded ${attributes.length} variant attributes`);
}