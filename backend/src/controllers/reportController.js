const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const Payment = require('../models/Payment');
const Tender = require('../models/Tender');
const StockMovement = require('../models/StockMovement');
const Batch = require('../models/Batch');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

// Helper to parse date range
const getDateRange = (range, startDate, endDate) => {
  const now = new Date();
  let start, end;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    switch (range) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date();
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        end = new Date();
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date();
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
        break;
      case 'all':
        start = new Date(2000, 0, 1);
        end = new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }
  }

  return { start, end };
};

// @desc    Get sales report
// @route   GET /api/reports/sales
exports.getSalesReport = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    // Sales summary
    const salesSummary = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          totalInvoices: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgOrderValue: { $avg: '$grandTotal' },
          totalTax: { $sum: '$taxAmount' },
          totalDiscount: { $sum: '$discount' },
        },
      },
    ]);

    // Sales by status
    const salesByStatus = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$grandTotal' },
        },
      },
    ]);

    // Sales trend (grouped by day/week/month)
    let dateFormat;
    if (groupBy === 'day') {
      dateFormat = '%Y-%m-%d';
    } else if (groupBy === 'week') {
      dateFormat = '%Y-W%V';
    } else {
      dateFormat = '%Y-%m';
    }

    const salesTrend = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$invoiceDate' } },
          sales: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top customers
    const topCustomers = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: '$customer.id',
          name: { $first: '$customer.name' },
          totalSpent: { $sum: '$grandTotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    // Top products
    const topProducts = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    // Sales by category
    const salesByCategory = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.category',
          totalSales: { $sum: '$items.total' },
          quantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: salesSummary[0] || {
          totalSales: 0,
          totalInvoices: 0,
          totalItems: 0,
          avgOrderValue: 0,
          totalTax: 0,
          totalDiscount: 0,
        },
        byStatus: salesByStatus,
        trend: salesTrend,
        topCustomers,
        topProducts,
        byCategory: salesByCategory,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase report
// @route   GET /api/reports/purchases
exports.getPurchaseReport = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    // Purchase summary
    const purchaseSummary = await PurchaseOrder.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          orderDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$grandTotal' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          avgOrderValue: { $avg: '$grandTotal' },
        },
      },
    ]);

    // Purchase by status
    const purchaseByStatus = await PurchaseOrder.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          orderDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$grandTotal' },
        },
      },
    ]);

    // Purchase trend
    let dateFormat = groupBy === 'day' ? '%Y-%m-%d' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m';

    const purchaseTrend = await PurchaseOrder.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          orderDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$orderDate' } },
          purchases: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top suppliers
    const topSuppliers = await PurchaseOrder.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          orderDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: '$supplier.id',
          name: { $first: '$supplier.name' },
          totalPurchased: { $sum: '$grandTotal' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalPurchased: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: purchaseSummary[0] || {
          totalPurchases: 0,
          totalOrders: 0,
          totalItems: 0,
          avgOrderValue: 0,
        },
        byStatus: purchaseByStatus,
        trend: purchaseTrend,
        topSuppliers,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment report
// @route   GET /api/reports/payments
exports.getPaymentReport = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate, type } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    const matchQuery = {
      tenant: req.user.tenant,
      paymentDate: { $gte: start, $lte: end },
    };
    if (type) matchQuery.paymentType = type;

    // Payment summary
    const paymentSummary = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Payment by method
    const paymentByMethod = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Cheque status
    const chequeStatus = await Payment.aggregate([
      {
        $match: {
          ...matchQuery,
          paymentMethod: 'cheque',
        },
      },
      {
        $group: {
          _id: '$chequeDetails.status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Outstanding dues
    const outstandingDues = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          status: { $in: ['confirmed', 'dispatched', 'delivered'] },
          'payment.balanceDue': { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$payment.balanceDue' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Payment trend
    const paymentTrend = await Payment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
            type: '$paymentType',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: paymentSummary,
        byMethod: paymentByMethod,
        chequeStatus,
        outstanding: outstandingDues[0] || { totalOutstanding: 0, count: 0 },
        trend: paymentTrend,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tender report
// @route   GET /api/reports/tenders
exports.getTenderReport = async (req, res, next) => {
  try {
    const { range = 'year', startDate, endDate } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    // Tender summary by status
    const tenderByStatus = await Tender.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          publishDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$estimatedValue' },
        },
      },
    ]);

    // Won vs Lost
    const winRate = await Tender.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          status: { $in: ['won', 'lost'] },
          publishDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          value: { $sum: '$estimatedValue' },
        },
      },
    ]);

    // EMD status
    const emdStatus = await Tender.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          'emd.amount': { $gt: 0 },
          publishDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$emd.status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$emd.amount' },
        },
      },
    ]);

    // Upcoming deadlines
    const upcomingDeadlines = await Tender.find({
      tenant: req.user.tenant,
      submissionDeadline: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      status: { $in: ['identified', 'preparing', 'submitted'] },
    })
      .select('tenderNumber title submissionDeadline estimatedValue status')
      .sort({ submissionDeadline: 1 })
      .limit(10);

    // By department/organization
    const byOrganization = await Tender.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          publishDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$organization',
          count: { $sum: 1 },
          totalValue: { $sum: '$estimatedValue' },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: tenderByStatus,
        winRate,
        emdStatus,
        upcomingDeadlines,
        byOrganization,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory/stock report
// @route   GET /api/reports/inventory
exports.getInventoryReport = async (req, res, next) => {
  try {
    // Stock summary
    const stockSummary = await Product.aggregate([
      { $match: { tenant: req.user.tenant, isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCostValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          totalSaleValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        },
      },
    ]);

    // Stock status breakdown
    const stockStatus = await Product.aggregate([
      { $match: { tenant: req.user.tenant, isActive: true } },
      {
        $project: {
          status: {
            $cond: [
              { $eq: ['$quantity', 0] },
              'out_of_stock',
              {
                $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 'low_stock', 'in_stock'],
              },
            ],
          },
          quantity: 1,
          value: { $multiply: ['$quantity', '$unitPrice'] },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    // By category
    const byCategory = await Product.aggregate([
      { $match: { tenant: req.user.tenant, isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    // By warehouse
    const byWarehouse = await Product.aggregate([
      { $match: { tenant: req.user.tenant, isActive: true } },
      {
        $group: {
          _id: '$location.warehouse',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
        },
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $project: {
          name: { $arrayElemAt: ['$warehouse.name', 0] },
          count: 1,
          totalQuantity: 1,
          totalValue: 1,
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    // Low stock items
    const lowStockItems = await Product.find({
      tenant: req.user.tenant,
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    })
      .select('name sku quantity reorderLevel category unitPrice')
      .sort({ quantity: 1 })
      .limit(20);

    // Dead stock (no movement in 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const activeProductIds = await StockMovement.distinct('product', {
      tenant: req.user.tenant,
      createdAt: { $gte: ninetyDaysAgo },
    });

    const deadStock = await Product.find({
      tenant: req.user.tenant,
      isActive: true,
      _id: { $nin: activeProductIds },
      quantity: { $gt: 0 },
    })
      .select('name sku quantity category unitPrice')
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        summary: stockSummary[0] || {
          totalProducts: 0,
          totalQuantity: 0,
          totalCostValue: 0,
          totalSaleValue: 0,
        },
        stockStatus,
        byCategory,
        byWarehouse,
        lowStockItems,
        deadStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get stock movement report
// @route   GET /api/reports/movements
exports.getMovementReport = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate, type, reason } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    const matchQuery = { tenant: req.user.tenant, createdAt: { $gte: start, $lte: end } };
    if (type) matchQuery.movementType = type;
    if (reason) matchQuery.reason = reason;

    // Movement summary
    const movementSummary = await StockMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $abs: '$quantityChange' } },
        },
      },
    ]);

    // By reason
    const byReason = await StockMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $abs: '$quantityChange' } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Movement trend
    const movementTrend = await StockMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$movementType',
          },
          count: { $sum: 1 },
          quantity: { $sum: { $abs: '$quantityChange' } },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    // Top products with movements
    const topMovedProducts = await StockMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$product',
          totalMovements: { $sum: 1 },
          totalIn: {
            $sum: { $cond: [{ $eq: ['$movementType', 'in'] }, '$quantityChange', 0] },
          },
          totalOut: {
            $sum: { $cond: [{ $eq: ['$movementType', 'out'] }, { $abs: '$quantityChange' }, 0] },
          },
        },
      },
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
          name: '$product.name',
          sku: '$product.sku',
          totalMovements: 1,
          totalIn: 1,
          totalOut: 1,
        },
      },
      { $sort: { totalMovements: -1 } },
      { $limit: 10 },
    ]);

    // By user
    const byUser = await StockMovement.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$performedBy',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: movementSummary,
        byReason,
        trend: movementTrend,
        topMovedProducts,
        byUser,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiry report
// @route   GET /api/reports/expiry
exports.getExpiryReport = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Already expired
    const expired = await Batch.find({
      tenant: req.user.tenant,
      expiryDate: { $lt: now },
      currentQuantity: { $gt: 0 },
      status: { $ne: 'depleted' },
    })
      .populate('product', 'name sku category')
      .sort({ expiryDate: 1 });

    // Expiring in 30 days
    const expiringIn30 = await Batch.find({
      tenant: req.user.tenant,
      expiryDate: { $gte: now, $lte: thirtyDays },
      currentQuantity: { $gt: 0 },
      status: { $ne: 'depleted' },
    })
      .populate('product', 'name sku category')
      .sort({ expiryDate: 1 });

    // Expiring in 31-60 days
    const expiringIn60 = await Batch.find({
      tenant: req.user.tenant,
      expiryDate: { $gt: thirtyDays, $lte: sixtyDays },
      currentQuantity: { $gt: 0 },
      status: { $ne: 'depleted' },
    })
      .populate('product', 'name sku category')
      .sort({ expiryDate: 1 });

    // Expiring in 61-90 days
    const expiringIn90 = await Batch.find({
      tenant: req.user.tenant,
      expiryDate: { $gt: sixtyDays, $lte: ninetyDays },
      currentQuantity: { $gt: 0 },
      status: { $ne: 'depleted' },
    })
      .populate('product', 'name sku category')
      .sort({ expiryDate: 1 });

    // Calculate values
    const calculateValue = (batches) => {
      return batches.reduce((total, batch) => {
        const price = batch.product?.unitPrice || 0;
        return total + batch.currentQuantity * price;
      }, 0);
    };

    // Summary
    const summary = {
      expired: {
        count: expired.length,
        quantity: expired.reduce((sum, b) => sum + b.currentQuantity, 0),
        value: calculateValue(expired),
      },
      expiringIn30: {
        count: expiringIn30.length,
        quantity: expiringIn30.reduce((sum, b) => sum + b.currentQuantity, 0),
        value: calculateValue(expiringIn30),
      },
      expiringIn60: {
        count: expiringIn60.length,
        quantity: expiringIn60.reduce((sum, b) => sum + b.currentQuantity, 0),
        value: calculateValue(expiringIn60),
      },
      expiringIn90: {
        count: expiringIn90.length,
        quantity: expiringIn90.reduce((sum, b) => sum + b.currentQuantity, 0),
        value: calculateValue(expiringIn90),
      },
    };

    // By category
    const allExpiring = [...expired, ...expiringIn30, ...expiringIn60, ...expiringIn90];
    const byCategory = {};
    allExpiring.forEach((batch) => {
      const category = batch.product?.category || 'Unknown';
      if (!byCategory[category]) {
        byCategory[category] = { count: 0, quantity: 0 };
      }
      byCategory[category].count += 1;
      byCategory[category].quantity += batch.currentQuantity;
    });

    res.status(200).json({
      success: true,
      data: {
        summary,
        expired: expired.slice(0, 20),
        expiringIn30: expiringIn30.slice(0, 20),
        expiringIn60: expiringIn60.slice(0, 20),
        expiringIn90: expiringIn90.slice(0, 20),
        byCategory: Object.entries(byCategory).map(([category, data]) => ({
          category,
          ...data,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get profit & loss report
// @route   GET /api/reports/profit-loss
exports.getProfitLossReport = async (req, res, next) => {
  try {
    const { range = 'month', startDate, endDate } = req.query;
    const { start, end } = getDateRange(range, startDate, endDate);

    // Sales revenue
    const salesRevenue = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalTax: { $sum: '$taxAmount' },
          totalDiscount: { $sum: '$discount' },
        },
      },
    ]);

    // Cost of goods sold (from invoice items)
    const cogs = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalCost: {
            $sum: { $multiply: ['$items.quantity', { $ifNull: ['$product.costPrice', 0] }] },
          },
        },
      },
    ]);

    // Purchase expenses
    const purchaseExpenses = await PurchaseOrder.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          orderDate: { $gte: start, $lte: end },
          status: { $in: ['received', 'partial'] },
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$grandTotal' },
        },
      },
    ]);

    const revenue = salesRevenue[0]?.totalRevenue || 0;
    const costOfGoods = cogs[0]?.totalCost || 0;
    const grossProfit = revenue - costOfGoods;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Monthly breakdown
    const monthlyBreakdown = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          invoiceDate: { $gte: start, $lte: end },
          status: { $nin: ['cancelled', 'draft'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          revenue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          revenue,
          costOfGoods,
          grossProfit,
          grossMargin: grossMargin.toFixed(2),
          purchases: purchaseExpenses[0]?.totalPurchases || 0,
          tax: salesRevenue[0]?.totalTax || 0,
          discount: salesRevenue[0]?.totalDiscount || 0,
        },
        monthlyBreakdown,
        dateRange: { start, end },
      },
    });
  } catch (error) {
    next(error);
  }
};
