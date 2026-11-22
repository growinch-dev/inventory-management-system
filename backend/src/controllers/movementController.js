const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

// @desc    Get all stock movements
// @route   GET /api/movements
// @access  Private
exports.getMovements = async (req, res) => {
  try {
    const {
      search,
      product,
      type,
      reason,
      warehouse,
      performedBy,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (product) query.product = product;
    if (type) query.type = type;
    if (reason) query.reason = reason;
    if (warehouse) query.warehouse = { $regex: warehouse, $options: 'i' };
    if (performedBy) query.performedBy = performedBy;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('product', 'name sku category')
        .populate('performedBy', 'name email')
        .populate('warehouseRef', 'code name')
        .populate('fromWarehouse', 'code name')
        .populate('toWarehouse', 'code name'),
      StockMovement.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movements',
      error: error.message,
    });
  }
};

// @desc    Get movements for a specific product
// @route   GET /api/movements/product/:productId
// @access  Private
exports.getProductMovements = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const product = await Product.findOne({ _id: productId, tenant: req.user.tenant }).select('name sku');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movements, total] = await Promise.all([
      StockMovement.find({ product: productId, tenant: req.user.tenant })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'name email')
        .populate('fromWarehouse', 'code name')
        .populate('toWarehouse', 'code name'),
      StockMovement.countDocuments({ product: productId, tenant: req.user.tenant }),
    ]);

    res.json({
      success: true,
      data: {
        product,
        movements,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product movements',
      error: error.message,
    });
  }
};

// @desc    Get movement statistics
// @route   GET /api/movements/stats
// @access  Private
exports.getMovementStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Movement counts by type
    const byType = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } },
    ]);

    // Movement counts by reason
    const byReason = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      { $group: { _id: '$reason', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } },
    ]);

    // Daily movement trends
    const dailyTrends = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Top products by movement
    const topProducts = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      {
        $group: {
          _id: '$product',
          movementCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { movementCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 1,
          movementCount: 1,
          totalQuantity: 1,
          'product.name': 1,
          'product.sku': 1,
        },
      },
    ]);

    // By user
    const byUser = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      { $group: { _id: '$performedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: { _id: 1, count: 1, 'user.name': 1 } },
    ]);

    res.json({
      success: true,
      data: {
        byType,
        byReason,
        dailyTrends,
        topProducts,
        byUser,
        period: { days: parseInt(days), startDate },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movement stats',
      error: error.message,
    });
  }
};

// @desc    Export movements
// @route   GET /api/movements/export
// @access  Private
exports.exportMovements = async (req, res) => {
  try {
    const {
      product,
      type,
      reason,
      warehouse,
      startDate,
      endDate,
      format = 'json',
    } = req.query;

    const query = { tenant: req.user.tenant };
    if (product) query.product = product;
    if (type) query.type = type;
    if (reason) query.reason = reason;
    if (warehouse) query.warehouse = { $regex: warehouse, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const movements = await StockMovement.find(query)
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate('product', 'name sku category')
      .populate('performedBy', 'name email')
      .lean();

    if (format === 'csv') {
      const headers = [
        'Date',
        'Product SKU',
        'Product Name',
        'Type',
        'Quantity',
        'Previous Qty',
        'New Qty',
        'Reason',
        'Reference',
        'Warehouse',
        'Performed By',
        'Notes',
      ];

      const rows = movements.map(m => [
        new Date(m.createdAt).toISOString(),
        m.product?.sku || '',
        m.product?.name || '',
        m.type,
        m.quantity,
        m.previousQuantity,
        m.newQuantity,
        m.reason,
        m.reference || '',
        m.warehouse || '',
        m.performedBy?.name || '',
        m.notes || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-movements.csv');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: movements,
      total: movements.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export movements',
      error: error.message,
    });
  }
};
