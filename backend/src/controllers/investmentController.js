const Investment = require('../models/Investment');

// @desc    List investments (+ total)   @route GET /api/investments
exports.getInvestments = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const query = { tenant: req.user.tenant };
    if (search) query.investorName = { $regex: search, $options: 'i' };

    const [items, total, totals] = await Promise.all([
      Investment.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Investment.countDocuments(query),
      Investment.aggregate([
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

// @desc    Create investment   @route POST /api/investments
exports.createInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.create({
      ...req.body,
      tenant: req.user.tenant,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: investment });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete investment   @route DELETE /api/investments/:id
exports.deleteInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.findOneAndDelete({ _id: req.params.id, tenant: req.user.tenant });
    if (!investment) return res.status(404).json({ success: false, message: 'Investment not found' });
    res.status(200).json({ success: true, message: 'Investment deleted' });
  } catch (error) {
    next(error);
  }
};
