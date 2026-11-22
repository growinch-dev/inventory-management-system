const Tender = require('../models/Tender');
const Notification = require('../models/Notification');

// @desc    Get all tenders
// @route   GET /api/tenders
// @access  Private
exports.getTenders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      search,
      fromDate,
      toDate,
      emdStatus,
      sdStatus,
      sortBy = 'submissionDeadline',
      sortOrder = 'asc'
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (category) {
      query.category = category;
    }

    if (emdStatus) {
      query['emd.status'] = emdStatus;
    }

    if (sdStatus) {
      query['securityDeposit.status'] = sdStatus;
    }

    if (search) {
      query.$or = [
        { tenderNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'organization.name': { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (fromDate || toDate) {
      query.submissionDeadline = {};
      if (fromDate) query.submissionDeadline.$gte = new Date(fromDate);
      if (toDate) query.submissionDeadline.$lte = new Date(toDate);
    }

    const total = await Tender.countDocuments(query);
    const tenders = await Tender.find(query)
      .populate('customer', 'name email phone')
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .populate('items.product', 'name sku')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: tenders.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: tenders,
    });
  } catch (error) {
    console.error('Get tenders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single tender
// @route   GET /api/tenders/:id
// @access  Private
exports.getTender = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('customer', 'name email phone gstNumber address')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('items.product', 'name sku unitPrice category')
      .populate('supplyOrders.invoice', 'invoiceNumber grandTotal status')
      .populate('approvals.approvedBy', 'name');

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Get tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create tender
// @route   POST /api/tenders
// @access  Private (Manager+)
exports.createTender = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    req.body.tenant = req.user.tenant;

    const tender = await Tender.create(req.body);

    // Create reminder for submission deadline
    if (tender.submissionDeadline) {
      const reminderDate = new Date(tender.submissionDeadline);
      reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before

      tender.reminders.push({
        type: 'submission',
        date: reminderDate,
        message: `Tender submission deadline in 3 days: ${tender.title}`,
      });
      await tender.save();
    }

    res.status(201).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Create tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update tender
// @route   PUT /api/tenders/:id
// @access  Private (Manager+)
exports.updateTender = async (req, res) => {
  try {
    let tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    tender = await Tender.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    ).populate('customer', 'name email phone')
     .populate('items.product', 'name sku');

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Update tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete tender
// @route   DELETE /api/tenders/:id
// @access  Private (Admin)
exports.deleteTender = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    // Only allow deletion of draft tenders
    if (tender.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft tenders can be deleted',
      });
    }

    await tender.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete tender error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update tender status
// @route   PATCH /api/tenders/:id/status
// @access  Private (Manager+)
exports.updateStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    const oldStatus = tender.status;
    tender.status = status;

    // Add approval record for status change
    tender.approvals.push({
      stage: `Status changed from ${oldStatus} to ${status}`,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: remarks || '',
      status: 'approved',
    });

    await tender.save();

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update EMD status
// @route   PATCH /api/tenders/:id/emd
// @access  Private (Manager+)
exports.updateEmd = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    // Update EMD fields
    Object.keys(req.body).forEach(key => {
      tender.emd[key] = req.body[key];
    });

    await tender.save();

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Update EMD error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update Security Deposit status
// @route   PATCH /api/tenders/:id/security-deposit
// @access  Private (Manager+)
exports.updateSecurityDeposit = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    // Update Security Deposit fields
    Object.keys(req.body).forEach(key => {
      tender.securityDeposit[key] = req.body[key];
    });

    await tender.save();

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Update Security Deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add supply order to tender
// @route   POST /api/tenders/:id/supply
// @access  Private (Manager+)
exports.addSupplyOrder = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    const { invoiceNumber, invoice, deliveryDate, items, challanNumber, remarks } = req.body;

    // Add supply order
    tender.supplyOrders.push({
      invoiceNumber,
      invoice,
      deliveryDate,
      items,
      challanNumber,
      remarks,
      status: 'pending',
    });

    // Update delivered quantities in tender items
    if (items && items.length > 0) {
      items.forEach(supplyItem => {
        const tenderItem = tender.items.find(
          ti => ti.product.toString() === supplyItem.product.toString()
        );
        if (tenderItem) {
          tenderItem.deliveredQuantity = (tenderItem.deliveredQuantity || 0) + supplyItem.quantity;
        }
      });
    }

    await tender.save();

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Add supply order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update supply order status
// @route   PATCH /api/tenders/:id/supply/:supplyId
// @access  Private (Manager+)
exports.updateSupplyOrder = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    const supplyOrder = tender.supplyOrders.id(req.params.supplyId);

    if (!supplyOrder) {
      return res.status(404).json({
        success: false,
        message: 'Supply order not found',
      });
    }

    Object.keys(req.body).forEach(key => {
      supplyOrder[key] = req.body[key];
    });

    await tender.save();

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Update supply order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add payment to tender
// @route   POST /api/tenders/:id/payment
// @access  Private (Manager+)
exports.addPayment = async (req, res) => {
  try {
    const tender = await Tender.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'Tender not found',
      });
    }

    tender.payments.push(req.body);
    await tender.save();

    res.status(200).json({
      success: true,
      data: tender,
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get tender statistics
// @route   GET /api/tenders/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const stats = await Tender.aggregate([
      {
        $match: { tenant: req.user.tenant }
      },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$quotedValue' } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          emdPending: [
            { $match: { 'emd.status': { $in: ['pending', 'submitted'] }, 'emd.amount': { $gt: 0 } } },
            { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$emd.amount' } } }
          ],
          sdPending: [
            { $match: { 'securityDeposit.status': { $in: ['pending', 'submitted'] }, 'securityDeposit.amount': { $gt: 0 } } },
            { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$securityDeposit.amount' } } }
          ],
          upcomingDeadlines: [
            {
              $match: {
                status: { $in: ['draft', 'submitted'] },
                submissionDeadline: {
                  $gte: new Date(),
                  $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
                }
              }
            },
            { $count: 'count' }
          ],
          pendingSupply: [
            {
              $match: {
                status: { $in: ['awarded', 'loa_received', 'po_received', 'in_progress'] }
              }
            },
            { $unwind: '$items' },
            {
              $match: {
                $expr: { $gt: ['$items.quantity', { $ifNull: ['$items.deliveredQuantity', 0] }] }
              }
            },
            { $count: 'count' }
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalTenders: { $sum: 1 },
                totalValue: { $sum: '$quotedValue' },
                wonValue: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['awarded', 'loa_received', 'po_received', 'in_progress', 'completed']] },
                      '$finalValue',
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats[0].byStatus,
        byPriority: stats[0].byPriority,
        emdPending: stats[0].emdPending[0] || { count: 0, totalAmount: 0 },
        sdPending: stats[0].sdPending[0] || { count: 0, totalAmount: 0 },
        upcomingDeadlines: stats[0].upcomingDeadlines[0]?.count || 0,
        pendingSupply: stats[0].pendingSupply[0]?.count || 0,
        totals: stats[0].totals[0] || { totalTenders: 0, totalValue: 0, wonValue: 0 },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get EMD report
// @route   GET /api/tenders/reports/emd
// @access  Private
exports.getEmdReport = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { tenant: req.user.tenant, 'emd.amount': { $gt: 0 } };
    if (status) {
      query['emd.status'] = status;
    }

    const tenders = await Tender.find(query)
      .select('tenderNumber title organization emd submissionDeadline status')
      .sort({ 'emd.validUntil': 1 });

    const summary = await Tender.aggregate([
      { $match: { tenant: req.user.tenant, 'emd.amount': { $gt: 0 } } },
      {
        $group: {
          _id: '$emd.status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$emd.amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        tenders,
        summary,
      },
    });
  } catch (error) {
    console.error('Get EMD report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get Security Deposit report
// @route   GET /api/tenders/reports/security-deposit
// @access  Private
exports.getSecurityDepositReport = async (req, res) => {
  try {
    const { status } = req.query;

    const query = { tenant: req.user.tenant, 'securityDeposit.amount': { $gt: 0 } };
    if (status) {
      query['securityDeposit.status'] = status;
    }

    const tenders = await Tender.find(query)
      .select('tenderNumber title organization securityDeposit status finalValue')
      .sort({ 'securityDeposit.validUntil': 1 });

    const summary = await Tender.aggregate([
      { $match: { tenant: req.user.tenant, 'securityDeposit.amount': { $gt: 0 } } },
      {
        $group: {
          _id: '$securityDeposit.status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$securityDeposit.amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        tenders,
        summary,
      },
    });
  } catch (error) {
    console.error('Get Security Deposit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get pending supply report
// @route   GET /api/tenders/reports/pending-supply
// @access  Private
exports.getPendingSupplyReport = async (req, res) => {
  try {
    const tenders = await Tender.find({
      tenant: req.user.tenant,
      status: { $in: ['awarded', 'loa_received', 'po_received', 'in_progress'] }
    })
      .populate('items.product', 'name sku')
      .select('tenderNumber title organization items status finalValue');

    // Filter to only include tenders with pending items
    const tendersWithPending = tenders.filter(tender =>
      tender.items.some(item =>
        (item.quantity || 0) > (item.deliveredQuantity || 0)
      )
    );

    res.status(200).json({
      success: true,
      data: tendersWithPending,
    });
  } catch (error) {
    console.error('Get pending supply report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
