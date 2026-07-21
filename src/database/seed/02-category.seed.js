import slugify from 'slugify';

export default async function seedCategories(pool) {
  const categories = [
    {
      name: 'Vợt cầu lông',
      description: 'Các dòng vợt cầu lông chính hãng dành cho người mới chơi đến vận động viên chuyên nghiệp.',
    },
    {
      name: 'Giày cầu lông',
      description: 'Giày cầu lông chống trơn trượt, hỗ trợ di chuyển và bảo vệ cổ chân.',
    },
    {
      name: 'Áo cầu lông',
      description: 'Áo thi đấu và tập luyện chất liệu thoáng khí, thấm hút mồ hôi.',
    },
    {
      name: 'Quần cầu lông',
      description: 'Quần thi đấu co giãn, thoải mái khi vận động.',
    },
    {
      name: 'Balo',
      description: 'Balo và túi đựng vợt cầu lông nhiều ngăn, chống thấm nước.',
    },
    {
      name: 'Phụ kiện',
      description: 'Cước, quấn cán, tất, băng cổ tay, bình nước và các phụ kiện cầu lông khác.',
    },
  ];

  for (const category of categories) {
    const slug = slugify(category.name, {
      lower: true,
      strict: true,
    });

    await pool.execute(
      `
      INSERT INTO categories
      (
        name,
        slug,
        description
      )
      VALUES
      (
        ?,
        ?,
        ?
      )
      `,
      [
        category.name,
        slug,
        category.description,
      ]
    );
  }

  console.log(`✔ Seeded ${categories.length} categories`);
}