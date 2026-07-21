import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

faker.locale = 'vi';

export default async function seedUsers(pool) {
  const password = await bcrypt.hash('123456', 10);

  const users = [
    {
      fullName: 'Administrator',
      email: 'admin@badmintonshop.com',
      phone: '0900000001',
      role: 'admin',
    },
    {
      fullName: 'Staff',
      email: 'staff@badmintonshop.com',
      phone: '0900000002',
      role: 'staff',
    },
  ];

  // 98 customers
  for (let i = 1; i <= 98; i++) {
    users.push({
      fullName: faker.person.fullName(),
      email: `customer${i}@gmail.com`,
      phone: `09${String(10000000 + i).padStart(8, '0')}`,
      role: 'customer',
    });
  }

  for (const user of users) {
    await pool.execute(
      `
      INSERT INTO users
      (
        full_name,
        email,
        phone,
        password,
        role,
        status,
        email_verified_at
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        NOW()
      )
      `,
      [
        user.fullName,
        user.email,
        user.phone,
        password,
        user.role,
        'active',
      ]
    );
  }

  console.log(`✔ Seeded ${users.length} users`);
}