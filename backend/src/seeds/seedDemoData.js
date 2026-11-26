/**
 * Demo data seeder (multi-tenant aware).
 *
 * Adds dummy Customers, Raw-material & Finished-good Products, and Production
 * entries for ONE tenant (organization) so the app has content for a demo.
 *
 * Usage (from backend/):
 *   node src/seeds/seedDemoData.js                 # seeds the first org found
 *   SEED_EMAIL=admin@growinch.com node src/seeds/seedDemoData.js
 *
 * Safe to re-run: it removes its own previous demo rows (SKU prefix GW-DEMO-,
 * customer emails @demo.growinch.com, production batch prefix DEMO-) for that
 * tenant before inserting, so you never get duplicates. It never touches other
 * tenants or non-demo data.
 */
const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Production = require('../models/Production');

const SKU_PREFIX = 'GW-DEMO-';
const CUST_DOMAIN = '@demo.growinch.com';
const BATCH_PREFIX = 'DEMO-';

const addr = (city, state, pincode, street) => ({
  street,
  city,
  state,
  pincode,
  country: 'India',
});

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // --- Pick the tenant to seed ---------------------------------------
    const userQuery = process.env.SEED_EMAIL
      ? { email: process.env.SEED_EMAIL.toLowerCase() }
      : { tenant: { $ne: null } };
    const user = await User.findOne(userQuery).sort({ isOwner: -1 });

    if (!user) {
      console.error('❌ No user found to attach demo data to.');
      console.error('   Register an organization first (the /register page), or');
      console.error('   pass SEED_EMAIL=<an existing user email>.');
      process.exit(1);
    }
    if (!user.tenant) {
      console.error(`❌ User ${user.email} has no tenant. This user was created`);
      console.error('   without an organization. Register via /register (which');
      console.error('   creates a tenant) and seed that user instead.');
      process.exit(1);
    }

    const tenant = user.tenant;
    const createdBy = user._id;
    console.log(`Seeding demo data for tenant ${tenant} (user: ${user.email})`);

    // --- Clean previous demo rows for THIS tenant only -----------------
    await Promise.all([
      Customer.deleteMany({ tenant, email: { $regex: `${CUST_DOMAIN}$`, $options: 'i' } }),
      Production.deleteMany({ tenant, batchNumber: { $regex: `^${BATCH_PREFIX}` } }),
      Product.deleteMany({ tenant, sku: { $regex: `^${SKU_PREFIX}` } }),
    ]);

    // --- Finished goods (used as the Production "Product" dropdown) -----
    const finishedGoods = [
      { sku: 'FG-250', name: '250ml Mineral Water Bottle', category: 'mineral_water_250ml', bottleSize: { size: 250, unit: 'ml' }, unitPrice: 7, costPrice: 4, quantity: 12000, unit: 'PCS' },
      { sku: 'FG-500', name: '500ml Mineral Water Bottle', category: 'mineral_water_500ml', bottleSize: { size: 500, unit: 'ml' }, unitPrice: 10, costPrice: 6, quantity: 9800, unit: 'PCS' },
      { sku: 'FG-1L', name: '1L Mineral Water Bottle', category: 'mineral_water_1l', bottleSize: { size: 1000, unit: 'ml' }, unitPrice: 18, costPrice: 11, quantity: 5600, unit: 'PCS' },
      { sku: 'FG-2L', name: '2L Mineral Water Bottle', category: 'mineral_water_2l', bottleSize: { size: 2000, unit: 'ml' }, unitPrice: 30, costPrice: 19, quantity: 3200, unit: 'PCS' },
      { sku: 'FG-20L', name: '20L Mineral Water Can', category: 'mineral_water_20l', bottleSize: { size: 20000, unit: 'ml' }, unitPrice: 70, costPrice: 45, quantity: 850, unit: 'PCS' },
    ];

    // --- Raw materials (used as the Production "Materials" dropdown) ----
    const rawMaterials = [
      { sku: 'RM-PRE', name: 'PET Preform 24g', category: 'raw_material_bottles', unitPrice: 2.2, costPrice: 2.2, quantity: 60000, unit: 'PCS' },
      { sku: 'RM-CAP', name: 'Bottle Cap (Blue)', category: 'raw_material_caps', unitPrice: 0.4, costPrice: 0.4, quantity: 120000, unit: 'PCS' },
      { sku: 'RM-LBL', name: 'BOPP Label Roll', category: 'raw_material_labels', unitPrice: 0.3, costPrice: 0.3, quantity: 90000, unit: 'ROLL' },
      { sku: 'RM-SHR', name: 'Shrink Wrap Film', category: 'raw_material_packaging', unitPrice: 95, costPrice: 95, quantity: 650, unit: 'KG' },
      { sku: 'RM-CTN', name: 'Carton Box (24 pcs)', category: 'raw_material_packaging', unitPrice: 14, costPrice: 14, quantity: 4200, unit: 'BOX' },
      { sku: 'RM-CHL', name: 'Chlorine Solution', category: 'raw_material_chemicals', unitPrice: 55, costPrice: 55, quantity: 300, unit: 'LTR' },
    ];

    const productDocs = [
      ...finishedGoods.map((p) => ({ ...p, productType: 'finished_good' })),
      ...rawMaterials.map((p) => ({ ...p, productType: 'raw_material' })),
    ].map((p) => ({
      ...p,
      sku: SKU_PREFIX + p.sku,
      tenant,
      createdBy,
      reorderLevel: Math.max(10, Math.round(p.quantity * 0.1)),
      brand: 'GrowInch',
      isActive: true,
    }));

    const createdProducts = await Product.create(productDocs);
    const bySku = (suffix) => createdProducts.find((p) => p.sku === SKU_PREFIX + suffix);
    console.log(`✅ Products: ${createdProducts.length} (finished goods + raw materials)`);

    // --- Customers -----------------------------------------------------
    const customers = [
      { name: 'Fresh Mart Supermarket', customerType: 'retailer', phone: '+91-9811100001', email: `freshmart${CUST_DOMAIN}`, creditLimit: 100000, outstandingBalance: 18500, billingAddress: addr('Pune', 'Maharashtra', '411001', '12, FC Road') },
      { name: 'AquaWorld Distributors', customerType: 'distributor', phone: '+91-9811100002', email: `aquaworld${CUST_DOMAIN}`, creditLimit: 500000, outstandingBalance: 142000, billingAddress: addr('Mumbai', 'Maharashtra', '400001', 'Warehouse 7, Bhiwandi') },
      { name: 'Sunrise Hotels Pvt Ltd', customerType: 'distributor', phone: '+91-9811100003', email: `sunrisehotels${CUST_DOMAIN}`, creditLimit: 300000, outstandingBalance: 0, billingAddress: addr('Nashik', 'Maharashtra', '422001', 'Gangapur Road') },
      { name: 'Green Valley Catering', customerType: 'individual', phone: '+91-9811100004', email: `greenvalley${CUST_DOMAIN}`, creditLimit: 50000, outstandingBalance: 7500, billingAddress: addr('Thane', 'Maharashtra', '400601', 'Ghodbunder Road') },
      { name: 'City General Stores', customerType: 'retailer', phone: '+91-9811100005', email: `citystores${CUST_DOMAIN}`, creditLimit: 75000, outstandingBalance: 22000, billingAddress: addr('Nagpur', 'Maharashtra', '440001', 'Sitabuldi Main Road') },
    ].map((c) => ({
      ...c,
      tenant,
      createdBy,
      shippingAddress: c.billingAddress,
      isActive: true,
    }));

    const createdCustomers = await Customer.create(customers);
    console.log(`✅ Customers: ${createdCustomers.length}`);

    // --- Production entries --------------------------------------------
    // Created sequentially so the model's auto productionNumber increments cleanly.
    const day = (d) => {
      const dt = new Date();
      dt.setDate(dt.getDate() - d);
      return dt;
    };
    const productionPlan = [
      { fg: '500', shift: 'morning', date: day(0), planned: 10000, produced: 9850, rejected: 150, status: 'completed', mats: [['RM-PRE', 10000], ['RM-CAP', 10000], ['RM-LBL', 10000]] },
      { fg: '1L', shift: 'night', date: day(0), planned: 6000, produced: 5820, rejected: 95, status: 'completed', mats: [['RM-PRE', 6000], ['RM-CAP', 6000], ['RM-LBL', 6000]] },
      { fg: '250', shift: 'morning', date: day(1), planned: 15000, produced: 14600, rejected: 320, status: 'completed', mats: [['RM-PRE', 15000], ['RM-CAP', 15000]] },
      { fg: '20L', shift: 'afternoon', date: day(1), planned: 1200, produced: 780, rejected: 12, status: 'in_progress', mats: [['RM-CHL', 8]] },
      { fg: '2L', shift: 'morning', date: day(2), planned: 4000, produced: 3960, rejected: 40, status: 'completed', mats: [['RM-PRE', 4000], ['RM-CAP', 4000], ['RM-CTN', 170]] },
      { fg: '500', shift: 'night', date: day(2), planned: 10000, produced: 0, rejected: 0, status: 'cancelled', mats: [] },
    ];

    let count = 0;
    for (const p of productionPlan) {
      const product = bySku(p.fg);
      await Production.create({
        tenant,
        createdBy,
        productionDate: p.date,
        shift: p.shift,
        product: product._id,
        batchNumber: `${BATCH_PREFIX}${String(++count).padStart(3, '0')}`,
        plannedQuantity: p.planned,
        producedQuantity: p.produced,
        rejectedQuantity: p.rejected,
        status: p.status,
        materialsConsumed: p.mats.map(([sku, qty]) => {
          const m = bySku(sku);
          return { material: m._id, quantityUsed: qty, unit: m.unit, cost: qty * m.costPrice };
        }),
      });
    }
    console.log(`✅ Production entries: ${count}`);

    console.log('\n========================================');
    console.log('Demo data seeded successfully!');
    console.log(`Tenant: ${tenant}`);
    console.log(`Products: ${createdProducts.length}  Customers: ${createdCustomers.length}  Production: ${count}`);
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo data:', error);
    process.exit(1);
  }
};

seed();
