const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
const DemoIssue = require('../models/DemoIssue');
const Tender = require('../models/Tender');

// Email transporter configuration
const createTransporter = () => {
  // Use environment variables for email config
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to console logging in development
  return {
    sendMail: async (options) => {
      console.log('📧 Email (dev mode):', {
        to: options.to,
        subject: options.subject,
        preview: options.text?.substring(0, 100) + '...',
      });
      return { messageId: 'dev-' + Date.now() };
    },
  };
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  low_stock: (data) => ({
    subject: `⚠️ Low Stock Alert: ${data.productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #F97316; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">⚠️ Low Stock Alert</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">${data.productName}</h2>
          <p style="color: #666;">SKU: ${data.sku}</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Current Stock:</strong></td>
                <td style="color: ${data.currentStock === 0 ? '#EF4444' : '#F97316'}; font-weight: bold;">
                  ${data.currentStock} units
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Reorder Level:</strong></td>
                <td>${data.reorderLevel} units</td>
              </tr>
            </table>
          </div>
          <p style="color: #666;">Please reorder this product to avoid stockouts.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/products/${data.productId}"
             style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
            View Product
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `Low Stock Alert: ${data.productName} (SKU: ${data.sku}) - Current Stock: ${data.currentStock}, Reorder Level: ${data.reorderLevel}`,
  }),

  expiry_alert: (data) => ({
    subject: `🕐 Expiry Alert: ${data.productName} expires in ${data.daysUntilExpiry} days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #F97316; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🕐 Expiry Alert</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">${data.productName}</h2>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Batch Number:</strong></td>
                <td>${data.batchNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Expiry Date:</strong></td>
                <td style="color: #F97316; font-weight: bold;">
                  ${new Date(data.expiryDate).toLocaleDateString('en-IN')}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Days Until Expiry:</strong></td>
                <td style="color: ${data.daysUntilExpiry <= 7 ? '#EF4444' : '#F97316'}; font-weight: bold;">
                  ${data.daysUntilExpiry} days
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                <td>${data.quantity} units</td>
              </tr>
            </table>
          </div>
          <p style="color: #666;">Please take action on this batch before it expires.</p>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `Expiry Alert: ${data.productName} - Batch ${data.batchNumber} expires in ${data.daysUntilExpiry} days (${data.quantity} units)`,
  }),

  expired: (data) => ({
    subject: `🚨 EXPIRED: ${data.productName} - Batch ${data.batchNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #EF4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚨 Product Expired</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">${data.productName}</h2>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #EF4444;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Batch Number:</strong></td>
                <td>${data.batchNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Expired On:</strong></td>
                <td style="color: #EF4444; font-weight: bold;">
                  ${new Date(data.expiryDate).toLocaleDateString('en-IN')}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Quantity:</strong></td>
                <td>${data.quantity} units</td>
              </tr>
            </table>
          </div>
          <p style="color: #EF4444; font-weight: bold;">
            ⚠️ This batch should be quarantined immediately and not used.
          </p>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `EXPIRED: ${data.productName} - Batch ${data.batchNumber} has expired! Quantity: ${data.quantity} units. Quarantine immediately.`,
  }),

  out_of_stock: (data) => ({
    subject: `🚫 Out of Stock: ${data.productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #EF4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🚫 Out of Stock</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">${data.productName}</h2>
          <p style="color: #666;">SKU: ${data.sku}</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #EF4444;">
            <p style="color: #EF4444; font-weight: bold; margin: 0;">
              This product is now OUT OF STOCK
            </p>
          </div>
          <p style="color: #666;">Immediate reorder recommended.</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/purchase-orders/new"
             style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
            Create Purchase Order
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `OUT OF STOCK: ${data.productName} (SKU: ${data.sku}) is now out of stock. Immediate reorder recommended.`,
  }),

  payment_due: (data) => ({
    subject: `💰 Payment Due: Invoice ${data.invoiceNumber} - ${data.daysMessage}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${data.isOverdue ? '#EF4444' : '#F97316'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">💰 ${data.isOverdue ? 'Payment Overdue' : 'Payment Due Soon'}</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Invoice: ${data.invoiceNumber}</h2>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Customer:</strong></td>
                <td>${data.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Amount:</strong></td>
                <td style="color: #6366F1; font-weight: bold;">₹${data.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
                <td style="color: ${data.isOverdue ? '#EF4444' : '#F97316'}; font-weight: bold;">
                  ${new Date(data.dueDate).toLocaleDateString('en-IN')}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Status:</strong></td>
                <td style="color: ${data.isOverdue ? '#EF4444' : '#F97316'}; font-weight: bold;">
                  ${data.daysMessage}
                </td>
              </tr>
            </table>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/invoices/${data.invoiceId}"
             style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
            View Invoice
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `Payment ${data.isOverdue ? 'Overdue' : 'Due'}: Invoice ${data.invoiceNumber} - Customer: ${data.customerName}, Amount: ₹${data.amount}, Due: ${data.daysMessage}`,
  }),

  demo_return_due: (data) => ({
    subject: `🔄 Demo Return ${data.isOverdue ? 'Overdue' : 'Due'}: ${data.issueNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${data.isOverdue ? '#EF4444' : '#F97316'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">🔄 Demo Return ${data.isOverdue ? 'Overdue' : 'Reminder'}</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Issue: ${data.issueNumber}</h2>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0;"><strong>Hospital:</strong></td>
                <td>${data.hospitalName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Items:</strong></td>
                <td>${data.itemCount} items</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Return Due:</strong></td>
                <td style="color: ${data.isOverdue ? '#EF4444' : '#F97316'}; font-weight: bold;">
                  ${new Date(data.returnDate).toLocaleDateString('en-IN')}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Status:</strong></td>
                <td style="color: ${data.isOverdue ? '#EF4444' : '#F97316'}; font-weight: bold;">
                  ${data.daysMessage}
                </td>
              </tr>
            </table>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/demo-issues/${data.demoIssueId}"
             style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
            View Demo Issue
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `Demo Return ${data.isOverdue ? 'Overdue' : 'Due'}: ${data.issueNumber} - Hospital: ${data.hospitalName}, ${data.daysMessage}`,
  }),

  tender_reminder: (data) => ({
    subject: `📋 Tender ${data.reminderType}: ${data.tenderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366F1; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">📋 Tender ${data.reminderType}</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">${data.tenderNumber}</h2>
          <p style="color: #666;">${data.organizationName}</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 0; color: #333;">${data.message}</p>
          </div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tenders/${data.tenderId}"
             style="display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 15px;">
            View Tender
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Major Surgical Co. - Inventory Management System
        </div>
      </div>
    `,
    text: `Tender ${data.reminderType}: ${data.tenderNumber} - ${data.organizationName}. ${data.message}`,
  }),
};

// Send email notification
const sendEmail = async (to, template, data) => {
  try {
    const emailContent = emailTemplates[template]?.(data);
    if (!emailContent) {
      console.error(`Unknown email template: ${template}`);
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Inventory System" <noreply@majorsurgical.com>',
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Get users who should receive notifications
const getNotificationRecipients = async (notificationType) => {
  // Get all active users (in future, filter by notification preferences)
  const users = await User.find({ isActive: { $ne: false } }).select('_id email name');
  return users;
};

// Check and create low stock alerts
const checkLowStockAlerts = async () => {
  console.log('🔍 Checking for low stock items...');

  const lowStockProducts = await Product.find({
    $expr: { $lte: ['$quantity', '$reorderLevel'] },
    isActive: { $ne: false },
  });

  if (lowStockProducts.length === 0) {
    console.log('✅ No low stock items found');
    return;
  }

  console.log(`⚠️ Found ${lowStockProducts.length} low stock items`);

  const users = await getNotificationRecipients('low_stock');
  const userIds = users.map((u) => u._id);

  for (const product of lowStockProducts) {
    // Check if notification already exists in last 24 hours
    const existingNotification = await Notification.findOne({
      referenceType: 'product',
      referenceId: product._id,
      type: product.quantity === 0 ? 'out_of_stock' : 'low_stock',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingNotification) continue;

    // Create in-app notifications
    await Notification.createLowStockAlert(product, userIds);

    // Send email to all users
    for (const user of users) {
      if (user.email) {
        const emailSent = await sendEmail(
          user.email,
          product.quantity === 0 ? 'out_of_stock' : 'low_stock',
          {
            productName: product.name,
            sku: product.sku,
            currentStock: product.quantity,
            reorderLevel: product.reorderLevel,
            productId: product._id,
          }
        );

        if (emailSent) {
          await Notification.updateOne(
            { user: user._id, referenceId: product._id, type: 'low_stock' },
            { emailSent: true, emailSentAt: new Date() }
          );
        }
      }
    }
  }
};

// Check and create expiry alerts
const checkExpiryAlerts = async () => {
  console.log('🔍 Checking for expiring batches...');

  const today = new Date();
  const alertDays = [30, 15, 7, 0]; // Days before expiry to alert

  const users = await getNotificationRecipients('expiry_alert');
  const userIds = users.map((u) => u._id);

  for (const days of alertDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    // Find batches expiring on this target date (within the day)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    let batches;
    if (days === 0) {
      // Find already expired batches
      batches = await Batch.find({
        expiryDate: { $lt: new Date() },
        status: { $ne: 'expired' },
        currentQuantity: { $gt: 0 },
      }).populate('product', 'name sku');
    } else {
      batches = await Batch.find({
        expiryDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['expired', 'depleted'] },
        currentQuantity: { $gt: 0 },
      }).populate('product', 'name sku');
    }

    for (const batch of batches) {
      // Check if notification already exists for this batch and day range
      const existingNotification = await Notification.findOne({
        referenceType: 'batch',
        referenceId: batch._id,
        type: days === 0 ? 'expired' : 'expiry_alert',
        'metadata.daysUntilExpiry': days,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (existingNotification) continue;

      const batchData = {
        ...batch.toObject(),
        productName: batch.product?.name || batch.productName,
      };

      // Create in-app notifications
      await Notification.createExpiryAlert(batchData, userIds, days);

      // Send email to all users
      for (const user of users) {
        if (user.email) {
          await sendEmail(user.email, days === 0 ? 'expired' : 'expiry_alert', {
            productName: batch.product?.name || batch.productName,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            daysUntilExpiry: days,
            quantity: batch.currentQuantity,
          });
        }
      }
    }
  }
};

// Check and create payment due alerts for invoices
const checkPaymentDueAlerts = async () => {
  console.log('🔍 Checking for payment due invoices...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await getNotificationRecipients('payment_due');
  const userIds = users.map((u) => u._id);

  // Alert days: 7 days before, 3 days before, 1 day before, on due date, and overdue
  const alertDays = [7, 3, 1, 0, -1, -3, -7];

  for (const days of alertDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query;
    if (days < 0) {
      // Overdue invoices
      query = {
        dueDate: { $lt: today },
        status: { $nin: ['paid', 'cancelled'] },
      };
    } else {
      query = {
        dueDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $nin: ['paid', 'cancelled'] },
      };
    }

    const invoices = await Invoice.find(query);

    for (const invoice of invoices) {
      const daysUntilDue = Math.ceil((new Date(invoice.dueDate) - today) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;

      // Check if notification already exists for this day
      const existingNotification = await Notification.findOne({
        referenceType: 'invoice',
        referenceId: invoice._id,
        type: 'invoice_overdue',
        'metadata.daysUntilDue': daysUntilDue,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (existingNotification) continue;

      let daysMessage;
      if (isOverdue) {
        daysMessage = `${Math.abs(daysUntilDue)} day(s) overdue`;
      } else if (daysUntilDue === 0) {
        daysMessage = 'Due today';
      } else {
        daysMessage = `Due in ${daysUntilDue} day(s)`;
      }

      // Create in-app notification
      for (const userId of userIds) {
        await Notification.create({
          user: userId,
          type: 'invoice_overdue',
          title: `Payment ${isOverdue ? 'Overdue' : 'Due'}: ${invoice.invoiceNumber}`,
          message: `Invoice for ${invoice.customer.name} - ₹${invoice.grandTotal.toLocaleString()} is ${daysMessage.toLowerCase()}`,
          priority: isOverdue ? 'high' : 'medium',
          referenceType: 'invoice',
          referenceId: invoice._id,
          referenceLink: `/invoices/${invoice._id}`,
          metadata: { daysUntilDue, amount: invoice.grandTotal },
        });
      }

      // Send email
      for (const user of users) {
        if (user.email) {
          await sendEmail(user.email, 'payment_due', {
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customer.name,
            amount: invoice.grandTotal,
            dueDate: invoice.dueDate,
            daysMessage,
            isOverdue,
            invoiceId: invoice._id,
          });
        }
      }
    }
  }
};

// Check and create demo return alerts
const checkDemoReturnAlerts = async () => {
  console.log('🔍 Checking for demo return due issues...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await getNotificationRecipients('demo_return');
  const userIds = users.map((u) => u._id);

  // Find demo issues with pending returns
  const demoIssues = await DemoIssue.find({
    status: { $in: ['issued', 'partial_return'] },
    expectedReturnDate: { $exists: true },
  }).populate('items.product', 'name');

  for (const issue of demoIssues) {
    const daysUntilReturn = Math.ceil(
      (new Date(issue.expectedReturnDate) - today) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysUntilReturn < 0;

    // Only alert for 7, 3, 1, 0 days before or overdue
    if (!isOverdue && ![7, 3, 1, 0].includes(daysUntilReturn)) continue;

    // Check if notification already exists
    const existingNotification = await Notification.findOne({
      referenceType: 'demo_issue',
      referenceId: issue._id,
      'metadata.daysUntilReturn': daysUntilReturn,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingNotification) continue;

    let daysMessage;
    if (isOverdue) {
      daysMessage = `${Math.abs(daysUntilReturn)} day(s) overdue`;
    } else if (daysUntilReturn === 0) {
      daysMessage = 'Return due today';
    } else {
      daysMessage = `Return due in ${daysUntilReturn} day(s)`;
    }

    // Create in-app notification
    for (const userId of userIds) {
      await Notification.create({
        user: userId,
        type: 'demo_return',
        title: `Demo Return ${isOverdue ? 'Overdue' : 'Due'}: ${issue.issueNumber}`,
        message: `Demo to ${issue.hospital.name} - ${daysMessage}`,
        priority: isOverdue ? 'high' : 'medium',
        referenceType: 'demo_issue',
        referenceId: issue._id,
        referenceLink: `/demo-issues/${issue._id}`,
        metadata: { daysUntilReturn },
      });
    }

    // Send email
    for (const user of users) {
      if (user.email) {
        await sendEmail(user.email, 'demo_return_due', {
          issueNumber: issue.issueNumber,
          hospitalName: issue.hospital.name,
          itemCount: issue.items.length,
          returnDate: issue.expectedReturnDate,
          daysMessage,
          isOverdue,
          demoIssueId: issue._id,
        });
      }
    }
  }
};

// Check tender deadlines (submission, EMD refund, security deposit refund)
const checkTenderAlerts = async () => {
  console.log('🔍 Checking for tender deadlines...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await getNotificationRecipients('tender');
  const userIds = users.map((u) => u._id);

  // Check for submission deadlines
  const submissionDueTenders = await Tender.find({
    status: 'draft',
    submissionDeadline: {
      $gte: today,
      $lte: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  for (const tender of submissionDueTenders) {
    const daysUntil = Math.ceil(
      (new Date(tender.submissionDeadline) - today) / (1000 * 60 * 60 * 24)
    );

    const existingNotification = await Notification.findOne({
      referenceType: 'tender',
      referenceId: tender._id,
      'metadata.alertType': 'submission',
      'metadata.daysUntil': daysUntil,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingNotification) continue;

    for (const userId of userIds) {
      await Notification.create({
        user: userId,
        type: 'tender_deadline',
        title: `Tender Submission Due: ${tender.tenderNumber}`,
        message: `Submission deadline in ${daysUntil} day(s) - ${tender.organization.name}`,
        priority: daysUntil <= 1 ? 'high' : 'medium',
        referenceType: 'tender',
        referenceId: tender._id,
        referenceLink: `/tenders/${tender._id}`,
        metadata: { alertType: 'submission', daysUntil },
      });
    }

    for (const user of users) {
      if (user.email) {
        await sendEmail(user.email, 'tender_reminder', {
          tenderNumber: tender.tenderNumber,
          organizationName: tender.organization.name,
          reminderType: 'Submission Deadline',
          message: `Tender submission deadline is in ${daysUntil} day(s). Please ensure all documents are ready.`,
          tenderId: tender._id,
        });
      }
    }
  }

  // Check for EMD refund due (awarded tenders where EMD not yet refunded)
  const emdRefundDue = await Tender.find({
    status: { $in: ['awarded', 'completed'] },
    'emd.status': 'submitted',
    openingDate: { $lt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
  });

  for (const tender of emdRefundDue) {
    const existingNotification = await Notification.findOne({
      referenceType: 'tender',
      referenceId: tender._id,
      'metadata.alertType': 'emd_refund',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    if (existingNotification) continue;

    for (const userId of userIds) {
      await Notification.create({
        user: userId,
        type: 'tender_emd',
        title: `EMD Refund Pending: ${tender.tenderNumber}`,
        message: `EMD of ₹${tender.emd.amount.toLocaleString()} pending refund - ${tender.organization.name}`,
        priority: 'medium',
        referenceType: 'tender',
        referenceId: tender._id,
        referenceLink: `/tenders/${tender._id}`,
        metadata: { alertType: 'emd_refund', amount: tender.emd.amount },
      });
    }
  }
};

// Run all alert checks
const runAlertChecks = async () => {
  console.log('🚀 Running notification alert checks...');
  try {
    await checkLowStockAlerts();
    await checkExpiryAlerts();
    await checkPaymentDueAlerts();
    await checkDemoReturnAlerts();
    await checkTenderAlerts();
    console.log('✅ Alert checks completed');
  } catch (error) {
    console.error('❌ Error running alert checks:', error);
  }
};

module.exports = {
  sendEmail,
  checkLowStockAlerts,
  checkExpiryAlerts,
  checkPaymentDueAlerts,
  checkDemoReturnAlerts,
  checkTenderAlerts,
  runAlertChecks,
  getNotificationRecipients,
};
