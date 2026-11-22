const Batch = require('../models/Batch');
const Product = require('../models/Product');

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private
exports.getBatches = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      product,
      warehouse,
      status,
      search,
      expiringIn, // days
      sortBy = 'expiryDate',
      order = 'asc',
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (product) query.product = product;
    if (warehouse) query.warehouse = warehouse;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { batchNumber: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { productSku: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by expiring in X days
    if (expiringIn) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(expiringIn));
      query.expiryDate = {
        $gte: new Date(),
        $lte: futureDate,
      };
      query.currentQuantity = { $gt: 0 };
    }

    const total = await Batch.countDocuments(query);
    const batches = await Batch.find(query)
      .populate('product', 'name sku category unit')
      .populate('warehouse', 'name code')
      .populate('supplier', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: batches.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single batch
// @route   GET /api/batches/:id
// @access  Private
exports.getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('product')
      .populate('warehouse')
      .populate('supplier')
      .populate('purchaseOrder')
      .populate('createdBy', 'name');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batches for a product
// @route   GET /api/products/:productId/batches
// @access  Private
exports.getProductBatches = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { includeExpired = false, includeEmpty = false } = req.query;

    const query = { product: productId, tenant: req.user.tenant };

    if (!includeExpired) {
      query.expiryDate = { $gt: new Date() };
    }

    if (!includeEmpty) {
      query.currentQuantity = { $gt: 0 };
    }

    const batches = await Batch.find(query)
      .populate('warehouse', 'name code')
      .sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create batch manually
// @route   POST /api/batches
// @access  Private
exports.createBatch = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.body.product, tenant: req.user.tenant });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const batch = await Batch.create({
      ...req.body,
      tenant: req.user.tenant,
      productName: product.name,
      productSku: product.sku,
      currentQuantity: req.body.initialQuantity,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
// @access  Private
exports.updateBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiring batches
// @route   GET /api/batches/expiry/alerts
// @access  Private
exports.getExpiryAlerts = async (req, res, next) => {
  try {
    const { days = 30, warehouse } = req.query;

    const expiringBatches = await Batch.getExpiringBatches(parseInt(days), warehouse, req.user.tenant);
    const expiredBatches = await Batch.getExpiredBatches(warehouse, req.user.tenant);

    // Group by expiry status
    const critical = expiringBatches.filter((b) => b.daysUntilExpiry <= 7);
    const warning = expiringBatches.filter((b) => b.daysUntilExpiry > 7 && b.daysUntilExpiry <= 15);
    const attention = expiringBatches.filter(
      (b) => b.daysUntilExpiry > 15 && b.daysUntilExpiry <= 30
    );

    res.status(200).json({
      success: true,
      data: {
        expired: {
          count: expiredBatches.length,
          batches: expiredBatches,
          totalValue: expiredBatches.reduce(
            (sum, b) => sum + b.currentQuantity * (b.costPerUnit || 0),
            0
          ),
        },
        critical: {
          count: critical.length,
          batches: critical,
        },
        warning: {
          count: warning.length,
          batches: warning,
        },
        attention: {
          count: attention.length,
          batches: attention,
        },
        summary: {
          totalExpiring: expiringBatches.length,
          totalExpired: expiredBatches.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark batch as expired
// @route   PATCH /api/batches/:id/expire
// @access  Private
exports.markAsExpired = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    batch.status = 'expired';
    batch.notes = `${batch.notes || ''}\nMarked as expired by ${req.user.name} on ${new Date().toISOString()}`;

    await batch.save();

    // Optionally update product quantity
    if (req.body.deductFromStock && batch.currentQuantity > 0) {
      const product = await Product.findOne({ _id: batch.product, tenant: req.user.tenant });
      if (product) {
        product.quantity -= batch.currentQuantity;
        await product.save();

        // Create stock movement
        const StockMovement = require('../models/StockMovement');
        await StockMovement.create({
          product: batch.product,
          tenant: req.user.tenant,
          type: 'out',
          quantity: batch.currentQuantity,
          previousQuantity: product.quantity + batch.currentQuantity,
          newQuantity: product.quantity,
          reason: 'expired',
          batch: batch._id,
          batchNumber: batch.batchNumber,
          notes: `Expired batch ${batch.batchNumber} removed from stock`,
          performedBy: req.user.id,
        });

        batch.currentQuantity = 0;
        await batch.save();
      }
    }

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quarantine batch
// @route   PATCH /api/batches/:id/quarantine
// @access  Private
exports.quarantineBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    batch.status = 'quarantine';
    batch.notes = `${batch.notes || ''}\nQuarantined: ${req.body.reason || 'Quality check required'}`;

    await batch.save();

    res.status(200).json({
      success: true,
      data: batch,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batch stats
// @route   GET /api/batches/stats
// @access  Private
exports.getBatchStats = async (req, res, next) => {
  try {
    const { warehouse } = req.query;

    const matchStage = { tenant: req.user.tenant };
    if (warehouse) {
      matchStage.warehouse = mongoose.Types.ObjectId(warehouse);
    }

    // Status counts
    const byStatus = await Batch.aggregate([
      { $match: { ...matchStage, currentQuantity: { $gt: 0 } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$currentQuantity' },
          totalValue: { $sum: { $multiply: ['$currentQuantity', '$costPerUnit'] } },
        },
      },
    ]);

    // Expiry summary
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expirySummary = await Batch.aggregate([
      { $match: { ...matchStage, currentQuantity: { $gt: 0 } } },
      {
        $facet: {
          expired: [{ $match: { expiryDate: { $lt: now } } }, { $count: 'count' }],
          within7Days: [
            { $match: { expiryDate: { $gte: now, $lte: in7Days } } },
            { $count: 'count' },
          ],
          within30Days: [
            { $match: { expiryDate: { $gte: now, $lte: in30Days } } },
            { $count: 'count' },
          ],
          within90Days: [
            { $match: { expiryDate: { $gte: now, $lte: in90Days } } },
            { $count: 'count' },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    // Top products by batch count
    const topProducts = await Batch.aggregate([
      { $match: { ...matchStage, currentQuantity: { $gt: 0 } } },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productName' },
          batchCount: { $sum: 1 },
          totalQuantity: { $sum: '$currentQuantity' },
        },
      },
      { $sort: { batchCount: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus,
        expirySummary: {
          expired: expirySummary[0]?.expired[0]?.count || 0,
          within7Days: expirySummary[0]?.within7Days[0]?.count || 0,
          within30Days: expirySummary[0]?.within30Days[0]?.count || 0,
          within90Days: expirySummary[0]?.within90Days[0]?.count || 0,
          total: expirySummary[0]?.total[0]?.count || 0,
        },
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Select batches for dispatch (FIFO)
// @route   POST /api/batches/select-fifo
// @access  Private
exports.selectBatchesFIFO = async (req, res, next) => {
  try {
    const { productId, quantity, warehouseId } = req.body;

    const result = await Batch.selectBatchesFIFO(productId, quantity, warehouseId, req.user.tenant);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
