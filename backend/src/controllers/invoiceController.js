const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const numberToWords = require('../utils/numberToWords');

// @desc    Get all invoices
// @route   GET /api/invoices
exports.getInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('createdBy', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: invoices.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('items.product')
      .populate('createdBy', 'name');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
exports.createInvoice = async (req, res, next) => {
  try {
    const { items, customer, billingAddress, shippingAddress, discountType, discountValue, shippingCharges, termsAndConditions, notes, dueDate } = req.body;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`,
        });
      }

      const taxableAmount = item.quantity * item.rate;
      const taxAmount = (taxableAmount * (item.taxRate || product.taxRate || 18)) / 100;
      const totalAmount = taxableAmount + taxAmount;

      processedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        hsnCode: product.hsnCode || '',
        description: item.description || product.description,
        quantity: item.quantity,
        unit: item.unit || product.unit,
        rate: item.rate,
        taxRate: item.taxRate || product.taxRate || 18,
        taxableAmount,
        taxAmount,
        totalAmount,
      });

      subtotal += taxableAmount;
      totalTax += taxAmount;
    }

    // Calculate discount
    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    // Calculate grand total
    const grandTotal = subtotal - discountAmount + totalTax + (shippingCharges || 0);

    // Tax breakdown (assuming same state - CGST/SGST)
    const taxBreakdown = {
      cgst: { rate: 9, amount: totalTax / 2 },
      sgst: { rate: 9, amount: totalTax / 2 },
      igst: { rate: 0, amount: 0 },
    };

    const invoice = await Invoice.create({
      tenant: req.user.tenant,
      customer,
      billingAddress,
      shippingAddress: shippingAddress || billingAddress,
      items: processedItems,
      subtotal,
      discountType: discountType || 'percentage',
      discountValue: discountValue || 0,
      discountAmount,
      taxBreakdown,
      totalTax,
      shippingCharges: shippingCharges || 0,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
      termsAndConditions,
      notes,
      dueDate,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
exports.updateInvoice = async (req, res, next) => {
  try {
    let invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Don't allow editing paid or cancelled invoices
    if (['paid', 'cancelled'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit ${invoice.status} invoice`,
      });
    }

    invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
exports.updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status, paymentMethod, paymentReference } = req.body;

    const invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    invoice.status = status;

    if (status === 'paid') {
      invoice.paymentDate = new Date();
      invoice.paymentMethod = paymentMethod;
      invoice.paymentReference = paymentReference;

      // Deduct stock for paid invoices
      for (const item of invoice.items) {
        const product = await Product.findOne({ _id: item.product, tenant: req.user.tenant });
        if (product) {
          const previousQuantity = product.quantity;
          product.quantity -= item.quantity;
          await product.save();

          await StockMovement.create({
            tenant: req.user.tenant,
            product: product._id,
            type: 'out',
            quantity: item.quantity,
            previousQuantity,
            newQuantity: product.quantity,
            reason: 'sale',
            reference: invoice.invoiceNumber,
            referenceType: 'invoice',
            performedBy: req.user.id,
          });
        }
      }
    }

    await invoice.save();

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete paid invoice',
      });
    }

    await invoice.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice stats
// @route   GET /api/invoices/stats
exports.getInvoiceStats = async (req, res, next) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const stats = await Invoice.aggregate([
      {
        $match: { tenant: req.user.tenant },
      },
      {
        $facet: {
          total: [
            { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } },
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: currentMonth } } },
            { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$grandTotal' } } },
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

// @desc    Confirm invoice (ready for dispatch)
// @route   PATCH /api/invoices/:id/confirm
exports.confirmInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm invoice with status: ${invoice.status}`,
      });
    }

    // Check stock availability for all items
    for (const item of invoice.items) {
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
    }

    invoice.status = 'confirmed';
    invoice.dispatchStatus = 'picking';
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice confirmed and ready for dispatch',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dispatch invoice (deduct stock and mark as dispatched)
// @route   PATCH /api/invoices/:id/dispatch
exports.dispatchInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (!['confirmed', 'draft'].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispatch invoice with status: ${invoice.status}`,
      });
    }

    if (invoice.stockDeducted) {
      return res.status(400).json({
        success: false,
        message: 'Stock already deducted for this invoice',
      });
    }

    const { trackingInfo } = req.body;

    // Deduct stock for all items
    for (const item of invoice.items) {
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

      // Create stock movement record
      await StockMovement.create({
        tenant: req.user.tenant,
        product: product._id,
        type: 'out',
        quantity: item.quantity,
        previousQuantity,
        newQuantity: product.quantity,
        reason: 'sale',
        reference: invoice.invoiceNumber,
        referenceType: 'invoice',
        referenceId: invoice._id,
        referenceModel: 'Invoice',
        warehouse: product.location?.warehouse || 'Main',
        notes: `Dispatched to ${invoice.customer.name}`,
        performedBy: req.user.id,
      });
    }

    invoice.status = 'dispatched';
    invoice.dispatchStatus = 'dispatched';
    invoice.stockDeducted = true;
    invoice.stockDeductedAt = new Date();
    invoice.dispatchedAt = new Date();
    invoice.dispatchedBy = req.user.id;
    if (trackingInfo) {
      invoice.trackingInfo = trackingInfo;
    }
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice dispatched and stock deducted successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark invoice as delivered
// @route   PATCH /api/invoices/:id/deliver
exports.deliverInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    if (invoice.status !== 'dispatched') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as delivered. Current status: ${invoice.status}`,
      });
    }

    invoice.status = 'delivered';
    invoice.dispatchStatus = 'delivered';
    invoice.deliveredAt = new Date();
    invoice.deliveredBy = req.user.id;
    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Invoice marked as delivered',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate invoice
// @route   POST /api/invoices/:id/duplicate
exports.duplicateInvoice = async (req, res, next) => {
  try {
    const originalInvoice = await Invoice.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const newInvoice = await Invoice.create({
      ...originalInvoice.toObject(),
      _id: undefined,
      invoiceNumber: undefined,
      invoiceDate: new Date(),
      status: 'draft',
      paymentDate: undefined,
      paymentMethod: undefined,
      paymentReference: undefined,
      tenant: req.user.tenant,
      createdBy: req.user.id,
      createdAt: undefined,
      updatedAt: undefined,
    });

    res.status(201).json({
      success: true,
      data: newInvoice,
    });
  } catch (error) {
    next(error);
  }
};
