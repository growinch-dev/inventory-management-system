const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Category = require('../models/Category');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const defaultCategories = [
  // Finished Goods - Mineral Water
  {
    name: 'Mineral Water - 250ml',
    value: 'mineral_water_250ml',
    type: 'finished_good',
    description: '250ml bottled mineral water',
    isDefault: true,
  },
  {
    name: 'Mineral Water - 500ml',
    value: 'mineral_water_500ml',
    type: 'finished_good',
    description: '500ml bottled mineral water',
    isDefault: true,
  },
  {
    name: 'Mineral Water - 1 Liter',
    value: 'mineral_water_1l',
    type: 'finished_good',
    description: '1 liter bottled mineral water',
    isDefault: true,
  },
  {
    name: 'Mineral Water - 2 Liter',
    value: 'mineral_water_2l',
    type: 'finished_good',
    description: '2 liter bottled mineral water',
    isDefault: true,
  },
  {
    name: 'Mineral Water - 20 Liter Jar',
    value: 'mineral_water_20l',
    type: 'finished_good',
    description: '20 liter water jar for dispenser',
    isDefault: true,
  },
  // Raw Materials
  {
    name: 'Raw Material - Bottles',
    value: 'raw_material_bottles',
    type: 'raw_material',
    description: 'Empty bottles for water packaging',
    isDefault: true,
  },
  {
    name: 'Raw Material - Caps & Closures',
    value: 'raw_material_caps',
    type: 'raw_material',
    description: 'Bottle caps and closures',
    isDefault: true,
  },
  {
    name: 'Raw Material - Labels',
    value: 'raw_material_labels',
    type: 'raw_material',
    description: 'Product labels and stickers',
    isDefault: true,
  },
  {
    name: 'Raw Material - Packaging',
    value: 'raw_material_packaging',
    type: 'raw_material',
    description: 'Cartons, crates, and packaging materials',
    isDefault: true,
  },
  {
    name: 'Raw Material - Chemicals',
    value: 'raw_material_chemicals',
    type: 'raw_material',
    description: 'Water treatment chemicals',
    isDefault: true,
  },
  {
    name: 'Raw Material - Filters',
    value: 'raw_material_filters',
    type: 'raw_material',
    description: 'Water filtration filters',
    isDefault: true,
  },
  {
    name: 'Other',
    value: 'other',
    type: 'other',
    description: 'Miscellaneous items',
    isDefault: true,
  },
];

const seedCategories = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find or create tenant
    let tenant = await Tenant.findOne();

    if (!tenant) {
      console.log('Creating default tenant...');
      tenant = await Tenant.create({
        name: 'GrowInch',
        email: 'admin@growinch.com',
        slug: 'growinch',
        subscriptionStatus: 'active',
      });
      console.log(`✅ Tenant created: ${tenant._id}`);
    }

    // Find the admin user to get tenant
    const adminUser = await User.findOne({ email: 'admin@growinch.com' });

    if (!adminUser) {
      console.log('❌ Admin user not found. Please run seed:admin first.');
      process.exit(1);
    }

    // Update admin user with tenant if not set
    if (!adminUser.tenant) {
      await User.updateOne(
        { _id: adminUser._id },
        { $set: { tenant: tenant._id, isOwner: true } }
      );
      adminUser.tenant = tenant._id;
      console.log(`✅ Updated admin user with tenant`);
    }

    const tenantId = adminUser.tenant || tenant._id;
    console.log(`Using tenant: ${tenantId}`);

    // Check if categories already exist for this tenant
    const existingCategories = await Category.countDocuments({ tenant: tenantId });

    if (existingCategories > 0) {
      console.log(`⚠️  Categories already exist for this tenant (${existingCategories} found)`);
      console.log('Skipping seed...');
      process.exit(0);
    }

    // Create categories with tenant
    const categoriesToCreate = defaultCategories.map(cat => ({
      ...cat,
      tenant: tenantId,
    }));

    const createdCategories = await Category.insertMany(categoriesToCreate);

    console.log('✅ Default categories seeded successfully!');
    console.log('-----------------------------------');
    console.log(`Total categories created: ${createdCategories.length}`);
    console.log('-----------------------------------');
    console.log('Categories:');
    createdCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.value})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error.message);
    process.exit(1);
  }
};

seedCategories();
