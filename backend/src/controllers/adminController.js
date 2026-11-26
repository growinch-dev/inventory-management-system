const Tenant = require('../models/Tenant');
const User = require('../models/User');

// Slugs that collide with app routes / reserved words — cannot be customer slugs.
const RESERVED_SLUGS = new Set([
  'api', 'admin', 'login', 'register', 'logout', 'auth', 'assets', 'static', 'public',
  'dashboard', 'products', 'invoices', 'customers', 'suppliers', 'vendors',
  'purchase-orders', 'production', 'raw-materials', 'categories', 'users', 'expenses',
  'warehouses', 'transfers', 'movements', 'labels', 'reports', 'settings',
  'notifications', 'tenders', 'demo-issues', 'delivery-challans', 'pos', 'payments',
  'receipts', 'pricing', 'billing', 'limit-demo', 'tenant',
]);

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// @desc    List all customer organizations (super admin console)
// @route   GET /api/admin/tenants
exports.getTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();

    // User counts per tenant in one query.
    const counts = await User.aggregate([
      { $group: { _id: '$tenant', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    const data = tenants.map((t) => ({
      id: t._id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      isActive: t.isActive,
      createdAt: t.createdAt,
      userCount: countMap[String(t._id)] || 0,
      subscriptionPlan: t.subscription?.plan,
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Onboard a new customer: create org (tenant) + its first admin user
// @route   POST /api/admin/tenants
exports.createTenant = async (req, res, next) => {
  try {
    const { companyName, adminName, adminEmail, adminPassword, phone, slug } = req.body;

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'companyName, adminName, adminEmail and adminPassword are required',
      });
    }

    // Validate / normalize the requested slug (optional — auto from name otherwise).
    let desiredSlug = slug ? slugify(slug) : slugify(companyName);
    if (!desiredSlug) {
      return res.status(400).json({ success: false, message: 'Could not derive a valid slug' });
    }
    if (RESERVED_SLUGS.has(desiredSlug)) {
      return res.status(400).json({ success: false, message: `"${desiredSlug}" is a reserved word. Choose another slug.` });
    }

    // Ensure slug uniqueness (append -2, -3, ... if taken).
    let uniqueSlug = desiredSlug;
    let n = 1;
    while (await Tenant.findOne({ slug: uniqueSlug })) {
      n += 1;
      uniqueSlug = `${desiredSlug}-${n}`;
    }

    // Prevent duplicate owner email across the platform.
    const existing = await User.findOne({ email: adminEmail.toLowerCase(), isOwner: true });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An owner account with this email already exists' });
    }

    // Create tenant. (pre-save derives slug from name; we override to the chosen slug after.)
    const tenant = await Tenant.create({
      name: companyName,
      email: adminEmail,
      phone,
      owner: null,
    });
    if (tenant.slug !== uniqueSlug) {
      tenant.slug = uniqueSlug; // name not modified now, so pre-save keeps this value
      await tenant.save();
    }

    // Create the org's first admin (owner).
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      tenant: tenant._id,
      isOwner: true,
      isActive: true,
    });

    tenant.owner = admin._id;
    await tenant.save();
    if (typeof tenant.incrementUsage === 'function') {
      await tenant.incrementUsage('user');
    }

    const base = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      success: true,
      data: {
        tenant: { id: tenant._id, name: tenant.name, slug: tenant.slug },
        admin: { name: admin.name, email: admin.email },
        loginUrl: `${base.replace(/\/+$/, '')}/${tenant.slug}`,
      },
    });
  } catch (error) {
    next(error);
  }
};
