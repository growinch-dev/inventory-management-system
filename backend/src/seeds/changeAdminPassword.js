const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Same DNS override as config/db.js, so mongodb+srv:// SRV lookups resolve
// on machines where Node defaults to a DNS server that refuses them.
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const User = require('../models/User');

const NEW_PASSWORD = 'growinch@2026';
const ADMIN_EMAIL = 'admin@growinch.com';

const changeAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Need the password field (select:false) so .save() sees the doc correctly
    const admin = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

    if (!admin) {
      console.error(`❌ No user found with email: ${ADMIN_EMAIL}`);
      process.exit(1);
    }

    admin.password = NEW_PASSWORD; // pre('save') hook hashes it
    await admin.save();

    console.log('✅ Admin password updated successfully!');
    console.log('-----------------------------------');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${NEW_PASSWORD}`);
    console.log('-----------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error.message);
    process.exit(1);
  }
};

changeAdminPassword();
