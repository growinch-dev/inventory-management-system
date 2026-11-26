const SalaryPayment = require('../models/SalaryPayment');

// @desc    List salary payments (+ total)   @route GET /api/salaries
exports.getSalaries = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query = { tenant: req.user.tenant };
    if (search) query.employeeName = { $regex: search, $options: 'i' };

    const [items, total, totals] = await Promise.all([
      SalaryPayment.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      SalaryPayment.countDocuments(query),
      SalaryPayment.aggregate([
        { $match: { tenant: req.user.tenant } },
        { $group: { _id: null, sum: { $sum: '$amount' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      totalAmount: totals[0]?.sum || 0,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create salary payment   @route POST /api/salaries
exports.createSalary = async (req, res, next) => {
  try {
    const salary = await SalaryPayment.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: salary });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete salary payment   @route DELETE /api/salaries/:id
exports.deleteSalary = async (req, res, next) => {
  try {
    const salary = await SalaryPayment.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!salary) return res.status(404).json({ success: false, message: 'Salary payment not found' });
    res.status(200).json({ success: true, message: 'Salary payment deleted' });
  } catch (error) {
    next(error);
  }
};
