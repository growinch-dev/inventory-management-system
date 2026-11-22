const DeliveryChallan = require('../models/DeliveryChallan');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Invoice = require('../models/Invoice');
const DemoIssue = require('../models/DemoIssue');

// @desc    Get all delivery challans
// @route   GET /api/delivery-challans
exports.getDeliveryChallans = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      challanType,
      returnStatus,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) query.status = status;
    if (challanType) query.challanType = challanType;
    if (returnStatus) query.returnStatus = returnStatus;

    if (startDate || endDate) {
      query.challanDate = {};
      if (startDate) query.challanDate.$gte = new Date(startDate);
      if (endDate) query.challanDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { challanNumber: { $regex: search, $options: 'i' } },
        { 'consignee.name': { $regex: search, $options: 'i' } },
        { purpose: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await DeliveryChallan.countDocuments(query);
    const challans = await DeliveryChallan.find(query)
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .populate('preparedBy', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: challans.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: challans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single delivery challan
// @route   GET /api/delivery-challans/:id
exports.getDeliveryChallan = async (req, res, next) => {
  try {
    const challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('items.product')
      .populate('returnedItems.product', 'name sku')
      .populate('createdBy', 'name')
      .populate('preparedBy', 'name')
      .populate('dispatchedBy', 'name')
      .populate('invoiceReference');

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create delivery challan
// @route   POST /api/delivery-challans
exports.createDeliveryChallan = async (req, res, next) => {
  try {
    const { items, ...challanData } = req.body;

    // Process items with product details
    const processedItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      processedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        hsnCode: product.hsnCode || '',
        description: item.description || product.description,
        quantity: item.quantity,
        unit: item.unit || product.unit,
        rate: item.rate || product.unitPrice || 0,
        amount: (item.rate || product.unitPrice || 0) * item.quantity,
        serialNumbers: item.serialNumbers || [],
        batchNumber: item.batchNumber || '',
      });
    }

    const challan = await DeliveryChallan.create({
      ...challanData,
      items: processedItems,
      preparedBy: req.user.id,
      createdBy: req.user.id,
      tenant: req.user.tenant,
    });

    res.status(201).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery challan
// @route   PUT /api/delivery-challans/:id
exports.updateDeliveryChallan = async (req, res, next) => {
  try {
    let challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    if (challan.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit challan with status: ${challan.status}`,
      });
    }

    challan = await DeliveryChallan.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete delivery challan
// @route   DELETE /api/delivery-challans/:id
exports.deleteDeliveryChallan = async (req, res, next) => {
  try {
    const challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    if (challan.stockDeducted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete challan with deducted stock. Return items first.',
      });
    }

    await challan.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Delivery Challan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch delivery challan (deduct stock)
// @route   PATCH /api/delivery-challans/:id/dispatch
exports.dispatchChallan = async (req, res, next) => {
  try {
    const challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    if (challan.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch challan with status: ${challan.status}`,
      });
    }

    const { transportDetails } = req.body;

    // Check stock availability and deduct
    for (const item of challan.items) {
      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productName}`,
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.productName}. Available: ${product.quantity}, Required: ${item.quantity}`,
        });
      }

      const previousQuantity = product.quantity;
      product.quantity -= item.quantity;
      await product.save();

      // Create stock movement
      await StockMovement.create({
        product: product._id,
        type: 'out',
        quantity: item.quantity,
        previousQuantity,
        newQuantity: product.quantity,
        reason: 'demo',
        reference: challan.challanNumber,
        referenceType: 'delivery_challan',
        referenceId: challan._id,
        referenceModel: 'DeliveryChallan',
        warehouse: product.location?.warehouse || 'Main',
        notes: `Delivery Challan: ${challan.challanType} to ${challan.consignee.name}`,
        performedBy: req.user.id,
        tenant: req.user.tenant,
      });
    }

    challan.status = 'dispatched';
    challan.dispatchDate = new Date();
    challan.stockDeducted = true;
    challan.stockDeductedAt = new Date();
    challan.dispatchedBy = req.user.id;
    if (transportDetails) {
      challan.transportDetails = { ...challan.transportDetails, ...transportDetails };
    }
    await challan.save();

    res.status(200).json({
      success: true,
      message: 'Delivery Challan dispatched successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark challan as delivered
// @route   PATCH /api/delivery-challans/:id/deliver
exports.deliverChallan = async (req, res, next) => {
  try {
    const challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    if (!['dispatched', 'in_transit'].includes(challan.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as delivered. Current status: ${challan.status}`,
      });
    }

    const { receivedBy, acknowledgmentNotes } = req.body;

    challan.status = 'delivered';
    challan.actualDeliveryDate = new Date();
    challan.receivedBy = receivedBy || '';
    challan.receivedDate = new Date();
    challan.acknowledgmentReceived = true;
    challan.acknowledgmentDate = new Date();
    challan.acknowledgmentNotes = acknowledgmentNotes || '';
    await challan.save();

    res.status(200).json({
      success: true,
      message: 'Delivery Challan marked as delivered',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Return items from delivery challan
// @route   PATCH /api/delivery-challans/:id/return
exports.returnItems = async (req, res, next) => {
  try {
    const challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    if (!['dispatched', 'in_transit', 'delivered', 'partial_return'].includes(challan.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot process return for status: ${challan.status}`,
      });
    }

    const { returnedItems } = req.body;

    // Process each returned item
    for (const returnItem of returnedItems) {
      const originalItem = challan.items.find(
        item => item.product.toString() === returnItem.product
      );

      if (!originalItem) {
        return res.status(400).json({
          success: false,
          message: `Item not found in challan: ${returnItem.product}`,
        });
      }

      // Check if return quantity is valid
      const alreadyReturned = challan.returnedItems
        .filter(r => r.product.toString() === returnItem.product)
        .reduce((sum, r) => sum + r.quantityReturned, 0);

      if (alreadyReturned + returnItem.quantityReturned > originalItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot return more than issued quantity for ${originalItem.productName}`,
        });
      }

      // Add stock back if condition is good
      if (returnItem.condition === 'good') {
        const product = await Product.findOne({ _id: returnItem.product, tenant: req.user.tenant });
        if (product) {
          const previousQuantity = product.quantity;
          product.quantity += returnItem.quantityReturned;
          await product.save();

          await StockMovement.create({
            product: product._id,
            type: 'in',
            quantity: returnItem.quantityReturned,
            previousQuantity,
            newQuantity: product.quantity,
            reason: 'return',
            reference: challan.challanNumber,
            referenceType: 'delivery_challan',
            referenceId: challan._id,
            referenceModel: 'DeliveryChallan',
            warehouse: product.location?.warehouse || 'Main',
            notes: `Return from ${challan.consignee.name} - ${returnItem.condition}`,
            performedBy: req.user.id,
            tenant: req.user.tenant,
          });
        }
      }

      challan.returnedItems.push({
        product: returnItem.product,
        quantityReturned: returnItem.quantityReturned,
        returnDate: new Date(),
        condition: returnItem.condition || 'good',
        notes: returnItem.notes || '',
      });
    }

    // Update return status
    const totalIssued = challan.totalQuantity;
    const totalReturned = challan.returnedItems.reduce((sum, r) => sum + r.quantityReturned, 0);

    if (totalReturned >= totalIssued) {
      challan.returnStatus = 'complete';
      challan.status = 'returned';
      challan.actualReturnDate = new Date();
      challan.stockRestored = true;
      challan.stockRestoredAt = new Date();
    } else if (totalReturned > 0) {
      challan.returnStatus = 'partial';
      challan.status = 'partial_return';
    }

    await challan.save();

    res.status(200).json({
      success: true,
      message: 'Items returned successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert delivery challan to invoice
// @route   PATCH /api/delivery-challans/:id/convert-to-invoice
exports.convertToInvoice = async (req, res, next) => {
  try {
    const challan = await DeliveryChallan.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: 'Delivery Challan not found',
      });
    }

    if (challan.convertedToInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Challan already converted to invoice',
      });
    }

    const { itemsToInvoice, discount, shippingCharges } = req.body;

    // Prepare invoice items
    const invoiceItems = [];
    let subtotal = 0;
    let totalTax = 0;

    const itemsForInvoice = itemsToInvoice || challan.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      rate: item.rate,
    }));

    for (const item of itemsForInvoice) {
      const challanItem = challan.items.find(
        i => i.product.toString() === item.product.toString()
      );

      if (!challanItem) continue;

      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
      const taxRate = product?.taxRate || 18;
      const taxableAmount = item.quantity * item.rate;
      const taxAmount = (taxableAmount * taxRate) / 100;

      invoiceItems.push({
        product: item.product,
        productName: challanItem.productName,
        sku: challanItem.sku,
        hsnCode: challanItem.hsnCode,
        description: challanItem.description,
        quantity: item.quantity,
        unit: challanItem.unit,
        rate: item.rate,
        taxRate,
        taxableAmount,
        taxAmount,
        totalAmount: taxableAmount + taxAmount,
      });

      subtotal += taxableAmount;
      totalTax += taxAmount;
    }

    // Calculate grand total
    const discountAmount = discount || 0;
    const shipping = shippingCharges || 0;
    const grandTotal = subtotal - discountAmount + totalTax + shipping;

    // Create invoice
    const invoice = await Invoice.create({
      customer: {
        name: challan.consignee.name,
        phone: challan.consignee.phone,
        gstNumber: challan.consignee.gstNumber,
      },
      billingAddress: {
        street: challan.consignee.address,
        city: challan.consignee.city,
        state: challan.consignee.state,
        pincode: challan.consignee.pincode,
      },
      shippingAddress: {
        street: challan.deliveryAddress?.address || challan.consignee.address,
        city: challan.deliveryAddress?.city || challan.consignee.city,
        state: challan.deliveryAddress?.state || challan.consignee.state,
        pincode: challan.deliveryAddress?.pincode || challan.consignee.pincode,
      },
      items: invoiceItems,
      subtotal,
      discountAmount,
      taxBreakdown: {
        cgst: { rate: 9, amount: totalTax / 2 },
        sgst: { rate: 9, amount: totalTax / 2 },
        igst: { rate: 0, amount: 0 },
      },
      totalTax,
      shippingCharges: shipping,
      grandTotal,
      status: 'dispatched',  // Already dispatched via challan
      stockDeducted: true,   // Stock already deducted via challan
      notes: `Converted from Delivery Challan: ${challan.challanNumber}`,
      createdBy: req.user.id,
      tenant: req.user.tenant,
    });

    challan.convertedToInvoice = true;
    challan.invoiceReference = invoice._id;
    challan.status = 'converted';
    await challan.save();

    res.status(200).json({
      success: true,
      message: 'Delivery Challan converted to Invoice successfully',
      data: {
        challan,
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get delivery challan stats
// @route   GET /api/delivery-challans/stats
exports.getStats = async (req, res, next) => {
  try {
    const stats = await DeliveryChallan.aggregate([
      {
        $match: { tenant: req.user.tenant },
      },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalValue' } } },
          ],
          byType: [
            { $group: { _id: '$challanType', count: { $sum: 1 }, value: { $sum: '$totalValue' } } },
          ],
          pendingReturns: [
            { $match: { returnStatus: 'pending', status: { $in: ['dispatched', 'delivered'] } } },
            { $count: 'count' },
          ],
          overdueReturns: [
            {
              $match: {
                expectedReturnDate: { $lt: new Date() },
                returnStatus: { $in: ['pending', 'partial'] },
              },
            },
            { $count: 'count' },
          ],
          thisMonth: [
            {
              $match: {
                challanDate: {
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
              },
            },
            { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$totalValue' } } },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overdue returns
// @route   GET /api/delivery-challans/overdue
exports.getOverdueReturns = async (req, res, next) => {
  try {
    const overdueChallans = await DeliveryChallan.find({
      tenant: req.user.tenant,
      expectedReturnDate: { $lt: new Date() },
      returnStatus: { $in: ['pending', 'partial'] },
      status: { $in: ['dispatched', 'in_transit', 'delivered', 'partial_return'] },
    })
      .populate('items.product', 'name sku')
      .sort({ expectedReturnDate: 1 });

    res.status(200).json({
      success: true,
      count: overdueChallans.length,
      data: overdueChallans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create challan from invoice
// @route   POST /api/delivery-challans/from-invoice/:invoiceId
exports.createFromInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const { challanType, expectedReturnDate, transportDetails, purpose } = req.body;

    const items = invoice.items.map(item => ({
      product: item.product,
      productName: item.productName,
      sku: item.sku,
      hsnCode: item.hsnCode,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      amount: item.taxableAmount,
    }));

    const challan = await DeliveryChallan.create({
      challanType: challanType || 'non_returnable',
      linkedDocument: {
        type: 'invoice',
        reference: invoice._id,
        referenceModel: 'Invoice',
        referenceNumber: invoice.invoiceNumber,
      },
      consignee: {
        name: invoice.customer.name,
        address: invoice.billingAddress?.street,
        city: invoice.billingAddress?.city,
        state: invoice.billingAddress?.state,
        pincode: invoice.billingAddress?.pincode,
        phone: invoice.customer.phone,
        gstNumber: invoice.customer.gstNumber,
      },
      deliveryAddress: {
        address: invoice.shippingAddress?.street,
        city: invoice.shippingAddress?.city,
        state: invoice.shippingAddress?.state,
        pincode: invoice.shippingAddress?.pincode,
      },
      items,
      expectedReturnDate,
      transportDetails,
      purpose: purpose || `Delivery for Invoice: ${invoice.invoiceNumber}`,
      preparedBy: req.user.id,
      createdBy: req.user.id,
      tenant: req.user.tenant,
    });

    res.status(201).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create challan from demo issue
// @route   POST /api/delivery-challans/from-demo-issue/:demoIssueId
exports.createFromDemoIssue = async (req, res, next) => {
  try {
    const demoIssue = await DemoIssue.findOne({ _id: req.params.demoIssueId, tenant: req.user.tenant });

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo Issue not found',
      });
    }

    const { transportDetails } = req.body;

    // Get product details for items
    const items = [];
    for (const item of demoIssue.items) {
      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
      items.push({
        product: item.product,
        productName: product?.name || '',
        sku: product?.sku || '',
        hsnCode: product?.hsnCode || '',
        quantity: item.quantity,
        unit: product?.unit || 'PCS',
        rate: product?.unitPrice || 0,
        amount: (product?.unitPrice || 0) * item.quantity,
      });
    }

    const challan = await DeliveryChallan.create({
      challanType: 'demo',
      linkedDocument: {
        type: 'demo_issue',
        reference: demoIssue._id,
        referenceModel: 'DemoIssue',
        referenceNumber: demoIssue.issueNumber,
      },
      consignee: {
        name: demoIssue.hospital.name,
        address: demoIssue.hospital.address,
        city: demoIssue.hospital.city,
        state: demoIssue.hospital.state,
        pincode: demoIssue.hospital.pincode,
        phone: demoIssue.contactPerson?.phone,
      },
      items,
      expectedReturnDate: demoIssue.expectedReturnDate,
      transportDetails,
      purpose: `Demo instruments for ${demoIssue.hospital.name}`,
      preparedBy: req.user.id,
      createdBy: req.user.id,
      tenant: req.user.tenant,
    });

    res.status(201).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};
