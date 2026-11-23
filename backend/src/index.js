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

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Product batches sub-route
const { productBatchRouter } = require('./routes/batches');
app.use('/api/products/:productId/batches', productBatchRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

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
