const Tenant = require('../models/Tenant');

// Max logo size as a base64 data URL (~700KB encoded ≈ ~500KB image).
const MAX_LOGO_CHARS = 700 * 1024;

// @desc    Public org branding by slug (for the branded login page)
// @route   GET /api/tenant/by-slug/:slug   (no auth)
exports.getTenantBySlug = async (req, res, next) => {
  try {
    const tenant = await Tenant.findOne({ slug: req.params.slug, isActive: true })
      .select('name slug settings.logo settings.primaryColor');
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    res.status(200).json({
      success: true,
      data: {
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.settings?.logo || '',
        primaryColor: tenant.settings?.primaryColor || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current tenant (organization) profile + settings
// @route   GET /api/tenant
exports.getTenant = async (req, res, next) => {
  try {
    if (!req.user.tenant) {
      return res.status(404).json({ success: false, message: 'No organization linked to this account' });
    }
    const tenant = await Tenant.findById(req.user.tenant);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }
    res.status(200).json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tenant profile + settings (name, contact, logo, branding)
// @route   PUT /api/tenant
exports.updateTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.user.tenant);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const { name, email, phone, address, gstNumber, panNumber, settings } = req.body;

    if (name !== undefined) tenant.name = name;
    if (email !== undefined) tenant.email = email;
    if (phone !== undefined) tenant.phone = phone;
    if (gstNumber !== undefined) tenant.gstNumber = gstNumber;
    if (panNumber !== undefined) tenant.panNumber = panNumber;
    if (address !== undefined) tenant.address = { ...tenant.address?.toObject?.(), ...address };

    if (settings && typeof settings === 'object') {
      // Validate logo (base64 data URL) size.
      if (typeof settings.logo === 'string' && settings.logo.length > MAX_LOGO_CHARS) {
        return res.status(400).json({
          success: false,
          message: 'Logo is too large. Please use an image under ~500 KB.',
        });
      }
      const allowed = ['logo', 'primaryColor', 'invoicePrefix', 'purchaseOrderPrefix', 'currency', 'dateFormat', 'timezone', 'language'];
      for (const key of allowed) {
        if (settings[key] !== undefined) tenant.settings[key] = settings[key];
      }
    }

    await tenant.save();
    res.status(200).json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};
