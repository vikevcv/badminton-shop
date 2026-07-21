export default async function seedVariantAttributeValues(pool) {
  const [attributes] = await pool.query(`
    SELECT id, name
    FROM variant_attributes
  `);

  const attributeMap = Object.fromEntries(
    attributes.map((attribute) => [attribute.name, attribute.id])
  );

  const values = {
    'Trọng lượng': [
      '2U',
      '3U',
      '4U',
      '5U',
    ],

    'Kích thước cán': [
      'G4',
      'G5',
      'G6',
    ],

    Size: [
      '39',
      '40',
      '41',
      '42',
      '43',
      '44',
      '45',
    ],

    'Màu sắc': [
      'Đen',
      'Trắng',
      'Đỏ',
      'Xanh',
      'Vàng',
      'Hồng',
      'Tím',
    ],

    'Chiều dài': [
      '10m',
      '100m',
      '200m',
    ],

    'Loại đóng gói': [
      'Tiêu chuẩn',
      'Cao cấp',
    ],
  };

  let total = 0;

  for (const [attributeName, items] of Object.entries(values)) {
    const attributeId = attributeMap[attributeName];

    if (!attributeId) {
      continue;
    }

    let displayOrder = 1;

    for (const value of items) {
      await pool.execute(
        `
        INSERT INTO variant_attribute_values
        (
          attribute_id,
          value,
          display_order
        )
        VALUES
        (
          ?,
          ?,
          ?
        )
        `,
        [
          attributeId,
          value,
          displayOrder++,
        ]
      );

      total++;
    }
  }

  console.log(`✔ Seeded ${total} variant attribute values`);
}