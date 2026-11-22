const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Batch = require('../models/Batch');
const StockMovement = require('../models/StockMovement');

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private
exports.getPurchaseOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      supplier,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { tenant: req.user.tenant };

    // Filters
    if (status) query.status = status;
    if (supplier) query.supplier = supplier;

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) query.poDate.$gte = new Date(startDate);
      if (endDate) query.poDate.$lte = new Date(endDate);
    }

    const total = await PurchaseOrder.countDocuments(query);
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplier', 'name email phone')
      .populate('deliveryWarehouse', 'name code')
      .populate('createdBy', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: purchaseOrders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single purchase order
// @route   GET /api/purchase-orders/:id
// @access  Private
exports.getPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('supplier')
      .populate('deliveryWarehouse')
      .populate('items.product', 'name sku category unit')
      .populate('createdBy', 'name email')
      .populate('confirmedBy', 'name')
      .populate('receivedBy', 'name');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create purchase order
// @route   POST /api/purchase-orders
// @access  Private
exports.createPurchaseOrder = async (req, res, next) => {
  try {
    // Get supplier details
    const supplier = await Supplier.findOne({ _id: req.body.supplier, tenant: req.user.tenant });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      });
    }

    // Enrich items with product details
    const enrichedItems = await Promise.all(
      req.body.items.map(async (item) => {
        const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }
        return {
          ...item,
          productName: product.name,
          sku: product.sku,
          hsnCode: product.hsnCode,
          unit: product.unit || 'PCS',
        };
      })
    );

    const purchaseOrder = await PurchaseOrder.create({
      ...req.body,
      items: enrichedItems,
      supplierName: supplier.name,
      supplierEmail: supplier.email,
      supplierPhone: supplier.phone,
      supplierGst: supplier.gstNumber,
      createdBy: req.user.id,
      tenant: req.user.tenant,
    });

    res.status(201).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase order
// @route   PUT /api/purchase-orders/:id
// @access  Private
exports.updatePurchaseOrder = async (req, res, next) => {
  try {
    let purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Can only update draft orders
    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only update draft purchase orders',
      });
    }

    // Update supplier details if supplier changed
    if (req.body.supplier && req.body.supplier !== purchaseOrder.supplier.toString()) {
      const supplier = await Supplier.findOne({ _id: req.body.supplier, tenant: req.user.tenant });
      if (supplier) {
        req.body.supplierName = supplier.name;
        req.body.supplierEmail = supplier.email;
        req.body.supplierPhone = supplier.phone;
        req.body.supplierGst = supplier.gstNumber;
      }
    }

    // Enrich items if provided
    if (req.body.items) {
      req.body.items = await Promise.all(
        req.body.items.map(async (item) => {
          const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
          return {
            ...item,
            productName: product?.name || item.productName,
            sku: product?.sku || item.sku,
            hsnCode: product?.hsnCode || item.hsnCode,
            unit: product?.unit || item.unit || 'PCS',
          };
        })
      );
    }

    purchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete purchase order
// @route   DELETE /api/purchase-orders/:id
// @access  Private (Admin/Manager)
exports.deletePurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Can only delete draft orders
    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft purchase orders',
      });
    }

    await purchaseOrder.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm purchase order
// @route   PATCH /api/purchase-orders/:id/confirm
// @access  Private
exports.confirmPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft orders can be confirmed',
      });
    }

    purchaseOrder.status = 'confirmed';
    purchaseOrder.confirmedBy = req.user.id;
    purchaseOrder.confirmedAt = new Date();

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive purchase order items
// @route   PATCH /api/purchase-orders/:id/receive
// @access  Private
exports.receivePurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    if (!['confirmed', 'partial'].includes(purchaseOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed or partial orders can receive items',
      });
    }

    const { receivedItems, warehouseId, notes } = req.body;

    // Process each received item
    for (const received of receivedItems) {
      const itemIndex = purchaseOrder.items.findIndex(
        (item) => item.product.toString() === received.product
      );

      if (itemIndex === -1) continue;

      const poItem = purchaseOrder.items[itemIndex];
      const newReceivedQty = (poItem.receivedQuantity || 0) + received.quantity;

      // Update PO item received quantity
      purchaseOrder.items[itemIndex].receivedQuantity = Math.min(
        newReceivedQty,
        poItem.quantity
      );

      // Get product
      const product = await Product.findOne({ _id: received.product, tenant: req.user.tenant });
      if (!product) continue;

      // Create batch if batch info provided
      let batchId = null;
      if (received.batchNumber) {
        const batch = await Batch.create({
          product: received.product,
          productName: product.name,
          productSku: product.sku,
          batchNumber: received.batchNumber,
          lotNumber: received.lotNumber,
          manufacturingDate: received.manufacturingDate,
          expiryDate: received.expiryDate,
          initialQuantity: received.quantity,
          currentQuantity: received.quantity,
          costPerUnit: poItem.rate,
          warehouse: warehouseId || purchaseOrder.deliveryWarehouse,
          supplier: purchaseOrder.supplier,
          supplierName: purchaseOrder.supplierName,
          purchaseOrder: purchaseOrder._id,
          poNumber: purchaseOrder.poNumber,
          createdBy: req.user.id,
          tenant: req.user.tenant,
        });
        batchId = batch._id;
      }

      // Update product quantity
      const previousQuantity = product.quantity;
      product.quantity += received.quantity;

      // Update product batch info if single batch tracking
      if (received.batchNumber && !product.hasBatchTracking) {
        product.batchNumber = received.batchNumber;
        product.expiryDate = received.expiryDate;
        product.manufacturingDate = received.manufacturingDate;
      }

      await product.save();

      // Create stock movement
      await StockMovement.create({
        product: received.product,
        type: 'in',
        quantity: received.quantity,
        previousQuantity,
        newQuantity: product.quantity,
        reason: 'purchase',
        reference: purchaseOrder.poNumber,
        referenceType: 'purchase_order',
        referenceId: purchaseOrder._id,
        referenceModel: 'PurchaseOrder',
        batch: batchId,
        batchNumber: received.batchNumber,
        warehouse: product.location?.warehouse || 'Main',
        warehouseRef: warehouseId || purchaseOrder.deliveryWarehouse,
        notes: notes || `Received from PO ${purchaseOrder.poNumber}`,
        performedBy: req.user.id,
        tenant: req.user.tenant,
      });
    }

    // Update PO status
    const totalOrdered = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = purchaseOrder.items.reduce(
      (sum, item) => sum + (item.receivedQuantity || 0),
      0
    );

    if (totalReceived >= totalOrdered) {
      purchaseOrder.status = 'received';
      purchaseOrder.receiptStatus = 'complete';
      purchaseOrder.stockAdded = true;
      purchaseOrder.stockAddedAt = new Date();
    } else if (totalReceived > 0) {
      purchaseOrder.status = 'partial';
      purchaseOrder.receiptStatus = 'partial';
    }

    purchaseOrder.receivedBy = req.user.id;
    purchaseOrder.receivedAt = new Date();

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      data: purchaseOrder,
      message: `Received ${totalReceived} of ${totalOrdered} items`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel purchase order
// @route   PATCH /api/purchase-orders/:id/cancel
// @access  Private
exports.cancelPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    if (purchaseOrder.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a fully received order',
      });
    }

    purchaseOrder.status = 'cancelled';
    purchaseOrder.notes = `${purchaseOrder.notes || ''}\nCancelled by ${req.user.name} on ${new Date().toISOString()}`;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase order stats
// @route   GET /api/purchase-orders/stats
// @access  Private
exports.getPurchaseOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchStage = { tenant: req.user.tenant };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.poDate = dateFilter;
    }

    // Status counts
    const byStatus = await PurchaseOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' },
        },
      },
    ]);

    // Monthly trend
    const monthlyTrend = await PurchaseOrder.aggregate([
      { $match: { tenant: req.user.tenant, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: {
            year: { $year: '$poDate' },
            month: { $month: '$poDate' },
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Top suppliers
    const topSuppliers = await PurchaseOrder.aggregate([
      { $match: { tenant: req.user.tenant, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$supplier',
          supplierName: { $first: '$supplierName' },
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
    ]);

    // Pending payments
    const pendingPayments = await PurchaseOrder.aggregate([
      { $match: { tenant: req.user.tenant, paymentStatus: { $in: ['pending', 'partial'] }, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: { $subtract: ['$grandTotal', '$paidAmount'] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus,
        monthlyTrend,
        topSuppliers,
        pendingPayments: pendingPayments[0] || { count: 0, totalAmount: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate purchase order
// @route   POST /api/purchase-orders/:id/duplicate
// @access  Private
exports.duplicatePurchaseOrder = async (req, res, next) => {
  try {
    const originalPo = await PurchaseOrder.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!originalPo) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Create new PO without _id and with reset status
    const newPoData = {
      supplier: originalPo.supplier,
      supplierName: originalPo.supplierName,
      supplierEmail: originalPo.supplierEmail,
      supplierPhone: originalPo.supplierPhone,
      supplierGst: originalPo.supplierGst,
      deliveryWarehouse: originalPo.deliveryWarehouse,
      deliveryAddress: originalPo.deliveryAddress,
      items: originalPo.items.map((item) => ({
        product: item.product,
        productName: item.productName,
        sku: item.sku,
        hsnCode: item.hsnCode,
        description: item.description,
        quantity: item.quantity,
        receivedQuantity: 0,
        unit: item.unit,
        rate: item.rate,
        taxRate: item.taxRate,
      })),
      discountType: originalPo.discountType,
      discountValue: originalPo.discountValue,
      shippingCharges: originalPo.shippingCharges,
      termsAndConditions: originalPo.termsAndConditions,
      notes: `Duplicated from ${originalPo.poNumber}`,
      createdBy: req.user.id,
      status: 'draft',
      paymentStatus: 'pending',
      receiptStatus: 'pending',
      tenant: req.user.tenant,
    };

    const newPo = await PurchaseOrder.create(newPoData);

    res.status(201).json({
      success: true,
      data: newPo,
    });
  } catch (error) {
    next(error);
  }
};
