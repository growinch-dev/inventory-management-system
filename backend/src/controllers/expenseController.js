const Expense = require('../models/Expense');

// Fields a client may set. Totals/number are computed by the model.
const EDITABLE = [
  'expenseDate', 'category', 'description', 'amount', 'taxAmount', 'taxRate', 'vendor', 'vendorRef',
  'paymentMode', 'paymentStatus', 'paymentDate', 'paymentReference', 'billNumber', 'billDate',
  'department', 'notes', 'tags',
];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

// @desc    List expenses (+ totals)   @route GET /api/expenses
exports.getExpenses = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, category, startDate, endDate } = req.query;
    const query = { tenant: req.user.tenant, isActive: true };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { expenseNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [items, total, totals] = await Promise.all([
      Expense.find(query).sort({ expenseDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: { tenant: req.user.tenant, isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            thisMonth: { $sum: { $cond: [{ $gte: ['$expenseDate', startOfMonth] }, '$totalAmount', 0] } },
            pending: { $sum: { $cond: [{ $in: ['$paymentStatus', ['pending', 'partially_paid']] }, '$pendingAmount', 0] } },
          },
        },
      ]),
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      totals: totals[0] || { total: 0, thisMonth: 0, pending: 0 },
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create expense   @route POST /api/expenses
exports.createExpense = async (req, res, next) => {
  try {
    const data = pick(req.body);
    const expense = await Expense.create({
      ...data,
      totalAmount: Number(data.amount || 0) + Number(data.taxAmount || 0),
      tenant: req.user.tenant,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense   @route PUT /api/expenses/:id
exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, tenant: req.user.tenant, isActive: true });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    Object.assign(expense, pick(req.body), { updatedBy: req.user.id });
    expense.totalAmount = Number(expense.amount || 0) + Number(expense.taxAmount || 0);
    await expense.save();
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete (deactivate) expense   @route DELETE /api/expenses/:id
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      { isActive: false, updatedBy: req.user.id },
      { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
