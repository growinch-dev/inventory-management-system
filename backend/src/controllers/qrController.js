const QRScan = require('../models/QRScan');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const { generateQRCode, generateProductQRData } = require('../utils/qrGenerator');

// @desc    Record QR scan
// @route   POST /api/qr/scan
exports.recordScan = async (req, res, next) => {
  try {
    const { productId, action, quantity, invoiceId, notes, device } = req.body;

    const product = await Product.findOne({ _id: productId, tenant: req.user.tenant });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Record the scan
    const scan = await QRScan.create({
      product: productId,
      action,
      quantity: quantity || 0,
      invoice: invoiceId,
      device,
      scannedBy: req.user.id,
      notes,
      ipAddress: req.ip,
      tenant: req.user.tenant,
    });

    // Handle stock updates if needed
    if (action === 'stock_in' || action === 'stock_out') {
      const previousQuantity = product.quantity;
      let newQuantity;

      if (action === 'stock_in') {
        newQuantity = previousQuantity + quantity;
      } else {
        if (previousQuantity < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient stock',
          });
        }
        newQuantity = previousQuantity - quantity;
      }

      product.quantity = newQuantity;
      await product.save();

      await StockMovement.create({
        product: productId,
        type: action === 'stock_in' ? 'in' : 'out',
        quantity,
        previousQuantity,
        newQuantity,
        reason: action === 'stock_in' ? 'purchase' : 'sale',
        referenceType: 'qr_scan',
        scannedVia: 'qr',
        performedBy: req.user.id,
        notes,
        tenant: req.user.tenant,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        scan,
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get scan history
// @route   GET /api/qr/history
exports.getScanHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action, productId, startDate, endDate } = req.query;

    const query = { tenant: req.user.tenant };

    if (action) {
      query.action = action;
    }

    if (productId) {
      query.product = productId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await QRScan.countDocuments(query);
    const scans = await QRScan.find(query)
      .populate('product', 'name sku category')
      .populate('scannedBy', 'name')
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: scans.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: scans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate QR codes for multiple products
// @route   POST /api/qr/bulk-generate
exports.bulkGenerateQR = async (req, res, next) => {
  try {
    const { productIds } = req.body;

    const products = await Product.find({ _id: { $in: productIds }, tenant: req.user.tenant });

    const results = await Promise.all(
      products.map(async (product) => {
        const qrData = generateProductQRData(product);
        const qrCode = await generateQRCode(qrData);
        product.qrCode = qrCode;
        await product.save();
        return {
          id: product._id,
          sku: product.sku,
          name: product.name,
          qrCode,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get scan analytics
// @route   GET /api/qr/analytics
exports.getScanAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const analytics = await QRScan.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      {
        $facet: {
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
          ],
          byDay: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          byUser: [
            {
              $group: {
                _id: '$scannedBy',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          topProducts: [
            {
              $group: {
                _id: '$product',
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    // Populate top products
    const topProducts = await Product.populate(analytics[0].topProducts, {
      path: '_id',
      select: 'name sku',
    });

    res.status(200).json({
      success: true,
      data: {
        ...analytics[0],
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
