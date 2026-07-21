import { faker } from '@faker-js/faker';

faker.locale = 'vi';

export default async function seedUserAddresses(pool) {
  const [users] = await pool.query(`
    SELECT id
    FROM users
    WHERE role = 'customer'
  `);

  const cities = [
    'Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Bình Dương',
    'Đồng Nai',
    'Hải Phòng',
    'Huế',
    'Nha Trang',
    'Vũng Tàu',
  ];

  for (const user of users) {
    const totalAddress = faker.number.int({
      min: 1,
      max: 3,
    });

    for (let i = 1; i <= totalAddress; i++) {
      await pool.execute(
        `
        INSERT INTO user_addresses
        (
          user_id,
          receiver_name,
          receiver_phone,
          address,
          is_default
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

          faker.person.fullName(),

          `09${faker.string.numeric(8)}`,

          `${faker.location.streetAddress()}, ${faker.helpers.arrayElement(cities)}`,

          i === 1,
        ]
      );
    }
  }

  console.log('✔ Seeded user addresses');
}