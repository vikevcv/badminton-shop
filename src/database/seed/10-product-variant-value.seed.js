export default async function seedProductVariantValues(pool) {
  const [variants] = await pool.query(`
    SELECT
      pv.id,
      pv.sku,
      c.name AS category_name
    FROM product_variants pv
    INNER JOIN products p
      ON p.id = pv.product_id
    INNER JOIN categories c
      ON c.id = p.category_id
    ORDER BY pv.id
  `);

  const [attributeValues] = await pool.query(`
    SELECT
      vav.id,
      va.name AS attribute_name,
      vav.value
    FROM variant_attribute_values vav
    INNER JOIN variant_attributes va
      ON va.id = vav.attribute_id
  `);

  const valueMap = {};

  for (const item of attributeValues) {
    valueMap[`${item.attribute_name}:${item.value}`] = item.id;
  }

  let total = 0;

  for (const variant of variants) {
    const values = [];

    switch (variant.category_name) {
      case 'Vợt cầu lông': {
        if (variant.sku.includes('3U')) {
          values.push(valueMap['Trọng lượng:3U']);
        }

        if (variant.sku.includes('4U')) {
          values.push(valueMap['Trọng lượng:4U']);
        }

        if (variant.sku.includes('5U')) {
          values.push(valueMap['Trọng lượng:5U']);
        }

        if (variant.sku.includes('G4')) {
          values.push(valueMap['Kích thước cán:G4']);
        }

        if (variant.sku.includes('G5')) {
          values.push(valueMap['Kích thước cán:G5']);
        }

        if (variant.sku.includes('G6')) {
          values.push(valueMap['Kích thước cán:G6']);
        }

        break;
      }

      case 'Giày cầu lông': {
        for (const size of [
          '39',
          '40',
          '41',
          '42',
          '43',
          '44',
          '45',
        ]) {
          if (variant.sku.endsWith(size)) {
            values.push(valueMap[`Size:${size}`]);
          }
        }

        break;
      }

      case 'Áo cầu lông':
      case 'Quần cầu lông': {
        for (const size of [
          'S',
          'M',
          'L',
          'XL',
        ]) {
          if (variant.sku.endsWith(size)) {
            values.push(valueMap[`Size:${size}`]);
          }
        }

        break;
      }

      case 'Balo': {
        values.push(
          valueMap['Loại đóng gói:Tiêu chuẩn']
        );
        break;
      }

      case 'Phụ kiện': {
        values.push(
          valueMap['Loại đóng gói:Tiêu chuẩn']
        );
        break;
      }

      default:
        break;
    }

    for (const attributeValueId of values) {
      if (!attributeValueId) {
        continue;
      }

      await pool.execute(
        `
        INSERT INTO product_variant_values
        (
          variant_id,
          attribute_value_id
        )
        VALUES
        (
          ?,
          ?
        )
        `,
        [
          variant.id,
          attributeValueId,
        ]
      );

      total++;
    }
  }

  console.log(`✔ Seeded ${total} product variant values`);
}