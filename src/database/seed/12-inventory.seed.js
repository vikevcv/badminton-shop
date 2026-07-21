import { faker } from '@faker-js/faker';

export default async function seedInventories(pool) {
  const [variants] = await pool.query(`
    SELECT
      id
    FROM product_variants
    ORDER BY id
  `);

  let total = 0;

  for (const variant of variants) {
    const quantity = faker.number.int({
      min: 0,
      max: 120,
    });

    const reservedQuantity = faker.number.int({
      min: 0,
      max: Math.min(quantity, 10),
    });

    await pool.execute(
      `
      INSERT INTO inventories
      (
        variant_id,
        quantity,
        reserved_quantity
      )
      VALUES
      (
        ?,
        ?,
        ?
      )
      `,
      [
        variant.id,
        quantity,
        reservedQuantity,
      ]
    );

    total++;
  }

  console.log(`✔ Seeded ${total} inventories`);
}