import { faker } from '@faker-js/faker';

export default async function seedCustomerProfiles(pool) {
  const [users] = await pool.query(`
    SELECT id, role
    FROM users
    WHERE role = 'customer'
  `);

  const membershipLevels = [
    'normal',
    'silver',
    'gold',
    'platinum',
  ];

  for (const user of users) {
    await pool.execute(
      `
      INSERT INTO customer_profiles
      (
        user_id,
        total_spent,
        reward_points,
        membership_level,
        birthday
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

        faker.number.float({
          min: 0,
          max: 50000000,
          fractionDigits: 2,
        }),

        faker.number.int({
          min: 0,
          max: 5000,
        }),

        faker.helpers.arrayElement(membershipLevels),

        faker.date.birthdate({
          min: 18,
          max: 50,
          mode: 'age',
        }),
      ]
    );
  }

  console.log(`✔ Seeded ${users.length} customer profiles`);
}