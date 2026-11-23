const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@growinch.com' });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@growinch.com');
      console.log('Password: Admin@123');
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@growinch.com',
      password: 'Admin@123',
      role: 'admin',
      isActive: true,
    });

    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('Email: admin@growinch.com');
    console.log('Password: Admin@123');
    console.log('Role: admin');
    console.log('-----------------------------------');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
