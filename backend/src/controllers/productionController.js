const Production = require('../models/Production');

// Map friendly shift values coming from the UI to the model's enum.
const SHIFT_MAP = {
  day: 'morning',
  morning: 'morning',
  general: 'afternoon',
  afternoon: 'afternoon',
  night: 'night',
};

// Map UI status values to the model's enum.
const STATUS_MAP = {
  planned: 'planned',
  inprogress: 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

// @desc    Get all production entries
// @route   GET /api/production
exports.getProductions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, sortBy = 'productionDate', order = 'desc' } = req.query;

    const query = { tenant: req.user.tenant };

    if (status) {
      query.status = STATUS_MAP[String(status).toLowerCase()] || status;
    }

    if (search) {
      query.$or = [
        { productionNumber: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Production.countDocuments(query);
    const productions = await Production.find(query)
      .populate('product', 'name sku bottleSize')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: productions.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: productions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single production entry
// @route   GET /api/production/:id
exports.getProduction = async (req, res, next) => {
  try {
    const production = await Production.findOne({
      _id: req.params.id,
      tenant: req.user.tenant,
    })
      .populate('product', 'name sku bottleSize')
      .populate('materialsConsumed.material', 'name sku unit')
      .populate('createdBy', 'name');

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production entry not found',
      });
    }

    res.status(200).json({
      success: true,
      data: production,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create production entry
// @route   POST /api/production
exports.createProduction = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Accept both model-style and UI-style field names.
    const shiftKey = String(body.shift || '').toLowerCase();
    const materials = (body.materialsConsumed || []).map((m) => ({
      material: m.material || m.materialId,
      quantityUsed: Number(m.quantityUsed ?? m.quantity) || 0,
      unit: m.unit || 'PCS',
      cost: Number(m.cost) || 0,
    })).filter((m) => m.material);

    const payload = {
      tenant: req.user.tenant,
      createdBy: req.user.id,
      productionDate: body.productionDate || Date.now(),
      shift: SHIFT_MAP[shiftKey] || 'morning',
      product: body.product || body.productId,
      // batchNumber is required by the model; auto-generate when left blank.
      batchNumber: body.batchNumber?.trim() || `AUTO-${Date.now()}`,
      plannedQuantity: Number(body.plannedQuantity) || 0,
      producedQuantity: Number(body.producedQuantity) || 0,
      rejectedQuantity: Number(body.rejectedQuantity) || 0,
      materialsConsumed: materials,
      notes: body.notes || body.remarks,
      status: STATUS_MAP[String(body.status || '').toLowerCase()] || 'completed',
    };

    if (!payload.product) {
      return res.status(400).json({
        success: false,
        message: 'Product is required',
      });
    }

    // goodQuantity is derived in the model's pre-save hook.
    const production = await Production.create(payload);

    res.status(201).json({
      success: true,
      data: production,
    });
  } catch (error) {
    next(error);
  }
};
