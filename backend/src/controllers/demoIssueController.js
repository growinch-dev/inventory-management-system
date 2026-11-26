const DemoIssue = require('../models/DemoIssue');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');

// @desc    Get all demo issues
// @route   GET /api/demo-issues
// @access  Private
exports.getDemoIssues = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      purpose,
      search,
      fromDate,
      toDate,
      overdue,
      sortBy = 'expectedReturnDate',
      sortOrder = 'asc'
    } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) {
      query.status = status;
    }

    if (purpose) {
      query.purpose = purpose;
    }

    if (search) {
      query.$or = [
        { issueNumber: { $regex: search, $options: 'i' } },
        { 'hospital.name': { $regex: search, $options: 'i' } },
        { 'contactPerson.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (fromDate || toDate) {
      query.issueDate = {};
      if (fromDate) query.issueDate.$gte = new Date(fromDate);
      if (toDate) query.issueDate.$lte = new Date(toDate);
    }

    if (overdue === 'true') {
      query.status = { $nin: ['returned', 'cancelled'] };
      query.expectedReturnDate = { $lt: new Date() };
    }

    const total = await DemoIssue.countDocuments(query);
    const demoIssues = await DemoIssue.find(query)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .populate('issuedBy', 'name')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: demoIssues.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: demoIssues,
    });
  } catch (error) {
    console.error('Get demo issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single demo issue
// @route   GET /api/demo-issues/:id
// @access  Private
exports.getDemoIssue = async (req, res) => {
  try {
    const demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('customer', 'name email phone gstNumber address')
      .populate('items.product', 'name sku unitPrice category images')
      .populate('relatedTender', 'tenderNumber title')
      .populate('createdBy', 'name email')
      .populate('issuedBy', 'name email')
      .populate('dispatchInfo.dispatchedBy', 'name')
      .populate('returnInfo.receivedBy', 'name');

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    res.status(200).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Get demo issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create demo issue
// @route   POST /api/demo-issues
// @access  Private (Manager+)
exports.createDemoIssue = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    req.body.tenant = req.user.tenant;

    const demoIssue = await DemoIssue.create(req.body);

    res.status(201).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Create demo issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update demo issue
// @route   PUT /api/demo-issues/:id
// @access  Private (Manager+)
exports.updateDemoIssue = async (req, res) => {
  try {
    let demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    demoIssue = await DemoIssue.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    ).populate('items.product', 'name sku');

    res.status(200).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Update demo issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete demo issue
// @route   DELETE /api/demo-issues/:id
// @access  Private (Admin)
exports.deleteDemoIssue = async (req, res) => {
  try {
    const demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    // Only allow deletion of draft issues
    if (demoIssue.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft demo issues can be deleted',
      });
    }

    await demoIssue.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete demo issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Issue demo (dispatch)
// @route   PATCH /api/demo-issues/:id/issue
// @access  Private (Manager+)
exports.issueDemoItems = async (req, res) => {
  try {
    const demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('items.product');

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    if (demoIssue.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only issue draft demo issues',
      });
    }

    // Deduct stock for each item
    for (const item of demoIssue.items) {
      const product = await Product.findOne({ _id: item.product._id || item.product, tenant: req.user.tenant });
      if (product) {
        const previousQty = product.quantity;
        product.quantity -= item.quantity;
        await product.save();

        // Create stock movement
        await StockMovement.create({
          product: product._id,
          type: 'out',
          quantity: item.quantity,
          previousQuantity: previousQty,
          newQuantity: product.quantity,
          reason: 'demo',
          reference: `Demo Issue: ${demoIssue.issueNumber}`,
          referenceType: 'demo_issue',
          referenceModel: 'DemoIssue',
          referenceId: demoIssue._id,
          notes: `Demo issued to ${demoIssue.hospital.name}`,
          performedBy: req.user._id,
          tenant: req.user.tenant,
        });
      }
    }

    // Update demo issue
    demoIssue.status = 'issued';
    demoIssue.issuedBy = req.user._id;
    if (req.body.dispatchInfo) {
      demoIssue.dispatchInfo = {
        ...req.body.dispatchInfo,
        dispatchDate: new Date(),
        dispatchedBy: req.user._id,
      };
    }

    await demoIssue.save();

    res.status(200).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Issue demo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Return demo items
// @route   PATCH /api/demo-issues/:id/return
// @access  Private
exports.returnDemoItems = async (req, res) => {
  try {
    const { items, returnInfo } = req.body;

    const demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    if (['returned', 'cancelled', 'draft'].includes(demoIssue.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot return items for this demo issue',
      });
    }

    // Update each item's returned quantity
    for (const returnItem of items) {
      const demoItem = demoIssue.items.id(returnItem.itemId);
      if (demoItem) {
        const returnQty = parseInt(returnItem.returnedQuantity) || 0;
        demoItem.returnedQuantity = (demoItem.returnedQuantity || 0) + returnQty;
        demoItem.condition = returnItem.condition || 'good';
        demoItem.conditionNotes = returnItem.conditionNotes;
        demoItem.returnDate = new Date();

        // Add stock back for returned items in good condition
        if (returnItem.condition === 'good' || returnItem.condition === 'acceptable') {
          const product = await Product.findOne({ _id: demoItem.product, tenant: req.user.tenant });
          if (product) {
            const previousQty = product.quantity;
            product.quantity += returnQty;
            await product.save();

            // Create stock movement
            await StockMovement.create({
              product: product._id,
              type: 'in',
              quantity: returnQty,
              previousQuantity: previousQty,
              newQuantity: product.quantity,
              reason: 'return',
              reference: `Demo Return: ${demoIssue.issueNumber}`,
              referenceType: 'demo_issue',
              referenceModel: 'DemoIssue',
              referenceId: demoIssue._id,
              notes: `Returned from demo at ${demoIssue.hospital.name}`,
              performedBy: req.user._id,
              tenant: req.user.tenant,
            });
          }
        }
      }
    }

    // Update return info
    if (returnInfo) {
      demoIssue.returnInfo = {
        ...returnInfo,
        receivedDate: new Date(),
        receivedBy: req.user._id,
      };
    }

    await demoIssue.save();

    res.status(200).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Return demo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Extend return date
// @route   PATCH /api/demo-issues/:id/extend
// @access  Private (Manager+)
exports.extendReturnDate = async (req, res) => {
  try {
    const { newReturnDate, reason } = req.body;

    const demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    if (['returned', 'cancelled'].includes(demoIssue.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend return date for this demo issue',
      });
    }

    const oldDate = demoIssue.expectedReturnDate;
    demoIssue.expectedReturnDate = new Date(newReturnDate);

    // Add note about extension
    demoIssue.internalNotes = (demoIssue.internalNotes || '') +
      `\n[${new Date().toISOString()}] Return date extended from ${oldDate.toISOString().split('T')[0]} to ${newReturnDate}. Reason: ${reason || 'Not specified'}`;

    // Update status if it was overdue
    if (demoIssue.status === 'overdue' && new Date(newReturnDate) > new Date()) {
      demoIssue.status = demoIssue.items.some(i => i.returnedQuantity > 0) ? 'partial_return' : 'issued';
    }

    await demoIssue.save();

    res.status(200).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Extend return date error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get demo issue statistics
// @route   GET /api/demo-issues/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const stats = await DemoIssue.aggregate([
      {
        $match: { tenant: req.user.tenant }
      },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPurpose: [
            { $group: { _id: '$purpose', count: { $sum: 1 } } }
          ],
          overdue: [
            {
              $match: {
                status: { $nin: ['returned', 'cancelled'] },
                expectedReturnDate: { $lt: new Date() }
              }
            },
            { $count: 'count' }
          ],
          dueSoon: [
            {
              $match: {
                status: { $nin: ['returned', 'cancelled'] },
                expectedReturnDate: {
                  $gte: new Date(),
                  $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
              }
            },
            { $count: 'count' }
          ],
          conversionStats: [
            {
              $match: { status: 'returned' }
            },
            { $group: { _id: '$conversionStatus', count: { $sum: 1 } } }
          ],
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [
                      { $in: ['$status', ['issued', 'partial_return', 'overdue']] },
                      1,
                      0
                    ]
                  }
                },
                returned: {
                  $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
                },
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
        byPurpose: stats[0].byPurpose,
        overdue: stats[0].overdue[0]?.count || 0,
        dueSoon: stats[0].dueSoon[0]?.count || 0,
        conversionStats: stats[0].conversionStats,
        totals: stats[0].totals[0] || { total: 0, active: 0, returned: 0 },
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

// @desc    Get overdue demo issues
// @route   GET /api/demo-issues/overdue
// @access  Private
exports.getOverdue = async (req, res) => {
  try {
    const overdueIssues = await DemoIssue.find({
      tenant: req.user.tenant,
      status: { $nin: ['returned', 'cancelled'] },
      expectedReturnDate: { $lt: new Date() }
    })
      .populate('items.product', 'name sku')
      .populate('customer', 'name phone')
      .sort({ expectedReturnDate: 1 });

    res.status(200).json({
      success: true,
      count: overdueIssues.length,
      data: overdueIssues,
    });
  } catch (error) {
    console.error('Get overdue error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update follow-up status
// @route   PATCH /api/demo-issues/:id/follow-up
// @access  Private
exports.updateFollowUp = async (req, res) => {
  try {
    const { followUpDate, followUpNotes, conversionStatus } = req.body;

    const demoIssue = await DemoIssue.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!demoIssue) {
      return res.status(404).json({
        success: false,
        message: 'Demo issue not found',
      });
    }

    if (followUpDate) demoIssue.followUpDate = followUpDate;
    if (followUpNotes) demoIssue.followUpNotes = followUpNotes;
    if (conversionStatus) demoIssue.conversionStatus = conversionStatus;

    await demoIssue.save();

    res.status(200).json({
      success: true,
      data: demoIssue,
    });
  } catch (error) {
    console.error('Update follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
