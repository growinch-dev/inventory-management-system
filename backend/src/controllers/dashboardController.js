const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const QRScan = require('../models/QRScan');
const Category = require('../models/Category');

const SALE_STATUSES = ['confirmed', 'dispatched', 'delivered', 'paid', 'overdue'];

// "packaged_water_1l" -> "Packaged Water 1l" (fallback when no Category doc exists)
const humanize = (v) => String(v || 'Uncategorized').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    // Revenue window: the current month and the 5 before it.
    const revenueFrom = new Date(today.getFullYear(), today.getMonth() - 5, 1);

    // Get counts
    const [
      totalProducts,
      lowStockProducts,
      totalSuppliers,
      totalCustomers,
      monthlyInvoices,
      pendingInvoices,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true, tenant: req.user.tenant }),
      Product.countDocuments({
        isActive: true,
        tenant: req.user.tenant,
        $expr: { $lte: ['$quantity', '$reorderLevel'] },
      }),
      Supplier.countDocuments({ isActive: true, tenant: req.user.tenant }),
      Customer.countDocuments({ isActive: true, tenant: req.user.tenant }),
      Invoice.countDocuments({ invoiceDate: { $gte: startOfMonth }, status: { $ne: 'cancelled' }, tenant: req.user.tenant }),
      Invoice.countDocuments({ status: { $in: ['draft', 'confirmed', 'dispatched', 'delivered', 'overdue'] }, tenant: req.user.tenant }),
    ]);

    // Revenue stats: billed sales (excludes drafts/cancelled) per month, last 6 months,
    // with empty months filled in so the chart always shows a 6-month trend.
    const revenueAgg = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          status: { $in: SALE_STATUSES },
          invoiceDate: { $gte: revenueFrom },
        },
      },
      {
        $group: {
          _id: { year: { $year: { date: '$invoiceDate', timezone: 'Asia/Kolkata' } }, month: { $month: { date: '$invoiceDate', timezone: 'Asia/Kolkata' } } },
          revenue: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);
    const revenueStats = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const hit = revenueAgg.find((r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1);
      revenueStats.push({
        _id: d.getMonth() + 1,
        year: d.getFullYear(),
        label: d.toLocaleString('en-IN', { month: 'short' }),
        revenue: Math.round((hit?.revenue || 0) * 100) / 100,
        count: hit?.count || 0,
      });
    }

    // Outstanding receivables (billed but not paid)
    const [receivables] = await Invoice.aggregate([
      { $match: { tenant: req.user.tenant, status: { $in: ['confirmed', 'dispatched', 'delivered', 'overdue'] } } },
      { $group: { _id: null, amount: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    // Category-wise stock
    const categoryStock = await Product.aggregate([
      { $match: { isActive: true, tenant: req.user.tenant } },
      {
        $group: {
          _id: '$category',
          productType: { $first: '$productType' },
          unit: { $first: '$unit' },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);
    const categoryNames = new Map(
      (await Category.find({ tenant: req.user.tenant }, 'value name').lean()).map((c) => [c.value, c.name])
    );
    categoryStock.forEach((c) => {
      c.name = categoryNames.get(c._id) || humanize(c._id);
      c.totalValue = Math.round(c.totalValue * 100) / 100;
    });

    // Recent activity
    const recentMovements = await StockMovement.find({ tenant: req.user.tenant })
      .populate('product', 'name sku')
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Recent invoices
    const recentInvoices = await Invoice.find({ tenant: req.user.tenant })
      .select('invoiceNumber customer.name grandTotal status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Expiring products (within 90 days)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiringProducts = await Product.find({
      isActive: true,
      tenant: req.user.tenant,
      expiryDate: {
        $exists: true,
        $ne: null,
        $lte: ninetyDaysFromNow,
        $gte: new Date(),
      },
    })
      .select('name sku quantity expiryDate location')
      .sort({ expiryDate: 1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          lowStockProducts,
          totalSuppliers,
          totalCustomers,
          monthlyInvoices,
          pendingInvoices,
          receivables: Math.round((receivables?.amount || 0) * 100) / 100,
          receivableInvoices: receivables?.count || 0,
        },
        revenueStats,
        categoryStock,
        recentMovements,
        recentInvoices,
        expiringProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory value report
// @route   GET /api/dashboard/inventory-value
exports.getInventoryValue = async (req, res, next) => {
  try {
    const inventoryValue = await Product.aggregate([
      { $match: { isActive: true, tenant: req.user.tenant } },
      {
        $group: {
          _id: null,
          totalCostValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          totalSaleValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          totalQuantity: { $sum: '$quantity' },
          productCount: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: inventoryValue[0] || {
        totalCostValue: 0,
        totalSaleValue: 0,
        totalQuantity: 0,
        productCount: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get QR scan activity
// @route   GET /api/dashboard/qr-activity
exports.getQRActivity = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const activity = await QRScan.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenant: req.user.tenant } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            action: '$action',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    const recentScans = await QRScan.find({ tenant: req.user.tenant })
      .populate('product', 'name sku')
      .populate('scannedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        activity,
        recentScans,
      },
    });
  } catch (error) {
    next(error);
  }
};
