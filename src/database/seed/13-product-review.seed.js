import { faker } from '@faker-js/faker';

faker.locale = 'vi';

export default async function seedProductReviews(pool) {
  const [users] = await pool.query(`
    SELECT id
    FROM users
    WHERE role = 'customer'
  `);

  const [products] = await pool.query(`
    SELECT id
    FROM products
  `);

  const comments = [
    'Sản phẩm rất tốt, đúng mô tả.',
    'Đóng gói cẩn thận, giao hàng nhanh.',
    'Đánh rất đầm tay, rất đáng tiền.',
    'Chất lượng vượt mong đợi.',
    'Màu sắc đẹp, hoàn thiện tốt.',
    'Shop tư vấn rất nhiệt tình.',
    'Sẽ tiếp tục ủng hộ shop.',
    'Giá hợp lý, hàng chính hãng.',
    'Rất hài lòng với sản phẩm.',
    'Đáng mua trong tầm giá.',
    'Giày đi rất êm và bám sân.',
    'Vợt trợ lực tốt, dễ điều cầu.',
    'Đúng hàng chính hãng.',
    'Giao đúng mẫu đã đặt.',
    'Đóng gói đẹp, không bị móp.',
  ];

  const totalReviews = 500;

  for (let i = 0; i < totalReviews; i++) {
    const user = faker.helpers.arrayElement(users);
    const product = faker.helpers.arrayElement(products);

    const rating = faker.helpers.weightedArrayElement([
      { weight: 60, value: 5 },
      { weight: 25, value: 4 },
      { weight: 10, value: 3 },
      { weight: 3, value: 2 },
      { weight: 2, value: 1 },
    ]);

    await pool.execute(
      `
      INSERT INTO product_reviews
      (
        user_id,
        product_id,
        rating,
        comment,
        created_at
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
        user.id,
        product.id,
        rating,
        faker.helpers.arrayElement(comments),
        faker.date.recent({
          days: 365,
        }),
      ]
    );
  }

  console.log(`✔ Seeded ${totalReviews} product reviews`);
}