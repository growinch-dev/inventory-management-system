# GrowInch - Mineral Water Manufacturing Inventory System

A comprehensive inventory and manufacturing management system designed specifically for mineral water manufacturing businesses. Built with React, Node.js, Express, and MongoDB.

## Features

### 🏭 Manufacturing Operations
- **Production Management** - Track production batches, material consumption, and output
- **Raw Materials Management** - Monitor raw material stock levels and usage
- **Finished Goods Inventory** - Manage bottled water products (250ml, 500ml, 1L, 2L, 20L)

### 📦 Inventory Management
- **Multi-Warehouse Support** - Manage stock across multiple warehouses
- **Stock Movements** - Complete audit trail of all inventory transactions
- **Transfers** - Inter-warehouse stock transfers
- **Low Stock Alerts** - Automated reorder level notifications

### 💼 Business Operations
- **Purchase Orders** - Create and track purchase orders to suppliers
- **Sales Invoices** - Generate professional invoices with GST
- **Delivery Challans** - Create delivery documentation
- **POS / Quick Sale** - Fast checkout for retail counter sales

### 💰 Financial Management
- **Expenses Tracking** - Monitor manufacturing and operational expenses
- **Payment Records** - Track payments made to suppliers
- **Receipt Management** - Record customer payment receipts
- **GST Compliance** - Built-in GST calculations and HSN codes

### 📊 Reporting & Tools
- **Analytics Dashboard** - Real-time business insights
- **Custom Reports** - Inventory, sales, and financial reports
- **QR Code & Barcode Generator** - Generate product labels
- **Multi-Language Support** - English and other languages

### 👥 User Management
- **Multi-Tenant Architecture** - Separate data for each organization
- **Role-Based Access Control** - Admin, Manager, and Staff roles
- **Secure Authentication** - JWT-based authentication

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **MongoDB Atlas Account** (Free) - [Sign up](https://www.mongodb.com/cloud/atlas/register)
- **Git** (optional, for cloning) - [Download](https://git-scm.com/)

---

## Installation & Setup

### Step 1: Get the Code

If you received the code as a ZIP file:
```bash
# Extract the ZIP file and navigate to the folder
cd inventory-system
```

If you have a Git repository:
```bash
git clone <repository-url>
cd inventory-system
```

### Step 2: Set Up MongoDB Database

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Sign up for a free account
   - Verify your email

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose "M0 Free" tier
   - Select your preferred region (choose closest to your location)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Set Up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create username and password (save these!)
   - Set user privileges to "Atlas Admin"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/`)
   - Replace `<password>` with your actual password
   - Add database name at the end: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/growinch-inventory`

### Step 3: Configure Backend

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

4. **Edit the .env file**

   Open `backend/.env` in a text editor and update these values:

   ```env
   PORT=5000

   # Replace with your MongoDB connection string from Step 2
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/growinch-inventory

   # Secret key for JWT (change this to a random string)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   NODE_ENV=development

   # Email Configuration (Optional - for sending invoices via email)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password

   # Company Details (Update with your company information)
   COMPANY_NAME=GrowInch Water Solutions
   COMPANY_ADDRESS=Your Company Address
   COMPANY_PHONE=+91-XXXXXXXXXX
   COMPANY_EMAIL=info@growinch.com
   COMPANY_GST=YOUR_GST_NUMBER

   # Razorpay Configuration (Optional - for subscription billing)
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your-razorpay-secret

   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

5. **Seed the database with initial admin user**
   ```bash
   npm run seed:admin
   ```

   This creates a default admin account:
   - **Email**: admin@example.com
   - **Password**: admin123
   - **Role**: Admin

### Step 4: Configure Frontend

1. **Open a new terminal window** (keep backend terminal open)

2. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create environment file** (if needed)

   Create `frontend/.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Step 5: Run the Application

1. **Start the Backend Server** (in backend terminal)
   ```bash
   cd backend
   npm run dev
   ```

   You should see:
   ```
   Server running on port 5000
   MongoDB connected successfully
   ```

2. **Start the Frontend** (in frontend terminal)
   ```bash
   cd frontend
   npm run dev
   ```

   You should see:
   ```
   VITE v5.x.x  ready in xxx ms

   ➜  Local:   http://localhost:5173/
   ```

3. **Open the Application**
   - Open your browser
   - Go to `http://localhost:5173`
   - Login with:
     - **Email**: admin@example.com
     - **Password**: admin123

---

## Project Structure

```
inventory-system/
├── backend/                 # Node.js + Express backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── seeds/          # Database seeders
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── index.js        # Entry point
│   ├── .env                # Environment variables
│   └── package.json        # Dependencies
│
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context
│   │   ├── layouts/        # Page layouts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Zustand state management
│   │   ├── constants/      # Constants and enums
│   │   └── App.jsx         # Main app component
│   ├── .env                # Environment variables
│   └── package.json        # Dependencies
│
└── README.md               # This file
```

---

## Default Login Credentials

After running the seed command, you can login with:

- **Email**: admin@example.com
- **Password**: admin123

**⚠️ Important**: Change this password immediately after first login through Settings > Profile.

---

## Common Issues & Troubleshooting

### Issue 1: MongoDB Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**:
- Check your MongoDB connection string in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas Network Access
- Verify username and password are correct

### Issue 2: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**:
- Change the PORT in `backend/.env` to something else (e.g., 5001)
- Or kill the process using that port

### Issue 3: CORS Error in Browser
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution**:
- Ensure backend is running on port 5000
- Check `FRONTEND_URL` in `backend/.env` is set to `http://localhost:5173`

### Issue 4: Module Not Found Error
```
Error: Cannot find module 'express'
```
**Solution**:
- Delete `node_modules` folder
- Run `npm install` again in that directory

### Issue 5: React Hooks Error
```
Warning: Invalid hook call
```
**Solution**:
- Delete `node_modules` and `package-lock.json` in frontend
- Run `npm install` again

---

## Available Scripts

### Backend Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Seed admin user
npm run seed:admin

# Seed sample data (optional)
npm run seed
```

### Frontend Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

---

## Production Deployment

### Backend Deployment (Heroku, Render, Railway, etc.)

1. **Environment Variables**
   - Set all variables from `.env` file
   - Use production MongoDB cluster
   - Set `NODE_ENV=production`

2. **Build Command**: None required (Node.js app)

3. **Start Command**: `npm start`

### Frontend Deployment (Vercel, Netlify, etc.)

1. **Environment Variables**
   - Set `VITE_API_URL` to your backend URL

2. **Build Command**: `npm run build`

3. **Output Directory**: `dist`

4. **Install Command**: `npm install`

---

## Technology Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **QRCode** - QR code generation
- **Nodemailer** - Email sending

---

## Security Best Practices

1. **Change Default Credentials** - Immediately after first login
2. **Use Strong JWT Secret** - Generate a random secret for production
3. **Enable HTTPS** - Use SSL certificates in production
4. **Regular Backups** - Set up MongoDB automated backups
5. **Update Dependencies** - Keep packages up to date
6. **Environment Variables** - Never commit `.env` files to Git

---

## Support & Documentation

### Quick Start Guide
1. Install Node.js and create MongoDB Atlas account
2. Run `npm install` in both backend and frontend folders
3. Configure `.env` file in backend folder
4. Run `npm run seed:admin` in backend
5. Start backend with `npm run dev`
6. Start frontend with `npm run dev`
7. Login with admin@example.com / admin123

### Need Help?
- Check the troubleshooting section above
- Review MongoDB Atlas documentation for database issues
- Check Node.js and npm versions

---

## License

This software is proprietary. All rights reserved.

---

## Credits

**GrowInch Inventory System** - Mineral Water Manufacturing Management Software

Built with ❤️ for efficient manufacturing operations.
