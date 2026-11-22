const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const QRScan = require('../models/QRScan');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

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
      Invoice.countDocuments({ createdAt: { $gte: startOfMonth }, tenant: req.user.tenant }),
      Invoice.countDocuments({ status: { $in: ['draft', 'sent'] }, tenant: req.user.tenant }),
    ]);

    // Revenue stats
    const revenueStats = await Invoice.aggregate([
      {
        $match: {
          tenant: req.user.tenant,
          status: 'paid',
          createdAt: { $gte: startOfYear },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Category-wise stock
    const categoryStock = await Product.aggregate([
      { $match: { isActive: true, tenant: req.user.tenant } },
      {
        $group: {
          _id: '$category',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          productCount: { $sum: 1 },
        },
      },
    ]);

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
