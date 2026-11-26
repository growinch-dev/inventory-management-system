/**
 * Demo data for a packaged drinking water manufacturer in Kovilpatti, Tamil Nadu.
 *
 * Fills every module (warehouses, categories, products, raw materials, suppliers,
 * customers/vendors, purchase orders, production, batches, invoices, payments,
 * delivery challans, demo issues, tenders, transfers, stock movements,
 * investments, salaries, notifications, QR scans) for ONE organization.
 *
 * Usage (from backend/):
 *   node src/seeds/seedSbrDemo.js                       # organization named "SBR"
 *   SEED_TENANT_NAME="My Co" node src/seeds/seedSbrDemo.js
 *
 * Safe to re-run: everything it creates is tagged (SKU prefix SBR-, emails
 * @sbr-demo.example, notes containing DEMO_TAG, warehouse codes below) and is
 * removed before re-inserting. Data you entered yourself is never touched.
 */
const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const PurchaseOrder = require('../models/PurchaseOrder');
const Production = require('../models/Production');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const DeliveryChallan = require('../models/DeliveryChallan');
const DemoIssue = require('../models/DemoIssue');
const Tender = require('../models/Tender');
const Transfer = require('../models/Transfer');
const StockMovement = require('../models/StockMovement');
const Investment = require('../models/Investment');
const SalaryPayment = require('../models/SalaryPayment');
const Notification = require('../models/Notification');
const QRScan = require('../models/QRScan');
const numberToWords = require('../utils/numberToWords');

const TENANT_NAME = process.env.SEED_TENANT_NAME || 'SBR';
const DEMO_TAG = '[SBR demo seed]';
const SKU = 'SBR-';
const MAIL = '@sbr-demo.example';
const WH_CODES = ['KVP', 'TUT', 'TVL', 'SVK'];

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d, hour = 10) => {
  const dt = new Date(Date.now() - d * DAY);
  dt.setHours(hour, 0, 0, 0);
  return dt;
};
const daysAhead = (d) => new Date(Date.now() + d * DAY);
const round2 = (n) => Math.round(n * 100) / 100;
const addr = (street, city, pincode, state = 'Tamil Nadu') => ({ street, city, state, pincode, country: 'India' });
const tagRegex = { $regex: DEMO_TAG.replace(/[[\]]/g, '\\$&') };

// Mongoose leaves stray single-field unique indexes in place after the schema
// drops them. These two block a second organization from reusing category
// values / production numbers, so remove them if they still exist.
async function dropStrayGlobalIndexes() {
  for (const [model, name] of [[Category, 'value_1'], [Production, 'productionNumber_1']]) {
    const idx = await model.collection.indexes().catch(() => []);
    if (idx.some((i) => i.name === name)) {
      await model.collection.dropIndex(name);
      console.log(`🧹 Dropped stray global unique index ${model.collection.name}.${name}`);
    }
  }
}

async function cleanPrevious(tenant) {
  const productIds = (await Product.find({ tenant, sku: { $regex: `^${SKU}` } }, '_id')).map((p) => p._id);
  await Promise.all([
    Invoice.deleteMany({ tenant, notes: tagRegex }),
    Payment.deleteMany({ tenant, internalNotes: tagRegex }),
    PurchaseOrder.deleteMany({ tenant, internalNotes: tagRegex }),
    DeliveryChallan.deleteMany({ tenant, internalNotes: tagRegex }),
    DemoIssue.deleteMany({ tenant, internalNotes: tagRegex }),
    Tender.deleteMany({ tenant, notes: tagRegex }),
    Transfer.deleteMany({ tenant, notes: tagRegex }),
    Production.deleteMany({ tenant, notes: tagRegex }),
    Batch.deleteMany({ tenant, product: { $in: productIds } }),
    StockMovement.deleteMany({ tenant, product: { $in: productIds } }),
    QRScan.deleteMany({ tenant, product: { $in: productIds } }),
    Investment.deleteMany({ tenant, notes: tagRegex }),
    SalaryPayment.deleteMany({ tenant, notes: tagRegex }),
    Notification.deleteMany({ tenant, 'metadata.demoSeed': true }),
    Customer.deleteMany({ tenant, email: { $regex: `${MAIL}$` } }),
    Supplier.deleteMany({ tenant, email: { $regex: `${MAIL}$` } }),
  ]);
  await Product.deleteMany({ tenant, sku: { $regex: `^${SKU}` } });
  await Warehouse.deleteMany({ tenant, code: { $in: WH_CODES } });
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const tenantDoc = await Tenant.findOne({ name: TENANT_NAME });
  if (!tenantDoc) throw new Error(`Organization "${TENANT_NAME}" not found`);
  const tenant = tenantDoc._id;
  const owner = (tenantDoc.owner && (await User.findById(tenantDoc.owner))) || (await User.findOne({ tenant }).sort({ isOwner: -1 }));
  if (!owner) throw new Error(`No user found for organization "${TENANT_NAME}"`);
  const by = owner._id;
  console.log(`Seeding "${tenantDoc.name}" (${tenant}) as ${owner.email}`);

  await dropStrayGlobalIndexes();
  await cleanPrevious(tenant);

  // Fill in the company address only if it was never set.
  if (!tenantDoc.address?.city) {
    await Tenant.updateOne({ _id: tenant }, {
      $set: { address: addr('Plot 14, SIDCO Industrial Estate, Ettayapuram Road', 'Kovilpatti', '628502') },
    });
  }

  // ---------------------------------------------------------------- Warehouses
  const warehouses = await Warehouse.create([
    { code: 'KVP', name: 'Kovilpatti Main Plant', type: 'main', isDefault: true,
      address: addr('Plot 14, SIDCO Industrial Estate, Ettayapuram Road', 'Kovilpatti', '628502'),
      contactPerson: { name: 'Karthik R', phone: '9840011201' },
      capacity: { maxItems: 60000 },
      zones: [
        { code: 'RM', name: 'Raw Material Store', type: 'storage' },
        { code: 'FG', name: 'Finished Goods Bay', type: 'storage' },
        { code: 'DSP', name: 'Dispatch Dock', type: 'shipping' },
        { code: 'QC', name: 'QC Hold', type: 'quarantine' },
      ],
      operatingHours: { weekdays: { open: '06:00', close: '22:00' }, weekends: { open: '07:00', close: '14:00' } } },
    { code: 'TUT', name: 'Thoothukudi Distribution Depot', type: 'distribution',
      address: addr('22, Palayamkottai Road', 'Thoothukudi', '628003'),
      contactPerson: { name: 'Muthu Kumar P', phone: '9840011202' }, capacity: { maxItems: 15000 },
      zones: [{ code: 'FG', name: 'Finished Goods', type: 'storage' }] },
    { code: 'TVL', name: 'Tirunelveli Depot', type: 'distribution',
      address: addr('5/112, Madurai Road, Pettai', 'Tirunelveli', '627004'),
      contactPerson: { name: 'Pandi T', phone: '9840011203' }, capacity: { maxItems: 12000 },
      zones: [{ code: 'FG', name: 'Finished Goods', type: 'storage' }] },
    { code: 'SVK', name: 'Sivakasi Regional Store', type: 'regional',
      address: addr('Sattur Main Road', 'Sivakasi', '626123'),
      contactPerson: { name: 'Ramesh V', phone: '9840011204' }, capacity: { maxItems: 8000 },
      zones: [{ code: 'FG', name: 'Finished Goods', type: 'storage' }] },
  ].map((w) => ({ ...w, tenant, createdBy: by, notes: DEMO_TAG })));
  const [whMain, whTut, whTvl, whSvk] = warehouses;
  console.log(`✅ Warehouses: ${warehouses.length}`);

  // ---------------------------------------------------------------- Categories
  const categoryDefs = [
    ['Packaged Water 300ml', 'packaged_water_300ml', 'finished_good'],
    ['Packaged Water 500ml', 'packaged_water_500ml', 'finished_good'],
    ['Packaged Water 1 Litre', 'packaged_water_1l', 'finished_good'],
    ['Packaged Water 2 Litre', 'packaged_water_2l', 'finished_good'],
    ['Packaged Water 5 Litre', 'packaged_water_5l', 'finished_good'],
    ['Water Can 20 Litre', 'watercan', 'finished_good'],
    ['PET Preforms', 'raw_material_preforms', 'raw_material'],
    ['Caps & Closures', 'raw_material_caps', 'raw_material'],
    ['Labels', 'raw_material_labels', 'raw_material'],
    ['Packaging', 'raw_material_packaging', 'raw_material'],
    ['Jars & Cans', 'raw_material_jars', 'raw_material'],
    ['Water Treatment Chemicals', 'raw_material_chemicals', 'raw_material'],
    ['Filters & Spares', 'raw_material_filters', 'raw_material'],
  ];
  for (const [name, value, type] of categoryDefs) {
    await Category.updateOne(
      { tenant, value },
      { $setOnInsert: { tenant, value, name, type, isActive: true } },
      { upsert: true }
    );
  }
  console.log(`✅ Categories: ${categoryDefs.length} ensured`);

  // ---------------------------------------------------------------- Products
  // Finished goods are sold per case (CARTON) except jars/cans (PCS).
  // `stock` is the closing stock today; the opening balance is back-calculated
  // from the movements below so the stock ledger adds up.
  const fgDefs = [
    { sku: 'FG-300', name: 'SBR Packaged Drinking Water 300ml (Case of 24)', category: 'packaged_water_300ml', size: 300, unit: 'CARTON', unitPrice: 110, costPrice: 72, stock: 820, reorderLevel: 150, perCase: 24 },
    { sku: 'FG-500', name: 'SBR Packaged Drinking Water 500ml (Case of 24)', category: 'packaged_water_500ml', size: 500, unit: 'CARTON', unitPrice: 140, costPrice: 95, stock: 1150, reorderLevel: 200, perCase: 24 },
    { sku: 'FG-1L', name: 'SBR Packaged Drinking Water 1 Litre (Case of 12)', category: 'packaged_water_1l', size: 1000, unit: 'CARTON', unitPrice: 115, costPrice: 78, stock: 960, reorderLevel: 200, perCase: 12 },
    { sku: 'FG-2L', name: 'SBR Packaged Drinking Water 2 Litre (Case of 9)', category: 'packaged_water_2l', size: 2000, unit: 'CARTON', unitPrice: 125, costPrice: 86, stock: 140, reorderLevel: 150, perCase: 9 },
    { sku: 'FG-5L', name: 'SBR Packaged Drinking Water 5 Litre Jar', category: 'packaged_water_5l', size: 5000, unit: 'PCS', unitPrice: 45, costPrice: 30, stock: 380, reorderLevel: 100 },
    { sku: 'FG-20L', name: 'SBR 20 Litre Water Can (Refill)', category: 'watercan', size: 20000, unit: 'PCS', unitPrice: 35, costPrice: 18, stock: 610, reorderLevel: 150 },
  ];
  const rmDefs = [
    { sku: 'RM-PF13', name: 'PET Preform 13g (300ml)', category: 'raw_material_preforms', unit: 'PCS', cost: 1.35, stock: 42000, reorderLevel: 20000 },
    { sku: 'RM-PF18', name: 'PET Preform 18g (500ml)', category: 'raw_material_preforms', unit: 'PCS', cost: 1.75, stock: 58000, reorderLevel: 25000 },
    { sku: 'RM-PF28', name: 'PET Preform 28g (1 Litre)', category: 'raw_material_preforms', unit: 'PCS', cost: 2.6, stock: 15000, reorderLevel: 20000 },
    { sku: 'RM-PF42', name: 'PET Preform 42g (2 Litre)', category: 'raw_material_preforms', unit: 'PCS', cost: 3.9, stock: 9000, reorderLevel: 6000 },
    { sku: 'RM-PF90', name: 'PET Preform 90g (5 Litre)', category: 'raw_material_preforms', unit: 'PCS', cost: 8.5, stock: 2600, reorderLevel: 1000 },
    { sku: 'RM-CAP28', name: 'Bottle Cap 28mm PCO (Blue)', category: 'raw_material_caps', unit: 'PCS', cost: 0.32, stock: 160000, reorderLevel: 50000 },
    { sku: 'RM-CAP20L', name: '20L Can Cap with Seal', category: 'raw_material_caps', unit: 'PCS', cost: 2.2, stock: 4200, reorderLevel: 2000 },
    { sku: 'RM-LBL', name: 'BOPP Label Roll (approx. 5,000 labels)', category: 'raw_material_labels', unit: 'ROLL', cost: 850, stock: 64, reorderLevel: 20 },
    { sku: 'RM-SHR', name: 'Shrink Wrap Film', category: 'raw_material_packaging', unit: 'KG', cost: 155, stock: 420, reorderLevel: 150 },
    { sku: 'RM-CTN', name: 'Corrugated Carton / Tray', category: 'raw_material_packaging', unit: 'BOX', cost: 9, stock: 5200, reorderLevel: 1500 },
    { sku: 'RM-JAR20', name: '20L PC Jar (Empty)', category: 'raw_material_jars', unit: 'PCS', cost: 165, stock: 900, reorderLevel: 300 },
    { sku: 'RM-ANT', name: 'Antiscalant Chemical', category: 'raw_material_chemicals', unit: 'LTR', cost: 210, stock: 85, reorderLevel: 40 },
    { sku: 'RM-CRT', name: 'Cartridge Filter 5 Micron', category: 'raw_material_filters', unit: 'PCS', cost: 120, stock: 36, reorderLevel: 24 },
  ];

  const products = await Product.create([
    ...fgDefs.map((p) => ({
      sku: SKU + p.sku, name: p.name, category: p.category, productType: 'finished_good',
      description: p.perCase ? `${p.perCase} bottles x ${p.size}ml per case. BIS certified packaged drinking water.` : 'BIS certified packaged drinking water.',
      bottleSize: { size: p.size, unit: 'ml' }, brand: 'SBR', hsnCode: '22011010', taxRate: 18,
      unitPrice: p.unitPrice, costPrice: p.costPrice, quantity: p.stock, reorderLevel: p.reorderLevel, unit: p.unit,
      manufacturer: { name: tenantDoc.name, address: 'SIDCO Industrial Estate, Kovilpatti, Tamil Nadu', country: 'India' },
      location: { warehouse: whMain.name, zone: 'FG' }, warehouseRef: whMain._id,
    })),
    ...rmDefs.map((p) => ({
      sku: SKU + p.sku, name: p.name, category: p.category, productType: 'raw_material',
      unitPrice: p.cost, costPrice: p.cost, quantity: p.stock, reorderLevel: p.reorderLevel, unit: p.unit, taxRate: 18,
      location: { warehouse: whMain.name, zone: 'RM' }, warehouseRef: whMain._id,
    })),
  ].map((p) => ({ ...p, tenant, createdBy: by, isActive: true })));
  const P = Object.fromEntries(products.map((p) => [p.sku.replace(SKU, ''), p]));
  console.log(`✅ Products: ${fgDefs.length} finished goods + ${rmDefs.length} raw materials`);

  // Stock ledger: every movement is recorded here, then written out at the end.
  const ledger = []; // { sku, date, type, delta, qty, reason, ...refs }
  const move = (sku, date, delta, extra) => ledger.push({ sku, date, delta, ...extra });

  // ---------------------------------------------------------------- Suppliers
  const supplierDefs = [
    { name: 'Sri Murugan Preforms', contactPerson: 'Senthil Kumar', city: 'Coimbatore', pincode: '641021', street: 'Kurichi Industrial Estate', terms: 'Net 30', rating: 5 },
    { name: 'Chennai Caps & Closures', contactPerson: 'Rajesh N', city: 'Chennai', pincode: '600058', street: 'Ambattur Industrial Estate', terms: 'Net 30', rating: 4 },
    { name: 'Sivakasi Label Printers', contactPerson: 'Ganesan M', city: 'Sivakasi', pincode: '626123', street: 'Thiruthangal Road', terms: 'Net 15', rating: 5 },
    { name: 'Madurai Packaging Industries', contactPerson: 'Bala Subramanian', city: 'Madurai', pincode: '625020', street: 'K. Pudur Industrial Estate', terms: 'Net 30', rating: 4 },
    { name: 'Tuticorin Chemicals & Agencies', contactPerson: 'Joseph A', city: 'Thoothukudi', pincode: '628002', street: 'Beach Road', terms: 'Advance', rating: 3 },
    { name: 'Aqua RO Systems', contactPerson: 'Vignesh S', city: 'Madurai', pincode: '625016', street: 'Bypass Road', terms: 'Net 15', rating: 4 },
  ];
  const suppliers = await Supplier.create(supplierDefs.map((s, i) => ({
    tenant, createdBy: by, name: s.name, contactPerson: s.contactPerson,
    email: `${s.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}${MAIL}`,
    phone: `98430${String(21000 + i * 111).padStart(5, '0')}`,
    address: addr(s.street, s.city, s.pincode), paymentTerms: s.terms, rating: s.rating,
    notes: `Raw material supplier. ${DEMO_TAG}`,
  })));
  console.log(`✅ Suppliers: ${suppliers.length}`);

  // ---------------------------------------------------------------- Customers
  const customerDefs = [
    { name: 'Sri Vinayaga Agencies', type: 'distributor', city: 'Kovilpatti', pincode: '628501', street: 'Main Bazaar', credit: 300000 },
    { name: 'Thoothukudi Aqua Distributors', type: 'distributor', city: 'Thoothukudi', pincode: '628001', street: 'VOC Road', credit: 500000 },
    { name: 'Nellai Water Suppliers', type: 'distributor', city: 'Tirunelveli', pincode: '627006', street: 'Palayamkottai High Ground Road', credit: 400000 },
    { name: 'Sivakasi Super Market', type: 'retailer', city: 'Sivakasi', pincode: '626123', street: 'Velayuthan Road', credit: 100000 },
    { name: 'Sattur Murugan Stores', type: 'retailer', city: 'Sattur', pincode: '626203', street: 'Main Road', credit: 50000 },
    { name: 'Hotel Annapoorna Residency', type: 'hotel_restaurant', city: 'Kovilpatti', pincode: '628501', street: 'Ettayapuram Road', credit: 75000 },
    { name: 'Hotel Saravana Bhavan Mess', type: 'hotel_restaurant', city: 'Thoothukudi', pincode: '628002', street: 'Palace Road', credit: 50000 },
    { name: 'Kovilpatti Match Works', type: 'corporate', city: 'Kovilpatti', pincode: '628502', street: 'Industrial Estate', credit: 150000 },
    { name: 'Government Hospital, Kovilpatti', type: 'government', city: 'Kovilpatti', pincode: '628501', street: 'Hospital Road', credit: 200000 },
    { name: 'Sri Lakshmi Mahal (Marriage Hall)', type: 'event', city: 'Kovilpatti', pincode: '628501', street: 'Pasuvanthanai Road', credit: 60000 },
    { name: 'Virudhunagar Fresh Mart', type: 'retailer', city: 'Virudhunagar', pincode: '626001', street: 'Aruppukottai Road', credit: 80000 },
    { name: 'Rajapalayam Water Point', type: 'retailer', city: 'Rajapalayam', pincode: '626117', street: 'Tenkasi Road', credit: 50000 },
  ];
  // Vendors page and Purchase Orders in this app pick from the customer list.
  const vendorDefs = [
    { name: 'Sri Murugan Preforms (Vendor)', city: 'Coimbatore', pincode: '641021', street: 'Kurichi Industrial Estate' },
    { name: 'Chennai Caps & Closures (Vendor)', city: 'Chennai', pincode: '600058', street: 'Ambattur Industrial Estate' },
    { name: 'Madurai Packaging Industries (Vendor)', city: 'Madurai', pincode: '625020', street: 'K. Pudur Industrial Estate' },
  ];
  const customers = await Customer.create([
    ...customerDefs.map((c, i) => ({
      name: c.name, customerType: c.type, creditLimit: c.credit, phone: `94430${String(31000 + i * 137).padStart(5, '0')}`,
      billingAddress: addr(c.street, c.city, c.pincode), shippingAddress: addr(c.street, c.city, c.pincode),
      referral: i % 4 === 0 ? { name: 'Karthik R', type: 'employee' } : undefined,
    })),
    ...vendorDefs.map((v, i) => ({
      name: v.name, customerType: 'corporate', creditLimit: 0, phone: `98430${String(41000 + i * 97).padStart(5, '0')}`,
      billingAddress: addr(v.street, v.city, v.pincode), shippingAddress: addr(v.street, v.city, v.pincode),
      notes: `Vendor (raw material supplier). ${DEMO_TAG}`,
    })),
  ].map((c) => ({
    ...c, tenant, createdBy: by, isActive: true,
    email: `${c.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}${MAIL}`,
    notes: c.notes || DEMO_TAG,
  })));
  const C = Object.fromEntries(customers.map((c) => [c.name, c]));
  console.log(`✅ Customers: ${customerDefs.length} customers + ${vendorDefs.length} vendors`);

  // ---------------------------------------------------------------- Purchase orders (raw materials in)
  const poDefs = [
    { vendor: 'Sri Murugan Preforms (Vendor)', day: 40, status: 'received', paid: 'paid', items: [['RM-PF18', 60000, 1.75], ['RM-PF13', 40000, 1.35]] },
    { vendor: 'Chennai Caps & Closures (Vendor)', day: 33, status: 'received', paid: 'paid', items: [['RM-CAP28', 150000, 0.32], ['RM-CAP20L', 5000, 2.2]] },
    { vendor: 'Madurai Packaging Industries (Vendor)', day: 21, status: 'received', paid: 'partial', items: [['RM-CTN', 6000, 9], ['RM-SHR', 400, 155]] },
    { vendor: 'Sri Murugan Preforms (Vendor)', day: 12, status: 'partial', paid: 'pending', items: [['RM-PF28', 30000, 2.6], ['RM-PF42', 10000, 3.9]], received: { 'RM-PF28': 15000, 'RM-PF42': 10000 } },
    { vendor: 'Madurai Packaging Industries (Vendor)', day: 3, status: 'confirmed', paid: 'pending', items: [['RM-CTN', 4000, 9]] },
    { vendor: 'Chennai Caps & Closures (Vendor)', day: 1, status: 'draft', paid: 'pending', items: [['RM-CAP28', 100000, 0.32]] },
  ];
  const purchaseOrders = [];
  for (const d of poDefs) {
    const vendor = C[d.vendor];
    const received = d.status === 'received' || d.status === 'partial';
    const po = new PurchaseOrder({
      tenant, createdBy: by, poDate: daysAgo(d.day), expectedDeliveryDate: daysAgo(d.day - 5),
      customer: vendor._id, customerName: vendor.name, customerEmail: vendor.email, customerPhone: vendor.phone,
      deliveryWarehouse: whMain._id, deliveryAddress: whMain.address,
      items: d.items.map(([sku, quantity, rate]) => ({
        product: P[sku]._id, productName: P[sku].name, sku: P[sku].sku, unit: P[sku].unit, quantity, rate, taxRate: 18,
        receivedQuantity: d.status === 'received' ? quantity : (d.received?.[sku] || 0),
      })),
      status: d.status,
      receiptStatus: d.status === 'received' ? 'complete' : d.status === 'partial' ? 'partial' : 'pending',
      stockAdded: d.status === 'received', stockAddedAt: d.status === 'received' ? daysAgo(d.day - 4) : undefined,
      confirmedBy: d.status !== 'draft' ? by : undefined, confirmedAt: d.status !== 'draft' ? daysAgo(d.day) : undefined,
      receivedBy: received ? by : undefined, receivedAt: received ? daysAgo(d.day - 4) : undefined,
      paymentStatus: d.paid, paymentMethod: 'bank_transfer', paymentDueDate: daysAgo(d.day - 30),
      notes: 'Deliver to Kovilpatti plant, raw material store.', internalNotes: DEMO_TAG,
    });
    await po.save();
    if (d.paid !== 'pending') {
      po.paidAmount = d.paid === 'paid' ? po.grandTotal : round2(po.grandTotal / 2);
      await po.save();
    }
    for (const it of po.items) {
      if (it.receivedQuantity > 0) {
        move(it.sku.replace(SKU, ''), daysAgo(d.day - 4), it.receivedQuantity, {
          type: 'in', reason: 'purchase', reference: po.poNumber, referenceType: 'purchase_order', referenceId: po._id, referenceModel: 'PurchaseOrder',
          notes: `Received from ${vendor.name}`,
        });
      }
    }
    purchaseOrders.push(po);
  }
  console.log(`✅ Purchase orders: ${purchaseOrders.length}`);

  // ---------------------------------------------------------------- Production
  // Bill of materials per unit of finished good.
  const bom = {
    'FG-300': [['RM-PF13', 24], ['RM-CAP28', 24], ['RM-LBL', 24 / 5000], ['RM-CTN', 1], ['RM-SHR', 0.05]],
    'FG-500': [['RM-PF18', 24], ['RM-CAP28', 24], ['RM-LBL', 24 / 5000], ['RM-CTN', 1], ['RM-SHR', 0.06]],
    'FG-1L': [['RM-PF28', 12], ['RM-CAP28', 12], ['RM-LBL', 12 / 5000], ['RM-CTN', 1], ['RM-SHR', 0.06]],
    'FG-2L': [['RM-PF42', 9], ['RM-CAP28', 9], ['RM-LBL', 9 / 5000], ['RM-CTN', 1], ['RM-SHR', 0.07]],
    'FG-5L': [['RM-PF90', 1], ['RM-LBL', 1 / 5000]],
    'FG-20L': [['RM-CAP20L', 1]],
  };
  const shelfLifeDays = { 'FG-20L': 30 };
  const prodPlan = [
    // [daysAgo, fg, shift, planned, produced, rejected, status]
    [38, 'FG-20L', 'morning', 300, 296, 3, 'completed'],
    [28, 'FG-500', 'morning', 600, 590, 8, 'completed'],
    [27, 'FG-1L', 'afternoon', 500, 494, 6, 'completed'],
    [26, 'FG-300', 'morning', 700, 690, 10, 'completed'],
    [24, 'FG-20L', 'night', 300, 298, 2, 'completed'],
    [21, 'FG-2L', 'morning', 200, 197, 3, 'completed'],
    [19, 'FG-500', 'afternoon', 600, 592, 7, 'completed'],
    [17, 'FG-5L', 'morning', 400, 395, 3, 'completed'],
    [14, 'FG-1L', 'morning', 450, 446, 4, 'completed'],
    [12, 'FG-20L', 'morning', 320, 316, 4, 'completed'],
    [10, 'FG-300', 'afternoon', 700, 0, 0, 'cancelled'],
    [8, 'FG-500', 'morning', 700, 690, 10, 'completed'],
    [6, 'FG-2L', 'afternoon', 150, 148, 2, 'completed'],
    [5, 'FG-20L', 'morning', 300, 297, 3, 'completed'],
    [3, 'FG-1L', 'night', 450, 447, 5, 'completed'],
    [2, 'FG-300', 'morning', 700, 690, 9, 'completed'],
    [1, 'FG-20L', 'morning', 300, 302, 2, 'completed'],
    [0, 'FG-500', 'morning', 1000, 460, 5, 'in_progress'],
    [-1, 'FG-1L', 'morning', 700, 0, 0, 'planned'],
  ];
  const productions = [];
  const batches = [];
  for (const [d, fg, shift, planned, produced, rejected, status] of prodPlan) {
    const fgProduct = P[fg];
    const date = d >= 0 ? daysAgo(d, 7) : daysAhead(1);
    const batchNumber = `SBR-${fg.replace('FG-', '')}-${date.toISOString().slice(2, 10).replace(/-/g, '')}`;
    const good = produced - rejected;
    const mats = produced > 0 ? bom[fg].map(([sku, per]) => {
      const qty = round2(per * produced);
      return { material: P[sku]._id, quantityUsed: qty, unit: P[sku].unit, cost: round2(qty * P[sku].costPrice) };
    }) : [];
    const materialCost = round2(mats.reduce((s, m) => s + m.cost, 0));
    const laborCost = produced > 0 ? Math.round(produced * 2.5) : 0;
    const overheadCost = produced > 0 ? Math.round(produced * 1.8) : 0;
    const expiry = new Date(date.getTime() + (shelfLifeDays[fg] || 180) * DAY);
    const prod = await Production.create({
      tenant, createdBy: by, supervisor: by, productionDate: date, shift, product: fgProduct._id, batchNumber,
      plannedQuantity: planned, producedQuantity: produced, rejectedQuantity: rejected,
      rejectionReason: rejected > 0 ? 'Leakage / short fill at capping station' : undefined,
      qualityStatus: status === 'completed' ? 'passed' : 'pending', qualityCheckedBy: status === 'completed' ? by : undefined,
      materialsConsumed: mats, manufacturingDate: produced > 0 ? date : undefined, expiryDate: produced > 0 ? expiry : undefined,
      warehouse: whMain._id, storageLocation: 'FG Bay',
      productionCost: { materialCost, laborCost, overheadCost, totalCost: round2(materialCost + laborCost + overheadCost) },
      status, startTime: produced > 0 ? date : undefined, endTime: status === 'completed' ? new Date(date.getTime() + 7 * 3600 * 1000) : undefined,
      notes: `${status === 'cancelled' ? 'Cancelled: blow moulding machine maintenance. ' : ''}${DEMO_TAG}`,
    });
    productions.push(prod);
    if (produced > 0) {
      mats.forEach((m, i) => move(bom[fg][i][0], date, -m.quantityUsed, {
        type: 'out', reason: 'production', reference: prod.productionNumber, referenceType: 'production', referenceId: prod._id, referenceModel: 'Production',
        notes: `Consumed for batch ${batchNumber}`,
      }));
    }
    if (status === 'completed') {
      move(fg, new Date(date.getTime() + 8 * 3600 * 1000), good, {
        type: 'in', reason: 'production', reference: prod.productionNumber, referenceType: 'production', referenceId: prod._id, referenceModel: 'Production',
        notes: `Produced batch ${batchNumber}`,
      });
      batches.push({ fg, batchNumber, date, expiry, good, cost: fgProduct.costPrice });
    }
  }
  console.log(`✅ Production entries: ${productions.length}`);

  // ---------------------------------------------------------------- Invoices + payments
  const invoiceDefs = [
    // [daysAgo, customer, items[[sku, qty, rate?]], status, paidFraction, method, discount%]
    [36, 'Thoothukudi Aqua Distributors', [['FG-500', 300], ['FG-1L', 200], ['FG-20L', 150]], 'paid', 1, 'bank_transfer', 5],
    [32, 'Sri Vinayaga Agencies', [['FG-300', 200], ['FG-500', 150]], 'paid', 1, 'upi', 3],
    [29, 'Hotel Annapoorna Residency', [['FG-20L', 120], ['FG-1L', 40]], 'paid', 1, 'cash', 0],
    [27, 'Government Hospital, Kovilpatti', [['FG-20L', 200], ['FG-500', 60]], 'overdue', 0, 'credit', 0],
    [24, 'Nellai Water Suppliers', [['FG-500', 250], ['FG-1L', 180], ['FG-2L', 80]], 'paid', 1, 'bank_transfer', 5],
    [22, 'Sivakasi Super Market', [['FG-300', 80], ['FG-500', 60], ['FG-5L', 40]], 'delivered', 0.5, 'upi', 0],
    [19, 'Kovilpatti Match Works', [['FG-20L', 180]], 'paid', 1, 'cheque', 0],
    [17, 'Sri Lakshmi Mahal (Marriage Hall)', [['FG-300', 150], ['FG-20L', 60]], 'paid', 1, 'cash', 0],
    [15, 'Thoothukudi Aqua Distributors', [['FG-500', 280], ['FG-2L', 90], ['FG-20L', 200]], 'delivered', 0.6, 'bank_transfer', 5],
    [13, 'Hotel Saravana Bhavan Mess', [['FG-20L', 100]], 'paid', 1, 'upi', 0],
    [11, 'Sattur Murugan Stores', [['FG-300', 60], ['FG-500', 40]], 'delivered', 0, 'credit', 0],
    [9, 'Virudhunagar Fresh Mart', [['FG-500', 80], ['FG-1L', 60], ['FG-5L', 50]], 'paid', 1, 'upi', 2],
    [7, 'Nellai Water Suppliers', [['FG-1L', 220], ['FG-20L', 160], ['FG-2L', 60]], 'dispatched', 0, 'credit', 5],
    [5, 'Sri Vinayaga Agencies', [['FG-300', 180], ['FG-500', 200], ['FG-20L', 120]], 'delivered', 0.4, 'upi', 3],
    [4, 'Rajapalayam Water Point', [['FG-20L', 90], ['FG-5L', 30]], 'confirmed', 0, 'credit', 0],
    [2, 'Hotel Annapoorna Residency', [['FG-20L', 110]], 'confirmed', 0, 'credit', 0],
    [1, 'Government Hospital, Kovilpatti', [['FG-20L', 180]], 'draft', 0, 'credit', 0],
    [0, 'Sivakasi Super Market', [['FG-300', 50]], 'cancelled', 0, 'credit', 0],
  ];
  const invoices = [];
  const payments = [];
  const outstanding = {};
  for (const [d, custName, items, status, paidFrac, method, discountPct] of invoiceDefs) {
    const cust = C[custName];
    const date = daysAgo(d, 11);
    const lineItems = items.map(([sku, quantity, rate]) => {
      const p = P[sku];
      const r = rate ?? p.unitPrice;
      const taxableAmount = round2(quantity * r);
      const taxAmount = round2((taxableAmount * 18) / 100);
      return { product: p._id, productName: p.name, sku: p.sku, hsnCode: p.hsnCode, description: p.description, quantity, unit: p.unit, rate: r, taxRate: 18, taxableAmount, taxAmount, totalAmount: round2(taxableAmount + taxAmount) };
    });
    const subtotal = round2(lineItems.reduce((s, i) => s + i.taxableAmount, 0));
    const totalTax = round2(lineItems.reduce((s, i) => s + i.taxAmount, 0));
    const discountAmount = round2((subtotal * discountPct) / 100);
    const shippingCharges = subtotal > 50000 ? 0 : 500;
    const grandTotal = round2(subtotal - discountAmount + totalTax + shippingCharges);
    const shipped = ['dispatched', 'delivered', 'paid', 'overdue'].includes(status);
    const deducted = !['draft', 'cancelled'].includes(status);
    const inv = await Invoice.create({
      tenant, createdBy: by, invoiceDate: date, dueDate: new Date(date.getTime() + 15 * DAY),
      customer: { name: cust.name, email: cust.email, phone: cust.phone },
      billingAddress: cust.billingAddress, shippingAddress: cust.shippingAddress,
      items: lineItems, subtotal, discountType: 'percentage', discountValue: discountPct, discountAmount,
      taxBreakdown: { cgst: { rate: 9, amount: round2(totalTax / 2) }, sgst: { rate: 9, amount: round2(totalTax / 2) }, igst: { rate: 0, amount: 0 } },
      totalTax, shippingCharges, grandTotal, amountInWords: numberToWords(grandTotal),
      status, dispatchStatus: status === 'dispatched' ? 'dispatched' : ['delivered', 'paid', 'overdue'].includes(status) ? 'delivered' : status === 'confirmed' ? 'packed' : 'pending',
      dispatchedAt: shipped ? new Date(date.getTime() + 5 * 3600 * 1000) : undefined, dispatchedBy: shipped ? by : undefined,
      deliveredAt: ['delivered', 'paid', 'overdue'].includes(status) ? new Date(date.getTime() + DAY) : undefined,
      trackingInfo: shipped ? { vehicleNumber: `TN 69 ${['AB', 'AK', 'BC'][d % 3]} ${4100 + d * 7}`, driverName: ['Selvam', 'Mari', 'Kannan'][d % 3], driverPhone: '9840011299' } : undefined,
      stockDeducted: deducted, stockDeductedAt: deducted ? date : undefined,
      paymentMethod: method, paymentDate: status === 'paid' ? new Date(date.getTime() + 3 * DAY) : undefined,
      termsAndConditions: '1. Goods once sold will not be taken back.\n2. Empty 20L cans remain the property of the company.\n3. Subject to Kovilpatti jurisdiction.\n4. E. & O.E.',
      notes: `Thank you for your business. ${DEMO_TAG}`,
    });
    invoices.push(inv);
    if (deducted) {
      lineItems.forEach((it) => move(it.sku.replace(SKU, ''), date, -it.quantity, {
        type: 'out', reason: 'sale', reference: inv.invoiceNumber, referenceType: 'invoice', referenceId: inv._id, referenceModel: 'Invoice',
        notes: `Sold to ${cust.name}`,
      }));
    }
    const paid = round2(grandTotal * paidFrac);
    if (paid > 0) {
      const payMethod = method === 'credit' ? 'upi' : method;
      const pay = await Payment.create({
        tenant, createdBy: by, referenceType: 'invoice', referenceId: inv._id, referenceModel: 'Invoice', referenceNumber: inv.invoiceNumber,
        party: { type: 'customer', id: cust._id, model: 'Customer', name: cust.name, email: cust.email, phone: cust.phone },
        paymentType: 'received', paymentDate: new Date(date.getTime() + 3 * DAY), amount: paid, paymentMethod: payMethod,
        upiDetails: payMethod === 'upi' ? { upiId: 'sbrwater@upi', transactionId: `UPI${inv._id.toString().slice(-10).toUpperCase()}`, app: 'GPay' } : undefined,
        chequeDetails: payMethod === 'cheque' ? { chequeNumber: `0${450000 + d}`, chequeDate: date, bankName: 'Indian Bank', status: 'cleared', clearedDate: new Date(date.getTime() + 3 * DAY) } : undefined,
        transactionReference: payMethod === 'bank_transfer' ? `NEFT${inv._id.toString().slice(-8).toUpperCase()}` : undefined,
        status: 'completed', invoiceAmount: grandTotal, previouslyPaid: 0, balanceAfterPayment: round2(grandTotal - paid),
        receiptGenerated: true, internalNotes: DEMO_TAG,
      });
      payments.push(pay);
    }
    if (deducted && status !== 'paid') {
      outstanding[cust.name] = round2((outstanding[cust.name] || 0) + grandTotal - paid);
    }
  }
  for (const [name, amt] of Object.entries(outstanding)) {
    await Customer.updateOne({ _id: C[name]._id }, { $set: { outstandingBalance: amt } });
  }

  // Payments made to vendors for received POs.
  for (const po of purchaseOrders.filter((p) => p.paidAmount > 0)) {
    payments.push(await Payment.create({
      tenant, createdBy: by, referenceType: 'purchase_order', referenceId: po._id, referenceModel: 'PurchaseOrder', referenceNumber: po.poNumber,
      party: { type: 'supplier', name: po.customerName, email: po.customerEmail, phone: po.customerPhone },
      paymentType: 'made', paymentDate: new Date(po.poDate.getTime() + 10 * DAY), amount: po.paidAmount, paymentMethod: 'neft',
      bankDetails: { bankName: 'Indian Overseas Bank', branchName: 'Kovilpatti' }, transactionReference: `NEFT${po._id.toString().slice(-8).toUpperCase()}`,
      status: 'completed', invoiceAmount: po.grandTotal, balanceAfterPayment: round2(po.grandTotal - po.paidAmount), internalNotes: DEMO_TAG,
    }));
  }
  console.log(`✅ Invoices: ${invoices.length}  Payments: ${payments.length}`);

  // ---------------------------------------------------------------- Delivery challans
  const invByCust = (name) => invoices.find((i) => i.customer.name === name && i.status === 'delivered');
  const challanDefs = [
    { type: 'non_returnable', invoice: invByCust('Thoothukudi Aqua Distributors'), cust: 'Thoothukudi Aqua Distributors', status: 'delivered', day: 15 },
    { type: 'non_returnable', invoice: invByCust('Sri Vinayaga Agencies'), cust: 'Sri Vinayaga Agencies', status: 'delivered', day: 5 },
    { type: 'returnable', cust: 'Sri Lakshmi Mahal (Marriage Hall)', status: 'delivered', day: 17, items: [['RM-JAR20', 60]], purpose: 'Empty 20L PC jars given against security deposit for wedding function. To be returned.', returnBy: 3 },
    { type: 'sample', cust: 'Virudhunagar Fresh Mart', status: 'delivered', day: 10, items: [['FG-500', 2], ['FG-1L', 2]], purpose: 'Free samples for new retail outlet listing.' },
    { type: 'returnable', cust: 'Kovilpatti Match Works', status: 'dispatched', day: 1, items: [['RM-JAR20', 40]], purpose: 'Empty 20L jars for office water dispenser supply.', returnBy: -29 },
  ];
  const challans = [];
  for (const d of challanDefs) {
    const cust = C[d.cust];
    const date = daysAgo(d.day, 12);
    const items = d.invoice
      ? d.invoice.items.map((i) => ({ product: i.product, productName: i.productName, sku: i.sku, hsnCode: i.hsnCode, quantity: i.quantity, unit: i.unit, rate: i.rate, amount: i.taxableAmount }))
      : d.items.map(([sku, q]) => ({ product: P[sku]._id, productName: P[sku].name, sku: P[sku].sku, quantity: q, unit: P[sku].unit, rate: P[sku].unitPrice, amount: round2(q * P[sku].unitPrice) }));
    const ch = await DeliveryChallan.create({
      tenant, createdBy: by, preparedBy: by, dispatchedBy: d.status !== 'draft' ? by : undefined,
      challanDate: date, challanType: d.type,
      linkedDocument: d.invoice ? { type: 'invoice', reference: d.invoice._id, referenceModel: 'Invoice', referenceNumber: d.invoice.invoiceNumber } : { type: 'none' },
      consignee: { name: cust.name, address: cust.billingAddress.street, city: cust.billingAddress.city, state: 'Tamil Nadu', pincode: cust.billingAddress.pincode, phone: cust.phone },
      deliveryAddress: { name: cust.name, address: cust.shippingAddress.street, city: cust.shippingAddress.city, state: 'Tamil Nadu', pincode: cust.shippingAddress.pincode, phone: cust.phone },
      items, totalQuantity: items.reduce((s, i) => s + i.quantity, 0), totalValue: round2(items.reduce((s, i) => s + i.amount, 0)),
      transportMode: 'road',
      transportDetails: { vehicleNumber: `TN 69 AK ${4200 + d.day}`, vehicleType: 'Tata Ace / Eicher 14ft', driverName: 'Selvam', driverPhone: '9840011299' },
      dispatchDate: date, expectedDeliveryDate: new Date(date.getTime() + DAY),
      actualDeliveryDate: d.status === 'delivered' ? new Date(date.getTime() + DAY) : undefined,
      expectedReturnDate: d.returnBy !== undefined ? daysAgo(d.returnBy) : undefined,
      status: d.status, returnStatus: d.type === 'returnable' ? 'pending' : 'not_applicable',
      stockDeducted: d.type !== 'non_returnable', stockDeductedAt: d.type !== 'non_returnable' ? date : undefined,
      purpose: d.purpose || 'Delivery against tax invoice.',
      receivedBy: d.status === 'delivered' ? 'Store in-charge' : undefined, acknowledgmentReceived: d.status === 'delivered',
      internalNotes: DEMO_TAG,
    });
    challans.push(ch);
    if (d.type !== 'non_returnable') {
      items.forEach((it) => move(it.sku.replace(SKU, ''), date, -it.quantity, {
        type: 'out', reason: d.type === 'sample' ? 'demo' : 'adjustment', reference: ch.challanNumber, referenceType: 'delivery_challan', referenceId: ch._id, referenceModel: 'DeliveryChallan',
        notes: `${d.type === 'sample' ? 'Samples' : 'Returnable jars'} to ${cust.name}`,
      }));
    }
  }
  console.log(`✅ Delivery challans: ${challans.length}`);

  // ---------------------------------------------------------------- Demo issues (free trial supply)
  const demoDefs = [
    { cust: 'Hotel Saravana Bhavan Mess', day: 25, ret: 18, items: [['FG-20L', 10]], returned: true, conv: 'converted', purpose: 'trial', desc: '1 week free trial of 20L cans before monthly contract.' },
    { cust: 'Virudhunagar Fresh Mart', day: 9, ret: 2, items: [['FG-500', 5], ['FG-1L', 5]], returned: false, conv: 'interested', purpose: 'evaluation', desc: 'Trial stock for shelf placement evaluation.' },
    { cust: 'Rajapalayam Water Point', day: 4, ret: -10, items: [['FG-20L', 15]], returned: false, conv: 'negotiating', purpose: 'trial', desc: 'Trial supply for new dealer.' },
  ];
  const demos = [];
  for (const d of demoDefs) {
    const cust = C[d.cust];
    const date = daysAgo(d.day);
    const demo = await DemoIssue.create({
      tenant, createdBy: by, issuedBy: by, customer: cust._id,
      hospital: { name: cust.name, address: cust.billingAddress.street, city: cust.billingAddress.city, state: 'Tamil Nadu', pincode: cust.billingAddress.pincode },
      contactPerson: { name: 'Purchase Manager', phone: cust.phone },
      issueDate: date, expectedReturnDate: daysAgo(d.ret), actualReturnDate: d.returned ? daysAgo(d.ret + 1) : undefined,
      items: d.items.map(([sku, q]) => ({ product: P[sku]._id, quantity: q, returnedQuantity: d.returned ? q : 0, status: d.returned ? 'returned' : 'issued', returnDate: d.returned ? daysAgo(d.ret + 1) : undefined })),
      purpose: d.purpose, purposeDescription: d.desc, status: d.returned ? 'returned' : 'issued',
      dispatchInfo: { dispatchDate: date, dispatchedBy: by, vehicleNumber: 'TN 69 AB 4155', driverName: 'Mari' },
      returnInfo: d.returned ? { receivedDate: daysAgo(d.ret + 1), receivedBy: by, overallCondition: 'good', notes: 'Empty cans returned in good condition.' } : undefined,
      followUpRequired: !d.returned, followUpDate: d.returned ? undefined : daysAhead(2), conversionStatus: d.conv,
      customerFeedback: d.returned ? 'Good taste and timely delivery. Signed monthly contract.' : undefined,
      internalNotes: DEMO_TAG,
    });
    demos.push(demo);
    d.items.forEach(([sku, q]) => {
      move(sku, date, -q, { type: 'out', reason: 'demo', reference: demo.issueNumber, referenceType: 'demo_issue', referenceId: demo._id, referenceModel: 'DemoIssue', notes: `Trial supply to ${cust.name}` });
      if (d.returned && sku !== 'FG-20L') move(sku, daysAgo(d.ret + 1), q, { type: 'in', reason: 'return', reference: demo.issueNumber, referenceType: 'demo_issue', referenceId: demo._id, referenceModel: 'DemoIssue', notes: `Returned by ${cust.name}` });
    });
  }
  console.log(`✅ Demo issues: ${demos.length}`);

  // ---------------------------------------------------------------- Tenders
  const tenderDefs = [
    { title: 'Supply of 20L packaged drinking water cans to Government Hospital, Kovilpatti (12 months)', org: 'Joint Director of Health Services, Thoothukudi', cust: 'Government Hospital, Kovilpatti', deadline: -20, status: 'awarded', items: [['FG-20L', 12000, 32]], est: 420000, quoted: 384000, final: 384000, priority: 'high' },
    { title: 'Drinking water supply for Collectorate & Taluk offices, Thoothukudi district', org: 'District Collectorate, Thoothukudi', deadline: 6, status: 'submitted', items: [['FG-20L', 8000, 33], ['FG-500', 600, 135]], est: 380000, quoted: 345000, priority: 'medium' },
    { title: 'Packaged drinking water bottles for Kovilpatti Municipality events', org: 'Kovilpatti Municipality', deadline: 14, status: 'draft', items: [['FG-300', 1500, 105], ['FG-1L', 500, 110]], est: 220000, priority: 'low' },
  ];
  const tenders = [];
  for (const d of tenderDefs) {
    tenders.push(await Tender.create({
      tenant, createdBy: by, assignedTo: by, title: d.title, description: d.title,
      organization: { name: d.org, type: 'government', address: 'Tamil Nadu', contactPerson: 'Superintendent', contactPhone: '04632220000' },
      customer: d.cust ? C[d.cust]._id : undefined,
      publishDate: daysAgo(Math.max(d.deadline * -1, 0) + 20), submissionDeadline: d.deadline < 0 ? daysAgo(-d.deadline) : daysAhead(d.deadline),
      openingDate: d.deadline < 0 ? daysAgo(-d.deadline - 2) : daysAhead(d.deadline + 2),
      estimatedValue: d.est, quotedValue: d.quoted, finalValue: d.final,
      emd: { required: true, amount: Math.round(d.est * 0.02), type: 'dd', bankName: 'Indian Bank, Kovilpatti', status: d.status === 'draft' ? 'pending' : 'submitted', submittedDate: d.status === 'draft' ? undefined : daysAgo(Math.abs(d.deadline) + 2) },
      securityDeposit: d.status === 'awarded' ? { required: true, percentage: 5, amount: Math.round((d.final || 0) * 0.05), type: 'bank_guarantee', status: 'submitted', submittedDate: daysAgo(10) } : undefined,
      items: d.items.map(([sku, q, price]) => ({ product: P[sku]._id, description: P[sku].name, quantity: q, unitPrice: price, totalPrice: q * price, pendingQuantity: q })),
      status: d.status, priority: d.priority, category: 'consumables', source: 'tntenders.gov.in',
      referenceNumber: `TN/${d.org.split(' ')[0].toUpperCase()}/2026/${100 + tenders.length}`,
      notes: DEMO_TAG,
    }));
  }
  console.log(`✅ Tenders: ${tenders.length}`);

  // ---------------------------------------------------------------- Transfers between warehouses
  const transferDefs = [
    { to: whTut, day: 20, status: 'completed', items: [['FG-500', 120], ['FG-20L', 100]], reason: 'restock' },
    { to: whTvl, day: 13, status: 'completed', items: [['FG-1L', 80], ['FG-500', 60]], reason: 'restock' },
    { to: whSvk, day: 2, status: 'in_transit', items: [['FG-300', 60], ['FG-5L', 40]], reason: 'customer_order' },
    { to: whTut, day: 0, status: 'pending', items: [['FG-20L', 150]], reason: 'rebalance' },
  ];
  const transfers = [];
  for (const d of transferDefs) {
    const date = daysAgo(d.day, 9);
    const done = d.status === 'completed';
    const tr = await Transfer.create({
      tenant, requestedBy: by, approvedBy: d.status !== 'pending' ? by : undefined, shippedBy: ['in_transit', 'completed'].includes(d.status) ? by : undefined, receivedBy: done ? by : undefined,
      fromWarehouse: whMain._id, fromWarehouseName: whMain.name, toWarehouse: d.to._id, toWarehouseName: d.to.name,
      items: d.items.map(([sku, q]) => ({ product: P[sku]._id, productName: P[sku].name, sku: P[sku].sku, quantity: q, receivedQuantity: done ? q : 0 })),
      status: d.status, priority: d.status === 'pending' ? 'high' : 'normal', reason: d.reason,
      requestedDate: date, expectedDeliveryDate: new Date(date.getTime() + DAY),
      shippedDate: d.status !== 'pending' ? date : undefined, receivedDate: done ? new Date(date.getTime() + DAY) : undefined,
      trackingInfo: d.status !== 'pending' ? { carrier: 'Own vehicle', vehicleNumber: 'TN 69 BC 7781', driverName: 'Kannan', driverPhone: '9840011298' } : undefined,
      notes: DEMO_TAG,
    });
    transfers.push(tr);
    if (d.status !== 'pending') {
      d.items.forEach(([sku, q]) => move(sku, date, 0, {
        type: 'transfer', qty: q, reason: 'transfer', reference: tr.transferNumber, referenceType: 'transfer', referenceId: tr._id, referenceModel: 'Transfer',
        fromWarehouse: whMain._id, fromWarehouseName: whMain.name, toWarehouse: d.to._id, toWarehouseName: d.to.name,
        notes: `${whMain.name} → ${d.to.name}`,
      }));
    }
  }
  console.log(`✅ Transfers: ${transfers.length}`);

  // Damage write-off & physical count adjustment.
  move('FG-1L', daysAgo(16), -14, { type: 'adjustment', reason: 'damage', referenceType: 'manual', notes: 'Cases damaged while unloading (forklift).' });
  move('RM-SHR', daysAgo(6), -8, { type: 'adjustment', reason: 'adjustment', referenceType: 'manual', notes: 'Physical stock count variance.' });

  // ---------------------------------------------------------------- Batches
  // FG batches from production; remaining quantity allocated newest-first so
  // batch totals match closing stock (FIFO consumption of older batches).
  const remainingBySku = Object.fromEntries(fgDefs.map((f) => [f.sku, f.stock]));
  const batchDocs = [];
  for (const b of [...batches].sort((a, z) => z.date - a.date)) {
    const left = Math.min(b.good, remainingBySku[b.fg]);
    remainingBySku[b.fg] -= left;
    batchDocs.push({ ...b, current: left });
  }
  // One old 20L batch kept with stock so the app shows an expired-batch alert.
  const oldest20 = batchDocs.filter((b) => b.fg === 'FG-20L').sort((a, z) => a.date - z.date)[0];
  if (oldest20 && oldest20.current === 0) oldest20.current = 12;
  const createdBatches = [];
  for (const b of batchDocs.sort((a, z) => a.date - z.date)) {
    const p = P[b.fg];
    createdBatches.push(await new Batch({
      tenant, createdBy: by, product: p._id, productName: p.name, productSku: p.sku, batchNumber: b.batchNumber,
      manufacturingDate: b.date, expiryDate: b.expiry, receivedDate: b.date,
      initialQuantity: b.good, currentQuantity: b.current, costPerUnit: b.cost,
      warehouse: whMain._id, warehouseName: whMain.name, location: { zone: 'FG' },
      qualityCheck: { passed: true, checkedBy: by, checkedAt: b.date, notes: 'TDS, pH and microbiology within BIS limits.' },
      notes: DEMO_TAG,
    }).save());
  }
  // Raw-material batch with expiry (chemical) from a PO.
  createdBatches.push(await new Batch({
    tenant, createdBy: by, product: P['RM-ANT']._id, productName: P['RM-ANT'].name, productSku: P['RM-ANT'].sku,
    batchNumber: 'ANT-2609-17', manufacturingDate: daysAgo(70), expiryDate: daysAhead(22), receivedDate: daysAgo(45),
    initialQuantity: 120, currentQuantity: 85, costPerUnit: 210, warehouse: whMain._id, warehouseName: whMain.name,
    supplier: suppliers[4]._id, supplierName: suppliers[4].name, notes: DEMO_TAG,
  }).save());
  console.log(`✅ Batches: ${createdBatches.length}`);

  // ---------------------------------------------------------------- Stock movements (ledger)
  const movementDocs = [];
  for (const sku of Object.keys(P)) {
    const events = ledger.filter((e) => e.sku === sku).sort((a, z) => a.date - z.date);
    const net = events.reduce((s, e) => s + e.delta, 0);
    const closing = P[sku].quantity;
    let running = round2(closing - net);
    if (running < 0) throw new Error(`Opening stock for ${sku} would be negative (${running}); adjust demo quantities`);
    movementDocs.push({
      tenant, product: P[sku]._id, type: 'in', quantity: running, previousQuantity: 0, newQuantity: running, reason: 'initial',
      referenceType: 'manual', warehouse: whMain.name, warehouseRef: whMain._id, notes: 'Opening stock', performedBy: by,
      createdAt: daysAgo(45, 8), updatedAt: daysAgo(45, 8),
    });
    for (const e of events) {
      const prev = running;
      running = round2(running + e.delta);
      const { sku: _s, date, delta, qty, ...rest } = e;
      movementDocs.push({
        tenant, product: P[sku]._id, quantity: qty ?? Math.abs(delta), previousQuantity: prev, newQuantity: running,
        warehouse: whMain.name, warehouseRef: whMain._id, performedBy: by, createdAt: date, updatedAt: date, ...rest,
      });
    }
  }
  // insertMany keeps the historical createdAt timestamps.
  await StockMovement.insertMany(movementDocs, { timestamps: false });
  console.log(`✅ Stock movements: ${movementDocs.length}`);

  // ---------------------------------------------------------------- QR scans
  const scans = [['FG-20L', 'stock_out', 40], ['FG-500', 'verify', 0], ['FG-1L', 'view', 0], ['RM-PF18', 'stock_in', 0], ['FG-300', 'location_update', 0]];
  await QRScan.create(scans.map(([sku, action, quantity], i) => ({
    tenant, product: P[sku]._id, action, quantity, scannedBy: by, device: 'Android – dispatch scanner', notes: DEMO_TAG,
    location: { latitude: 9.1717 + i * 0.001, longitude: 77.8698 },
  })));
  console.log(`✅ QR scans: ${scans.length}`);

  // ---------------------------------------------------------------- Investments & salaries
  const investments = await Investment.create([
    { date: daysAgo(230), investorName: 'Promoter Capital', type: 'capital', amount: 2500000, mode: 'bank_transfer', reference: 'Initial share capital' },
    { date: daysAgo(200), investorName: 'Indian Overseas Bank (Term Loan)', type: 'loan', amount: 1500000, mode: 'bank_transfer', reference: 'MSME term loan – RO plant & blow moulding machine' },
    { date: daysAgo(95), investorName: 'Promoter Contribution', type: 'owner_contribution', amount: 300000, mode: 'upi', reference: 'Working capital top-up' },
    { date: daysAgo(18), investorName: 'Promoter Contribution', type: 'owner_contribution', amount: 150000, mode: 'cheque', reference: 'Purchase of 300 new 20L jars' },
  ].map((i) => ({ ...i, tenant, createdBy: by, notes: DEMO_TAG })));
  const staff = [
    ['Karthik R', 'Plant Manager', 32000], ['Selvi K', 'Accountant', 22000], ['Murugan S', 'Machine Operator', 16000],
    ['Muthu Kumar P', 'Depot In-charge', 17000], ['Lakshmi M', 'Quality Chemist', 20000], ['Ramesh V', 'Sales Executive', 18000],
    ['Selvam A', 'Driver', 15000], ['Pandi T', 'Helper', 12000],
  ];
  const salaryDocs = [];
  for (const [month, day] of [['2026-09', 57], ['2026-10', 26]]) {
    staff.forEach(([name, designation, amount], i) => salaryDocs.push({
      tenant, createdBy: by, date: daysAgo(day), employeeName: name, designation, month, amount,
      mode: i % 3 === 0 ? 'bank_transfer' : i % 3 === 1 ? 'upi' : 'cash', reference: `Salary ${month}`, notes: DEMO_TAG,
    }));
  }
  await SalaryPayment.create(salaryDocs);
  console.log(`✅ Investments: ${investments.length}  Salary payments: ${salaryDocs.length}`);

  // ---------------------------------------------------------------- Notifications
  const overdueInv = invoices.find((i) => i.status === 'overdue');
  const expBatch = createdBatches.find((b) => b.expiryDate < new Date() && b.currentQuantity > 0);
  const notifs = [
    { type: 'low_stock', priority: 'high', title: 'Low stock: 2 Litre cases', message: `${P['FG-2L'].name} is at ${P['FG-2L'].quantity} cases (reorder level ${P['FG-2L'].reorderLevel}).`, referenceType: 'product', referenceId: P['FG-2L']._id, referenceLink: `/products/${P['FG-2L']._id}` },
    { type: 'low_stock', priority: 'medium', title: 'Low stock: PET Preform 28g', message: `${P['RM-PF28'].name} is at ${P['RM-PF28'].quantity} pcs. PO pending balance delivery.`, referenceType: 'product', referenceId: P['RM-PF28']._id, referenceLink: `/products/${P['RM-PF28']._id}` },
    expBatch && { type: 'expired', priority: 'critical', title: 'Expired batch in stock', message: `Batch ${expBatch.batchNumber} (${expBatch.productName}) expired with ${expBatch.currentQuantity} units in stock.`, referenceType: 'batch', referenceId: expBatch._id, referenceLink: '/batches' },
    { type: 'expiry_alert', priority: 'medium', title: 'Antiscalant batch expiring soon', message: 'Batch ANT-2609-17 expires in 22 days.', referenceType: 'batch', referenceLink: '/batches' },
    overdueInv && { type: 'invoice_overdue', priority: 'high', title: `Invoice ${overdueInv.invoiceNumber} overdue`, message: `${overdueInv.customer.name} – ₹${overdueInv.grandTotal.toLocaleString('en-IN')} pending.`, referenceType: 'invoice', referenceId: overdueInv._id, referenceLink: `/invoices/${overdueInv._id}` },
    { type: 'tender_deadline', priority: 'high', title: 'Tender submission in 6 days', message: `${tenders[1].title}`, referenceType: 'tender', referenceId: tenders[1]._id, referenceLink: `/tenders/${tenders[1]._id}` },
    { type: 'demo_return', priority: 'medium', title: 'Trial return overdue', message: `Trial stock at Virudhunagar Fresh Mart was due back 2 days ago (${demos[1].issueNumber}).`, referenceType: 'demo_issue', referenceId: demos[1]._id, referenceLink: `/demo-issues/${demos[1]._id}` },
    { type: 'po_received', priority: 'low', title: 'Purchase order partially received', message: `${purchaseOrders[3].poNumber}: 15,000 of 30,000 preforms (28g) received.`, referenceType: 'purchase_order', referenceId: purchaseOrders[3]._id, referenceLink: `/purchase-orders/${purchaseOrders[3]._id}` },
    { type: 'transfer_completed', priority: 'low', title: 'Transfer completed', message: `${transfers[1].transferNumber} received at Tirunelveli Depot.`, referenceType: 'transfer', referenceId: transfers[1]._id, referenceLink: '/transfers', read: true, readAt: daysAgo(12) },
  ].filter(Boolean);
  await Notification.create(notifs.map((n) => ({ ...n, tenant, user: by, metadata: { demoSeed: true } })));
  console.log(`✅ Notifications: ${notifs.length}`);

  // Keep the plan usage counters in line with what now exists.
  const [pc, cc, sc, wc] = await Promise.all([
    Product.countDocuments({ tenant }), Customer.countDocuments({ tenant }), Supplier.countDocuments({ tenant }), Warehouse.countDocuments({ tenant }),
  ]);
  await Tenant.updateOne({ _id: tenant }, { $set: { 'usage.productsCount': pc, 'usage.customersCount': cc, 'usage.suppliersCount': sc, 'usage.warehousesCount': wc } });

  console.log('\n========================================');
  console.log(`Demo data ready for "${tenantDoc.name}" (Kovilpatti, Tamil Nadu)`);
  console.log('========================================');
}

seed()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('❌ Seeding failed:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
