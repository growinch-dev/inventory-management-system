const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

// @desc    Get all payments
// @route   GET /api/payments
exports.getPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      paymentType,
      status,
      paymentMethod,
      partyType,
      partyId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (paymentType) query.paymentType = paymentType;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (partyType) query['party.type'] = partyType;
    if (partyId) query['party.id'] = partyId;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { paymentNumber: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { 'party.name': { $regex: search, $options: 'i' } },
        { transactionReference: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('createdBy', 'name')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment (record payment received)
// @route   POST /api/payments
exports.createPayment = async (req, res, next) => {
  try {
    const {
      referenceType,
      referenceId,
      amount,
      paymentMethod,
      paymentDate,
      ...otherData
    } = req.body;

    let invoiceAmount = 0;
    let previouslyPaid = 0;
    let referenceNumber = '';
    let partyInfo = req.body.party;

    // If linked to an invoice, get invoice details
    if (referenceType === 'invoice' && referenceId) {
      const invoice = await Invoice.findOne({ _id: referenceId, tenant: req.user.tenant });
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
      }

      invoiceAmount = invoice.grandTotal;
      referenceNumber = invoice.invoiceNumber;

      // Calculate previously paid from existing payments
      const existingPayments = await Payment.find({
        tenant: req.user.tenant,
        referenceType: 'invoice',
        referenceId: invoice._id,
        status: 'completed',
      });
      previouslyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

      // Check if amount exceeds balance
      const balance = invoiceAmount - previouslyPaid;
      if (amount > balance) {
        return res.status(400).json({
          success: false,
          message: `Amount exceeds outstanding balance of ₹${balance.toLocaleString()}`,
        });
      }

      // Set party info from invoice if not provided
      if (!partyInfo) {
        partyInfo = {
          type: 'customer',
          name: invoice.customer.name,
          email: invoice.customer.email,
          phone: invoice.customer.phone,
        };
      }
    }

    const balanceAfterPayment = invoiceAmount - previouslyPaid - amount;

    const payment = await Payment.create({
      tenant: req.user.tenant,
      referenceType,
      referenceId,
      referenceModel: referenceType === 'invoice' ? 'Invoice' : undefined,
      referenceNumber,
      party: partyInfo,
      paymentType: 'received',
      paymentDate: paymentDate || new Date(),
      amount,
      paymentMethod,
      invoiceAmount,
      previouslyPaid,
      balanceAfterPayment,
      ...otherData,
      createdBy: req.user.id,
    });

    // Update invoice status if fully paid
    if (referenceType === 'invoice' && referenceId && balanceAfterPayment <= 0) {
      await Invoice.findOneAndUpdate(
        { _id: referenceId, tenant: req.user.tenant },
        {
          status: 'paid',
          paymentDate: new Date(),
          paymentMethod,
        }
      );
    }

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
exports.updatePayment = async (req, res, next) => {
  try {
    let payment = await Payment.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit completed payment. Create a refund instead.',
      });
    }

    payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment (void)
// @route   DELETE /api/payments/:id
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Instead of deleting, mark as cancelled
    payment.status = 'cancelled';
    await payment.save();

    // Recalculate invoice status if linked
    if (payment.referenceType === 'invoice' && payment.referenceId) {
      const remainingPayments = await Payment.find({
        tenant: req.user.tenant,
        referenceType: 'invoice',
        referenceId: payment.referenceId,
        status: 'completed',
      });
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);

      const invoice = await Invoice.findOne({ _id: payment.referenceId, tenant: req.user.tenant });
      if (invoice && totalPaid < invoice.grandTotal) {
        invoice.status = 'delivered';  // Or appropriate status
        await invoice.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payments for an invoice
// @route   GET /api/payments/invoice/:invoiceId
exports.getInvoicePayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      tenant: req.user.tenant,
      referenceType: 'invoice',
      referenceId: req.params.invoiceId,
    })
      .populate('createdBy', 'name')
      .sort({ paymentDate: -1 });

    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, tenant: req.user.tenant });
    const totalPaid = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        payments,
        summary: {
          invoiceAmount: invoice?.grandTotal || 0,
          totalPaid,
          balance: (invoice?.grandTotal || 0) - totalPaid,
          paymentCount: payments.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payments for a customer
// @route   GET /api/payments/customer/:customerId
exports.getCustomerPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      tenant: req.user.tenant,
      'party.type': 'customer',
      'party.id': req.params.customerId,
    })
      .sort({ paymentDate: -1 });

    // Calculate totals
    const totalReceived = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalReceived,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment statistics
// @route   GET /api/payments/stats
exports.getPaymentStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const stats = await Payment.aggregate([
      {
        $match: { tenant: req.user.tenant },
      },
      {
        $facet: {
          todayReceived: [
            {
              $match: {
                paymentType: 'received',
                status: 'completed',
                paymentDate: { $gte: today },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ],
          thisMonthReceived: [
            {
              $match: {
                paymentType: 'received',
                status: 'completed',
                paymentDate: { $gte: thisMonth },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ],
          lastMonthReceived: [
            {
              $match: {
                paymentType: 'received',
                status: 'completed',
                paymentDate: { $gte: lastMonth, $lte: lastMonthEnd },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ],
          byMethod: [
            {
              $match: {
                status: 'completed',
                paymentDate: { $gte: thisMonth },
              },
            },
            { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ],
          pendingCheques: [
            {
              $match: {
                paymentMethod: 'cheque',
                'chequeDetails.status': 'pending',
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
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

// @desc    Get outstanding dues report
// @route   GET /api/payments/outstanding
exports.getOutstandingDues = async (req, res, next) => {
  try {
    // Get all unpaid or partially paid invoices
    const invoices = await Invoice.find({
      tenant: req.user.tenant,
      status: { $nin: ['paid', 'cancelled', 'draft'] },
    }).sort({ dueDate: 1 });

    const outstandingList = [];

    for (const invoice of invoices) {
      const payments = await Payment.find({
        tenant: req.user.tenant,
        referenceType: 'invoice',
        referenceId: invoice._id,
        status: 'completed',
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = invoice.grandTotal - totalPaid;

      if (balance > 0) {
        const now = new Date();
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = invoice.dueDate
          ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24))
          : 0;

        outstandingList.push({
          invoice: {
            _id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
          },
          customer: invoice.customer,
          invoiceAmount: invoice.grandTotal,
          totalPaid,
          balance,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
          isOverdue: daysOverdue > 0,
        });
      }
    }

    // Calculate totals
    const totalOutstanding = outstandingList.reduce((sum, item) => sum + item.balance, 0);
    const overdueAmount = outstandingList
      .filter(item => item.isOverdue)
      .reduce((sum, item) => sum + item.balance, 0);

    res.status(200).json({
      success: true,
      count: outstandingList.length,
      summary: {
        totalOutstanding,
        overdueAmount,
        overdueCount: outstandingList.filter(item => item.isOverdue).length,
      },
      data: outstandingList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cheque status
// @route   PATCH /api/payments/:id/cheque-status
exports.updateChequeStatus = async (req, res, next) => {
  try {
    const { status, clearedDate, bouncedDate, bounceReason } = req.body;

    const payment = await Payment.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.paymentMethod !== 'cheque') {
      return res.status(400).json({
        success: false,
        message: 'This payment is not a cheque payment',
      });
    }

    payment.chequeDetails.status = status;
    if (status === 'cleared') {
      payment.chequeDetails.clearedDate = clearedDate || new Date();
      payment.status = 'completed';
    } else if (status === 'bounced') {
      payment.chequeDetails.bouncedDate = bouncedDate || new Date();
      payment.chequeDetails.bounceReason = bounceReason;
      payment.status = 'failed';

      // Revert invoice status if it was marked as paid
      if (payment.referenceType === 'invoice' && payment.referenceId) {
        const invoice = await Invoice.findOne({ _id: payment.referenceId, tenant: req.user.tenant });
        if (invoice && invoice.status === 'paid') {
          invoice.status = 'delivered';
          await invoice.save();
        }
      }
    }

    await payment.save();

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};
