import pool from '../config/database.js';

import seedBrands from './seed/01-brand.seed.js';
import seedCategories from './seed/02-category.seed.js';
import seedUsers from './seed/03-user.seed.js';
import seedCustomerProfiles from './seed/04-customer-profile.seed.js';
import seedUserAddresses from './seed/05-user-address.seed.js';
import seedProducts from './seed/06-product.seed.js';
import seedVariantAttributes from './seed/07-variant-attribute.seed.js';
import seedVariantAttributeValues from './seed/08-variant-attribute-value.seed.js';
import seedProductVariants from './seed/09-product-variant.seed.js';
import seedProductVariantValues from './seed/10-product-variant-value.seed.js';
import seedProductImages from './seed/11-product-image.seed.js';
import seedInventories from './seed/12-inventory.seed.js';
import seedProductReviews from './seed/13-product-review.seed.js';

async function runSeeder() {
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE product_reviews');
    await pool.query('TRUNCATE TABLE inventories');
    await pool.query('TRUNCATE TABLE product_images');
    await pool.query('TRUNCATE TABLE product_variant_values');
    await pool.query('TRUNCATE TABLE product_variants');
    await pool.query('TRUNCATE TABLE variant_attribute_values');
    await pool.query('TRUNCATE TABLE variant_attributes');
    await pool.query('TRUNCATE TABLE products');
    await pool.query('TRUNCATE TABLE user_addresses');
    await pool.query('TRUNCATE TABLE customer_profiles');
    await pool.query('TRUNCATE TABLE users');
    await pool.query('TRUNCATE TABLE categories');
    await pool.query('TRUNCATE TABLE brands');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('=================================');
    console.log('START SEED DATABASE');
    console.log('=================================');

    await seedBrands(pool);
    console.log('---------------------------------');

    await seedCategories(pool);
    console.log('---------------------------------');

    await seedUsers(pool);
    console.log('---------------------------------');

    await seedCustomerProfiles(pool);
    console.log('---------------------------------');

    await seedUserAddresses(pool);
    console.log('---------------------------------');

    await seedProducts(pool);
    console.log('---------------------------------');

    await seedVariantAttributes(pool);
    console.log('---------------------------------');

    await seedVariantAttributeValues(pool);
    console.log('---------------------------------');

    await seedProductVariants(pool);
    console.log('---------------------------------');

    await seedProductVariantValues(pool);
    console.log('---------------------------------');

    await seedProductImages(pool);
    console.log('---------------------------------');

    await seedInventories(pool);
    console.log('---------------------------------');

    await seedProductReviews(pool);
    console.log('---------------------------------');

    console.log('=================================');
    console.log('DATABASE SEEDED SUCCESSFULLY');
    console.log('=================================');

    await pool.end();

    process.exit(0);
  } catch (error) {
    console.error('Seed failed!');
    console.error(error);

    await pool.end();

    process.exit(1);
  }
}

runSeeder();