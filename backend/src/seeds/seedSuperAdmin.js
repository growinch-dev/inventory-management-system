/**
 * Creates the GrowInch platform owner (super_admin) who onboards customers.
 * This user belongs to NO tenant — they manage all organizations.
 *
 * Usage (from backend/):
 *   node src/seeds/seedSuperAdmin.js
 *   SUPERADMIN_EMAIL=you@growinch.com SUPERADMIN_PASSWORD=Strong@123 node src/seeds/seedSuperAdmin.js
 */
const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

const User = require('../models/User');

const EMAIL = (process.env.SUPERADMIN_EMAIL || 'owner@growinch.com').toLowerCase();
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Growinch@2026';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    let user = await User.findOne({ email: EMAIL });
    if (user) {
      user.role = 'super_admin';
      user.isActive = true;
      user.password = PASSWORD; // re-hashed by pre-save
      await user.save();
      console.log(`✅ Updated existing user to super_admin: ${EMAIL}`);
    } else {
      user = await User.create({
        name: 'GrowInch Owner',
        email: EMAIL,
        password: PASSWORD,
        role: 'super_admin',
        isActive: true,
      });
      console.log(`✅ Created super_admin: ${EMAIL}`);
    }

    console.log('-----------------------------------');
    console.log(`Email:    ${EMAIL}`);
    console.log(`Password: ${PASSWORD}`);
    console.log('Use this to log in and open /admin/organizations to onboard customers.');
    console.log('-----------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error.message);
    process.exit(1);
  }
})();
