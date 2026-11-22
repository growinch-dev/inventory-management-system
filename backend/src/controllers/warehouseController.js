const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
exports.getWarehouses = async (req, res) => {
  try {
    const { search, type, isActive, page = 1, limit = 50 } = req.query;

    const query = { tenant: req.user.tenant };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    if (type) {
      query.type = type;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [warehouses, total] = await Promise.all([
      Warehouse.find(query)
        .sort({ isDefault: -1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name'),
      Warehouse.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: warehouses,
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
      message: 'Failed to fetch warehouses',
      error: error.message,
    });
  }
};

// @desc    Get single warehouse
// @route   GET /api/warehouses/:id
// @access  Private
exports.getWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, tenant: req.user.tenant })
      .populate('createdBy', 'name email');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Get product count in this warehouse
    const productCount = await Product.countDocuments({
      'location.warehouse': warehouse.name,
      isActive: true,
      tenant: req.user.tenant,
    });

    // Get total stock value
    const stockValue = await Product.aggregate([
      { $match: { 'location.warehouse': warehouse.name, isActive: true, tenant: req.user.tenant } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$unitPrice', '$quantity'] } } } },
    ]);

    res.json({
      success: true,
      data: {
        ...warehouse.toObject(),
        stats: {
          productCount,
          stockValue: stockValue[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse',
      error: error.message,
    });
  }
};

// @desc    Create warehouse
// @route   POST /api/warehouses
// @access  Private (Admin/Manager)
exports.createWarehouse = async (req, res) => {
  try {
    req.body.tenant = req.user.tenant;
    const warehouseData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const warehouse = await Warehouse.create(warehouseData);

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create warehouse',
      error: error.message,
    });
  }
};

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private (Admin/Manager)
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, tenant: req.user.tenant },
      req.body,
      { new: true, runValidators: true }
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse code already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update warehouse',
      error: error.message,
    });
  }
};

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private (Admin)
exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Check if warehouse has products
    const productCount = await Product.countDocuments({
      'location.warehouse': warehouse.name,
      tenant: req.user.tenant,
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete warehouse with ${productCount} products. Transfer products first.`,
      });
    }

    await warehouse.deleteOne();

    res.json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete warehouse',
      error: error.message,
    });
  }
};

// @desc    Get warehouse statistics
// @route   GET /api/warehouses/:id/stats
// @access  Private
exports.getWarehouseStats = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, tenant: req.user.tenant });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Get category-wise stock
    const categoryStock = await Product.aggregate([
      { $match: { 'location.warehouse': warehouse.name, isActive: true, tenant: req.user.tenant } },
      {
        $group: {
          _id: '$category',
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$unitPrice', '$quantity'] } },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    // Get low stock products
    const lowStockProducts = await Product.find({
      'location.warehouse': warehouse.name,
      isActive: true,
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
      tenant: req.user.tenant,
    })
      .select('name sku quantity reorderLevel')
      .limit(10);

    // Get expiring products (within 90 days)
    const expiringProducts = await Product.find({
      'location.warehouse': warehouse.name,
      isActive: true,
      expiryDate: {
        $exists: true,
        $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        $gte: new Date(),
      },
      tenant: req.user.tenant,
    })
      .select('name sku expiryDate quantity')
      .sort({ expiryDate: 1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        categoryStock,
        lowStockProducts,
        expiringProducts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse stats',
      error: error.message,
    });
  }
};

// @desc    Get all warehouses for dropdown
// @route   GET /api/warehouses/list
// @access  Private
exports.getWarehouseList = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true, tenant: req.user.tenant })
      .select('code name type isDefault')
      .sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse list',
      error: error.message,
    });
  }
};
