const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { runAlertChecks } = require('./services/notificationService');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable CORS — FRONTEND_URL may be a comma-separated list of allowed origins.
// In single-server mode (API serves the built client, local or online) the
// browser makes same-origin requests, so CORS is not involved at all. Set
// CORS_ORIGIN=* to allow any origin (useful for LAN access during setup).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5175')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Same-origin / non-browser clients (curl, server-to-server) send no Origin.
    if (!origin || process.env.CORS_ORIGIN === '*' || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/warehouses', require('./routes/warehouseRoutes'));
app.use('/api/transfers', require('./routes/transferRoutes'));
app.use('/api/movements', require('./routes/movementRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/tenders', require('./routes/tenders'));
app.use('/api/demo-issues', require('./routes/demoIssues'));
app.use('/api/delivery-challans', require('./routes/deliveryChallans'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/production', require('./routes/production'));
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/salaries', require('./routes/salaries'));

// Product batches sub-route
const { productBatchRouter } = require('./routes/batches');
app.use('/api/products/:productId/batches', productBatchRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Serve the built React client (single-server deployment: local or online).
// Enabled when SERVE_CLIENT=true or a build exists at ../frontend/dist.
const clientDist = path.resolve(__dirname, '../../frontend/dist');
if (process.env.SERVE_CLIENT === 'true' || fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for any non-API GET so client-side routing works.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Schedule notification alert checks
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('⏰ Running scheduled alert checks...');
    runAlertChecks();
  });

  // Also run every 6 hours for critical alerts
  cron.schedule('0 */6 * * *', () => {
    console.log('⏰ Running periodic alert checks...');
    runAlertChecks();
  });

  // Run initial check on server start (after 30 seconds to allow DB connection)
  setTimeout(() => {
    console.log('🚀 Running initial alert check...');
    runAlertChecks();
  }, 30000);
});
