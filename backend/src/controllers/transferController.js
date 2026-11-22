const Transfer = require('../models/Transfer');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');

// @desc    Get all transfers
// @route   GET /api/transfers
// @access  Private
exports.getTransfers = async (req, res) => {
  try {
    const {
      search,
      status,
      fromWarehouse,
      toWarehouse,
      priority,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (search) {
      query.$or = [
        { transferNumber: { $regex: search, $options: 'i' } },
        { fromWarehouseName: { $regex: search, $options: 'i' } },
        { toWarehouseName: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (fromWarehouse) query.fromWarehouse = fromWarehouse;
    if (toWarehouse) query.toWarehouse = toWarehouse;
    if (priority) query.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transfers, total] = await Promise.all([
      Transfer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('fromWarehouse', 'code name')
        .populate('toWarehouse', 'code name')
        .populate('requestedBy', 'name')
        .populate('items.product', 'name sku'),
      Transfer.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transfers,
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
      message: 'Failed to fetch transfers',
      error: error.message,
    });
  }
};

// @desc    Get single transfer
// @route   GET /api/transfers/:id
// @access  Private
exports.getTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('fromWarehouse', 'code name address')
      .populate('toWarehouse', 'code name address')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('shippedBy', 'name email')
      .populate('receivedBy', 'name email')
      .populate('items.product', 'name sku quantity location');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer',
      error: error.message,
    });
  }
};

// @desc    Create transfer request
// @route   POST /api/transfers
// @access  Private (Admin/Manager)
exports.createTransfer = async (req, res) => {
  try {
    const { fromWarehouse, toWarehouse, items, priority, reason, notes, expectedDeliveryDate } = req.body;

    // Validate warehouses
    const [sourceWH, destWH] = await Promise.all([
      Warehouse.findOne({ _id: fromWarehouse, tenant: req.user.tenant }),
      Warehouse.findOne({ _id: toWarehouse, tenant: req.user.tenant }),
    ]);

    if (!sourceWH) {
      return res.status(400).json({
        success: false,
        message: 'Source warehouse not found',
      });
    }

    if (!destWH) {
      return res.status(400).json({
        success: false,
        message: 'Destination warehouse not found',
      });
    }

    if (fromWarehouse === toWarehouse) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination warehouses must be different',
      });
    }

    // Validate items and check stock
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      // Check if product is in source warehouse
      if (product.location.warehouse !== sourceWH.name) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not in ${sourceWH.name} warehouse`,
        });
      }

      // Check available quantity
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        });
      }

      validatedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        notes: item.notes,
      });
    }

    const transfer = await Transfer.create({
      fromWarehouse,
      fromWarehouseName: sourceWH.name,
      toWarehouse,
      toWarehouseName: destWH.name,
      items: validatedItems,
      priority,
      reason,
      notes,
      expectedDeliveryDate,
      requestedBy: req.user._id,
      status: 'pending',
      tenant: req.user.tenant,
    });

    const populatedTransfer = await Transfer.findOne({ _id: transfer._id, tenant: req.user.tenant })
      .populate('fromWarehouse', 'code name')
      .populate('toWarehouse', 'code name')
      .populate('requestedBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: populatedTransfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create transfer',
      error: error.message,
    });
  }
};

// @desc    Ship transfer (deduct from source warehouse)
// @route   PUT /api/transfers/:id/ship
// @access  Private (Admin/Manager)
exports.shipTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot ship transfer with status: ${transfer.status}`,
      });
    }

    const { trackingInfo } = req.body;

    // Deduct stock from source warehouse and create movements
    for (const item of transfer.items) {
      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });

      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.productName}`,
        });
      }

      const previousQuantity = product.quantity;
      product.quantity -= item.quantity;
      await product.save();

      // Create stock movement for outgoing transfer
      await StockMovement.create({
        product: item.product,
        type: 'transfer',
        quantity: item.quantity,
        previousQuantity,
        newQuantity: product.quantity,
        reason: 'transfer',
        reference: transfer.transferNumber,
        referenceType: 'transfer',
        referenceId: transfer._id,
        referenceModel: 'Transfer',
        warehouse: transfer.fromWarehouseName,
        fromWarehouse: transfer.fromWarehouse,
        fromWarehouseName: transfer.fromWarehouseName,
        toWarehouse: transfer.toWarehouse,
        toWarehouseName: transfer.toWarehouseName,
        notes: `Transfer out to ${transfer.toWarehouseName}`,
        performedBy: req.user._id,
        tenant: req.user.tenant,
      });
    }

    transfer.status = 'in_transit';
    transfer.shippedDate = new Date();
    transfer.shippedBy = req.user._id;
    if (trackingInfo) {
      transfer.trackingInfo = trackingInfo;
    }
    await transfer.save();

    res.json({
      success: true,
      message: 'Transfer shipped successfully',
      data: transfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to ship transfer',
      error: error.message,
    });
  }
};

// @desc    Receive transfer (add to destination warehouse)
// @route   PUT /api/transfers/:id/receive
// @access  Private
exports.receiveTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('toWarehouse');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    if (transfer.status !== 'in_transit' && transfer.status !== 'partial') {
      return res.status(400).json({
        success: false,
        message: `Cannot receive transfer with status: ${transfer.status}`,
      });
    }

    const { receivedItems } = req.body;

    // Process received items
    let allReceived = true;
    for (const receivedItem of receivedItems) {
      const transferItem = transfer.items.find(
        item => item.product.toString() === receivedItem.product
      );

      if (!transferItem) continue;

      const receivedQty = receivedItem.receivedQuantity || receivedItem.quantity;
      transferItem.receivedQuantity = (transferItem.receivedQuantity || 0) + receivedQty;

      if (transferItem.receivedQuantity < transferItem.quantity) {
        allReceived = false;
      }

      // Update product in destination warehouse
      // For POC: We'll update the existing product location
      // In full implementation: Would create new inventory record in destination
      const product = await Product.findOne({ _id: transferItem.product, tenant: req.user.tenant });
      if (product) {
        const previousQuantity = product.quantity;
        product.quantity += receivedQty;
        product.location.warehouse = transfer.toWarehouse.name;
        await product.save();

        // Create stock movement for incoming transfer
        await StockMovement.create({
          product: transferItem.product,
          type: 'transfer',
          quantity: receivedQty,
          previousQuantity,
          newQuantity: product.quantity,
          reason: 'transfer',
          reference: transfer.transferNumber,
          referenceType: 'transfer',
          referenceId: transfer._id,
          referenceModel: 'Transfer',
          warehouse: transfer.toWarehouseName,
          fromWarehouse: transfer.fromWarehouse,
          fromWarehouseName: transfer.fromWarehouseName,
          toWarehouse: transfer.toWarehouse._id,
          toWarehouseName: transfer.toWarehouseName,
          notes: `Transfer in from ${transfer.fromWarehouseName}`,
          performedBy: req.user._id,
          tenant: req.user.tenant,
        });
      }
    }

    transfer.status = allReceived ? 'completed' : 'partial';
    transfer.receivedDate = new Date();
    transfer.receivedBy = req.user._id;
    await transfer.save();

    res.json({
      success: true,
      message: allReceived ? 'Transfer completed successfully' : 'Partial transfer received',
      data: transfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to receive transfer',
      error: error.message,
    });
  }
};

// @desc    Cancel transfer
// @route   PUT /api/transfers/:id/cancel
// @access  Private (Admin/Manager)
exports.cancelTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    if (!['draft', 'pending'].includes(transfer.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel transfer with status: ${transfer.status}`,
      });
    }

    transfer.status = 'cancelled';
    transfer.notes = `${transfer.notes || ''}\n[Cancelled by ${req.user.name} on ${new Date().toISOString()}]`;
    await transfer.save();

    res.json({
      success: true,
      message: 'Transfer cancelled successfully',
      data: transfer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel transfer',
      error: error.message,
    });
  }
};

// @desc    Get transfer statistics
// @route   GET /api/transfers/stats
// @access  Private
exports.getTransferStats = async (req, res) => {
  try {
    const stats = await Transfer.aggregate([
      {
        $match: { tenant: req.user.tenant },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const recentTransfers = await Transfer.find({ tenant: req.user.tenant })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('fromWarehouse', 'code name')
      .populate('toWarehouse', 'code name')
      .select('transferNumber status fromWarehouseName toWarehouseName createdAt');

    res.json({
      success: true,
      data: {
        byStatus: stats,
        recent: recentTransfers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer stats',
      error: error.message,
    });
  }
};
