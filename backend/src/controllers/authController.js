const User = require('../models/User');
const Tenant = require('../models/Tenant');

// @desc    Register new organization (tenant) with admin user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, companyName, phone } = req.body;

    // Check if user exists with this email (in any tenant)
    const existingUser = await User.findOne({ email, isOwner: true });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create tenant first
    const tenant = await Tenant.create({
      name: companyName || `${name}'s Organization`,
      email: email,
      phone: phone,
      owner: null, // Will update after creating user
    });

    // Create admin user for this tenant
    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      tenant: tenant._id,
      isOwner: true,
    });

    // Update tenant with owner reference
    tenant.owner = user._id;
    await tenant.save();

    // Update tenant usage
    await tenant.incrementUsage('user');

    sendTokenResponse(user, 201, res, tenant);
  } catch (error) {
    next(error);
  }
};

// @desc    Register user within existing tenant (invite flow)
// @route   POST /api/auth/register-user
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    // Find user by invite token
    const invitedUser = await User.findOne({
      inviteToken,
      inviteTokenExpire: { $gt: Date.now() },
    });

    if (!invitedUser) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invite token',
      });
    }

    // Update user with password and clear invite token
    invitedUser.name = name;
    invitedUser.password = password;
    invitedUser.inviteToken = undefined;
    invitedUser.inviteTokenExpire = undefined;
    invitedUser.isActive = true;
    await invitedUser.save();

    sendTokenResponse(invitedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user (get owner accounts first, or any active account)
    const user = await User.findOne({
      email,
      isActive: true,
    }).select('+password').sort({ isOwner: -1 });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.',
      });
    }

    // Get tenant info
    let tenant = null;
    if (user.tenant) {
      tenant = await Tenant.findById(user.tenant);
      if (tenant && !tenant.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your organization account has been deactivated.',
        });
      }
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, tenant);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Get tenant info
    let tenant = null;
    if (user.tenant) {
      tenant = await Tenant.findById(user.tenant).select(
        'name slug email phone address gstNumber panNumber bankDetails businessType subscription limits usage settings onboarding'
      );
    }

    res.status(200).json({
      success: true,
      data: user,
      tenant: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, tenant = null) => {
  const token = user.getSignedJwtToken();

  const response = {
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isOwner: user.isOwner,
      permissions: user.permissions || [],
    },
  };

  if (tenant) {
    response.tenant = {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      subscription: {
        plan: tenant.subscription.plan,
        status: tenant.subscription.status,
        trialEndsAt: tenant.subscription.trialEndsAt,
      },
      limits: tenant.limits,
      usage: tenant.usage,
      features: tenant.features,
    };
  }

  res.status(statusCode).json(response);
};
