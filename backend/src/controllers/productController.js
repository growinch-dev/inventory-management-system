const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Tenant = require('../models/Tenant');
const { generateQRCode, generateProductQRData } = require('../utils/qrGenerator');

// @desc    Get all products
// @route   GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      lowStock,
      productType,
    } = req.query;

    const query = { isActive: true, tenant: req.user.tenant };

    if (category) {
      query.category = category;
    }

    if (productType) {
      query.productType = productType;
    }

    if (search) {
      // Use regex for partial matching on name and sku
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('supplier', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenant: req.user.tenant
    }).populate('supplier');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    req.body.createdBy = req.user.id;
    req.body.tenant = req.user.tenant;

    const product = await Product.create(req.body);

    // Generate QR code
    const qrData = generateProductQRData(product);
    const qrCode = await generateQRCode(qrData);
    product.qrCode = qrCode;
    await product.save();

    // Create initial stock movement if quantity > 0
    if (product.quantity > 0) {
      await StockMovement.create({
        tenant: req.user.tenant,
        product: product._id,
        type: 'in',
        quantity: product.quantity,
        previousQuantity: 0,
        newQuantity: product.quantity,
        reason: 'initial',
        referenceType: 'manual',
        performedBy: req.user.id,
        notes: 'Initial stock entry',
      });
    }

    // Track usage
    const tenant = await Tenant.findById(req.user.tenant);
    if (tenant) {
      await tenant.incrementUsage('product');
    }

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findOne({
      _id: req.params.id,
      tenant: req.user.tenant
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const previousQuantity = product.quantity;

    product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    // If quantity changed, create stock movement
    if (req.body.quantity !== undefined && req.body.quantity !== previousQuantity) {
      await StockMovement.create({
        tenant: req.user.tenant,
        product: product._id,
        type: req.body.quantity > previousQuantity ? 'in' : 'out',
        quantity: Math.abs(req.body.quantity - previousQuantity),
        previousQuantity,
        newQuantity: req.body.quantity,
        reason: 'adjustment',
        referenceType: 'manual',
        performedBy: req.user.id,
        notes: req.body.adjustmentNotes || 'Manual quantity adjustment',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenant: req.user.tenant
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.isActive = false;
    await product.save();

    // Track usage decrease
    const tenant = await Tenant.findById(req.user.tenant);
    if (tenant) {
      await tenant.decrementUsage('product');
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update stock via QR scan
// @route   POST /api/products/:id/stock
exports.updateStock = async (req, res, next) => {
  try {
    const { type, quantity, reason, notes } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      tenant: req.user.tenant
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const previousQuantity = product.quantity;
    let newQuantity;

    if (type === 'in') {
      newQuantity = previousQuantity + quantity;
    } else if (type === 'out') {
      if (previousQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock',
        });
      }
      newQuantity = previousQuantity - quantity;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock type',
      });
    }

    product.quantity = newQuantity;
    await product.save();

    // Record stock movement
    await StockMovement.create({
      tenant: req.user.tenant,
      product: product._id,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      reason: reason || (type === 'in' ? 'purchase' : 'sale'),
      referenceType: 'qr_scan',
      scannedVia: 'qr',
      performedBy: req.user.id,
      notes,
    });

    res.status(200).json({
      success: true,
      data: product,
      message: `Stock ${type === 'in' ? 'added' : 'removed'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by SKU or Barcode
// @route   GET /api/products/sku/:sku
exports.getProductBySku = async (req, res, next) => {
  try {
    const code = req.params.sku.trim();

    // Search by SKU first, then by barcode
    let product = await Product.findOne({
      sku: code.toUpperCase(),
      tenant: req.user.tenant
    }).populate('supplier');

    if (!product) {
      // Try searching by barcode
      product = await Product.findOne({
        barcode: code,
        tenant: req.user.tenant
      }).populate('supplier');
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found with this SKU or barcode',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate QR code
// @route   POST /api/products/:id/regenerate-qr
exports.regenerateQR = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenant: req.user.tenant
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const qrData = generateProductQRData(product);
    const qrCode = await generateQRCode(qrData);
    product.qrCode = qrCode;
    await product.save();

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({
      tenant: req.user.tenant,
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    }).populate('supplier', 'name');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get stock movements for a product
// @route   GET /api/products/:id/movements
exports.getStockMovements = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const movements = await StockMovement.find({
      product: req.params.id,
      tenant: req.user.tenant
    })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await StockMovement.countDocuments({
      product: req.params.id,
      tenant: req.user.tenant
    });

    res.status(200).json({
      success: true,
      count: movements.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: movements,
    });
  } catch (error) {
    next(error);
  }
};
