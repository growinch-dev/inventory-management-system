const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import models
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const StockMovement = require('../models/StockMovement');
const QRScan = require('../models/QRScan');
const Warehouse = require('../models/Warehouse');
const Transfer = require('../models/Transfer');

// Connect to DB
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

// Dummy Users
const users = [
  {
    name: 'Admin',
    email: 'admin@growinch.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh@growinch.com',
    password: 'Manager@123',
    role: 'manager',
    isActive: true,
  },
  {
    name: 'Priya Sharma',
    email: 'priya@growinch.com',
    password: 'Staff@123',
    role: 'staff',
    isActive: true,
  },
  {
    name: 'Amit Patel',
    email: 'amit@growinch.com',
    password: 'Staff@123',
    role: 'staff',
    isActive: true,
  },
];

// Dummy Suppliers
const suppliers = [
  {
    name: 'MedTech Instruments Pvt Ltd',
    contactPerson: 'Suresh Mehta',
    email: 'sales@medtechinstruments.com',
    phone: '+91-9876543210',
    alternatePhone: '+91-11-23456789',
    address: {
      street: '45, Industrial Area, Phase II',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      country: 'India',
    },
    gstNumber: '09AAACM1234F1ZX',
    panNumber: 'AAACM1234F',
    bankDetails: {
      bankName: 'HDFC Bank',
      accountNumber: '12345678901234',
      ifscCode: 'HDFC0001234',
      branchName: 'Noida Sector 18',
    },
    paymentTerms: 'Net 30',
    rating: 5,
    notes: 'Reliable supplier for autoclaves and sterilizers',
    isActive: true,
  },
  {
    name: 'Orthopedic Solutions India',
    contactPerson: 'Dr. Anil Verma',
    email: 'info@orthosolutions.in',
    phone: '+91-8765432109',
    address: {
      street: '78, Medical Equipment Market',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
    },
    gstNumber: '27AABCO5678P1ZQ',
    panNumber: 'AABCO5678P',
    bankDetails: {
      bankName: 'ICICI Bank',
      accountNumber: '98765432101234',
      ifscCode: 'ICIC0005678',
      branchName: 'Mumbai Fort',
    },
    paymentTerms: 'Net 45',
    rating: 4,
    notes: 'Specialized in orthopedic instruments and implants',
    isActive: true,
  },
  {
    name: 'Hospital Furniture World',
    contactPerson: 'Vikram Singh',
    email: 'orders@hospitalfurnitureworld.com',
    phone: '+91-7654321098',
    address: {
      street: '23, Furniture Hub, Kirti Nagar',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110015',
      country: 'India',
    },
    gstNumber: '07AABCH9012K1ZR',
    panNumber: 'AABCH9012K',
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '45678901234567',
      ifscCode: 'SBIN0009012',
      branchName: 'Kirti Nagar',
    },
    paymentTerms: 'Net 30',
    rating: 4,
    notes: 'Best prices for hospital beds and furniture',
    isActive: true,
  },
  {
    name: 'DiagnoEquip Healthcare',
    contactPerson: 'Neha Gupta',
    email: 'sales@diagnoequip.com',
    phone: '+91-6543210987',
    address: {
      street: '56, Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
      country: 'India',
    },
    gstNumber: '29AABCD3456H1ZS',
    panNumber: 'AABCD3456H',
    bankDetails: {
      bankName: 'Axis Bank',
      accountNumber: '78901234567890',
      ifscCode: 'UTIB0003456',
      branchName: 'Electronic City',
    },
    paymentTerms: 'Net 60',
    rating: 5,
    notes: 'Premium diagnostic equipment supplier',
    isActive: true,
  },
  {
    name: 'RehabCare Equipment',
    contactPerson: 'Sanjay Joshi',
    email: 'contact@rehabcare.in',
    phone: '+91-5432109876',
    address: {
      street: '12, Health Street',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      country: 'India',
    },
    gstNumber: '27AABCR7890J1ZT',
    panNumber: 'AABCR7890J',
    bankDetails: {
      bankName: 'Kotak Mahindra Bank',
      accountNumber: '12345098765432',
      ifscCode: 'KKBK0007890',
      branchName: 'Pune Camp',
    },
    paymentTerms: 'Net 30',
    rating: 3,
    notes: 'Rehabilitation aids and physiotherapy equipment',
    isActive: true,
  },
];

// Dummy Customers
const customers = [
  {
    name: 'Apollo Hospitals',
    email: 'procurement@apollohospitals.com',
    phone: '+91-44-28290200',
    alternatePhone: '+91-44-28290201',
    gstNumber: '33AAACA1234B1ZC',
    panNumber: 'AAACA1234B',
    customerType: 'hospital',
    billingAddress: {
      street: '21, Greams Lane',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600006',
      country: 'India',
    },
    shippingAddress: {
      street: '21, Greams Lane',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600006',
      country: 'India',
    },
    creditLimit: 500000,
    outstandingBalance: 125000,
    notes: 'Premium customer - Priority delivery',
    isActive: true,
  },
  {
    name: 'Fortis Healthcare Ltd',
    email: 'supplies@fortishealthcare.com',
    phone: '+91-124-4962200',
    gstNumber: '06AAACF5678C1ZD',
    panNumber: 'AAACF5678C',
    customerType: 'hospital',
    billingAddress: {
      street: 'Sector 62, Phase VIII',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122002',
      country: 'India',
    },
    shippingAddress: {
      street: 'Sector 62, Phase VIII',
      city: 'Gurgaon',
      state: 'Haryana',
      pincode: '122002',
      country: 'India',
    },
    creditLimit: 750000,
    outstandingBalance: 0,
    notes: 'Multiple branches - confirm delivery location',
    isActive: true,
  },
  {
    name: 'City Medical Centre',
    email: 'admin@citymedical.in',
    phone: '+91-11-45678901',
    gstNumber: '07AAACC9012D1ZE',
    panNumber: 'AAACC9012D',
    customerType: 'clinic',
    billingAddress: {
      street: '34, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
    },
    shippingAddress: {
      street: '34, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India',
    },
    creditLimit: 100000,
    outstandingBalance: 45000,
    isActive: true,
  },
  {
    name: 'MedSupply Distributors',
    email: 'orders@medsupply.com',
    phone: '+91-22-34567890',
    gstNumber: '27AAACM3456E1ZF',
    panNumber: 'AAACM3456E',
    customerType: 'distributor',
    billingAddress: {
      street: '89, Medical Market, Byculla',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400027',
      country: 'India',
    },
    shippingAddress: {
      street: 'Warehouse 5, Bhiwandi',
      city: 'Thane',
      state: 'Maharashtra',
      pincode: '421302',
      country: 'India',
    },
    creditLimit: 1000000,
    outstandingBalance: 320000,
    notes: 'Bulk orders - Distributor discount applicable',
    isActive: true,
  },
  {
    name: 'Government Medical College Hospital',
    email: 'purchase@gmch.gov.in',
    phone: '+91-471-2528300',
    gstNumber: '32AAACG7890F1ZG',
    panNumber: 'AAACG7890F',
    customerType: 'government',
    billingAddress: {
      street: 'Medical College PO',
      city: 'Thiruvananthapuram',
      state: 'Kerala',
      pincode: '695011',
      country: 'India',
    },
    shippingAddress: {
      street: 'Medical College PO',
      city: 'Thiruvananthapuram',
      state: 'Kerala',
      pincode: '695011',
      country: 'India',
    },
    creditLimit: 2000000,
    outstandingBalance: 0,
    notes: 'Government tender - Follow procurement guidelines',
    isActive: true,
  },
  {
    name: 'HealthFirst Retail Pharmacy',
    email: 'store@healthfirst.in',
    phone: '+91-80-45678123',
    customerType: 'retailer',
    billingAddress: {
      street: '12, MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    },
    shippingAddress: {
      street: '12, MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    },
    creditLimit: 50000,
    outstandingBalance: 15000,
    isActive: true,
  },
  {
    name: 'Dr. Ramesh Clinic',
    email: 'dr.ramesh@gmail.com',
    phone: '+91-9876123456',
    customerType: 'individual',
    billingAddress: {
      street: '45, Park Street',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700016',
      country: 'India',
    },
    shippingAddress: {
      street: '45, Park Street',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700016',
      country: 'India',
    },
    creditLimit: 25000,
    outstandingBalance: 0,
    isActive: true,
  },
];

// Dummy Products (will be linked with suppliers)
const getProducts = (supplierIds) => [
  // Autoclaves & Sterilizers
  {
    sku: 'MSC-AUT-001',
    name: 'Horizontal Autoclave 22L',
    description: 'Fully automatic horizontal autoclave with digital display, 22 liters capacity. Suitable for small clinics.',
    category: 'Autoclaves & Sterilizers',
    hsnCode: '84192000',
    unitPrice: 45000,
    costPrice: 35000,
    quantity: 15,
    reorderLevel: 5,
    unit: 'PCS',
    supplier: supplierIds[0],
    serialNumber: 'AUT22L-2024-0001',
    batchNumber: 'AUT-2024-001',
    lotNumber: 'LOT-AUT-001',
    manufacturingDate: new Date('2024-01-15'),
    countryOfOrigin: 'India',
    location: { warehouse: 'Mumbai Main Warehouse', zone: 'A', shelf: 'A', rack: '1' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-AUT-002',
    name: 'Vertical Autoclave 50L',
    description: 'Heavy duty vertical autoclave with 50 liters capacity. Industrial grade for hospitals.',
    category: 'Autoclaves & Sterilizers',
    hsnCode: '84192000',
    unitPrice: 85000,
    costPrice: 65000,
    quantity: 8,
    reorderLevel: 3,
    unit: 'PCS',
    supplier: supplierIds[0],
    batchNumber: 'AUT-2024-002',
    manufacturingDate: new Date('2024-02-20'),
    location: { warehouse: 'Main', shelf: 'A', rack: '2' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-STE-001',
    name: 'UV Sterilizer Cabinet',
    description: 'UV-C sterilization cabinet for medical instruments. Stainless steel construction.',
    category: 'Autoclaves & Sterilizers',
    hsnCode: '84192000',
    unitPrice: 18000,
    costPrice: 12000,
    quantity: 25,
    reorderLevel: 8,
    unit: 'PCS',
    supplier: supplierIds[0],
    batchNumber: 'STE-2024-001',
    manufacturingDate: new Date('2024-03-10'),
    location: { warehouse: 'Main', shelf: 'A', rack: '3' },
    taxRate: 12,
    isActive: true,
  },
  // Hospital Beds
  {
    sku: 'MSC-BED-001',
    name: 'ICU Bed Electric 5-Function',
    description: 'Electric ICU bed with 5 functions, side rails, IV pole, and mattress. Remote controlled.',
    category: 'Hospital Beds',
    hsnCode: '94029000',
    unitPrice: 125000,
    costPrice: 95000,
    quantity: 12,
    reorderLevel: 4,
    unit: 'PCS',
    supplier: supplierIds[2],
    batchNumber: 'BED-2024-001',
    manufacturingDate: new Date('2024-01-05'),
    location: { warehouse: 'Main', shelf: 'B', rack: '1' },
    taxRate: 18,
    isActive: true,
  },
  {
    sku: 'MSC-BED-002',
    name: 'Semi-Fowler Bed Manual',
    description: 'Manual semi-fowler hospital bed with ABS panels and collapsible side rails.',
    category: 'Hospital Beds',
    hsnCode: '94029000',
    unitPrice: 28000,
    costPrice: 20000,
    quantity: 30,
    reorderLevel: 10,
    unit: 'PCS',
    supplier: supplierIds[2],
    batchNumber: 'BED-2024-002',
    manufacturingDate: new Date('2024-02-15'),
    location: { warehouse: 'Main', shelf: 'B', rack: '2' },
    taxRate: 18,
    isActive: true,
  },
  {
    sku: 'MSC-BED-003',
    name: 'Patient Stretcher Trolley',
    description: 'Stainless steel stretcher trolley with mattress, IV rod, and oxygen cylinder holder.',
    category: 'Hospital Beds',
    hsnCode: '94029000',
    unitPrice: 35000,
    costPrice: 26000,
    quantity: 18,
    reorderLevel: 6,
    unit: 'PCS',
    supplier: supplierIds[2],
    batchNumber: 'BED-2024-003',
    manufacturingDate: new Date('2024-03-01'),
    location: { warehouse: 'Main', shelf: 'B', rack: '3' },
    taxRate: 18,
    isActive: true,
  },
  // Hospital Furniture
  {
    sku: 'MSC-FUR-001',
    name: 'Bedside Locker SS',
    description: 'Stainless steel bedside locker with drawer and cabinet. Easy to clean.',
    category: 'Hospital Furniture',
    hsnCode: '94036000',
    unitPrice: 8500,
    costPrice: 6000,
    quantity: 50,
    reorderLevel: 15,
    unit: 'PCS',
    supplier: supplierIds[2],
    batchNumber: 'FUR-2024-001',
    manufacturingDate: new Date('2024-01-20'),
    location: { warehouse: 'Main', shelf: 'C', rack: '1' },
    taxRate: 18,
    isActive: true,
  },
  {
    sku: 'MSC-FUR-002',
    name: 'Over Bed Table Adjustable',
    description: 'Height adjustable over bed table with laminated top. Castor wheels with locks.',
    category: 'Hospital Furniture',
    hsnCode: '94036000',
    unitPrice: 6500,
    costPrice: 4500,
    quantity: 40,
    reorderLevel: 12,
    unit: 'PCS',
    supplier: supplierIds[2],
    batchNumber: 'FUR-2024-002',
    manufacturingDate: new Date('2024-02-10'),
    location: { warehouse: 'Main', shelf: 'C', rack: '2' },
    taxRate: 18,
    isActive: true,
  },
  {
    sku: 'MSC-FUR-003',
    name: 'Medicine Trolley 3-Tier',
    description: 'Three tier medicine trolley with stainless steel frame and ABS drawers.',
    category: 'Hospital Furniture',
    hsnCode: '94036000',
    unitPrice: 12000,
    costPrice: 8500,
    quantity: 22,
    reorderLevel: 8,
    unit: 'PCS',
    supplier: supplierIds[2],
    batchNumber: 'FUR-2024-003',
    manufacturingDate: new Date('2024-03-05'),
    location: { warehouse: 'Main', shelf: 'C', rack: '3' },
    taxRate: 18,
    isActive: true,
  },
  // Orthopedic Instruments
  {
    sku: 'MSC-ORT-001',
    name: 'Bone Saw Electric',
    description: 'Electric bone saw with variable speed control. Complete with 3 blade sizes.',
    category: 'Orthopedic Instruments',
    hsnCode: '90189090',
    unitPrice: 75000,
    costPrice: 55000,
    quantity: 5,
    reorderLevel: 2,
    unit: 'PCS',
    supplier: supplierIds[1],
    batchNumber: 'ORT-2024-001',
    manufacturingDate: new Date('2024-01-25'),
    location: { warehouse: 'Main', shelf: 'D', rack: '1' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-ORT-002',
    name: 'Orthopedic Drill Set',
    description: 'Battery operated orthopedic drill with complete drill bit set. Autoclavable.',
    category: 'Orthopedic Instruments',
    hsnCode: '90189090',
    unitPrice: 95000,
    costPrice: 72000,
    quantity: 6,
    reorderLevel: 2,
    unit: 'SET',
    supplier: supplierIds[1],
    batchNumber: 'ORT-2024-002',
    manufacturingDate: new Date('2024-02-28'),
    location: { warehouse: 'Main', shelf: 'D', rack: '2' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-ORT-003',
    name: 'Bone Plates & Screws Kit',
    description: 'Complete trauma fixation kit with various sized plates and screws. Titanium.',
    category: 'Orthopedic Instruments',
    hsnCode: '90189090',
    unitPrice: 45000,
    costPrice: 32000,
    quantity: 10,
    reorderLevel: 4,
    unit: 'SET',
    supplier: supplierIds[1],
    batchNumber: 'ORT-2024-003',
    manufacturingDate: new Date('2024-03-15'),
    location: { warehouse: 'Main', shelf: 'D', rack: '3' },
    taxRate: 12,
    isActive: true,
  },
  // Diagnostic Equipment
  {
    sku: 'MSC-DIA-001',
    name: 'ECG Machine 12-Channel',
    description: 'Digital 12-channel ECG machine with color display and thermal printer.',
    category: 'Diagnostic Equipment',
    hsnCode: '90189040',
    unitPrice: 65000,
    costPrice: 48000,
    quantity: 10,
    reorderLevel: 3,
    unit: 'PCS',
    supplier: supplierIds[3],
    batchNumber: 'DIA-2024-001',
    manufacturingDate: new Date('2024-01-10'),
    location: { warehouse: 'Main', shelf: 'E', rack: '1' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-DIA-002',
    name: 'Patient Monitor 5-Para',
    description: '5-parameter patient monitor with ECG, SpO2, NIBP, Temperature, and Respiration.',
    category: 'Diagnostic Equipment',
    hsnCode: '90189040',
    unitPrice: 85000,
    costPrice: 62000,
    quantity: 8,
    reorderLevel: 3,
    unit: 'PCS',
    supplier: supplierIds[3],
    batchNumber: 'DIA-2024-002',
    manufacturingDate: new Date('2024-02-05'),
    location: { warehouse: 'Main', shelf: 'E', rack: '2' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-DIA-003',
    name: 'Pulse Oximeter Fingertip',
    description: 'Digital fingertip pulse oximeter with OLED display. Battery operated.',
    category: 'Diagnostic Equipment',
    hsnCode: '90189040',
    unitPrice: 1200,
    costPrice: 600,
    quantity: 200,
    reorderLevel: 50,
    unit: 'PCS',
    supplier: supplierIds[3],
    batchNumber: 'DIA-2024-003',
    manufacturingDate: new Date('2024-03-20'),
    location: { warehouse: 'Main', shelf: 'E', rack: '3' },
    taxRate: 12,
    isActive: true,
  },
  // Rehabilitation Aids
  {
    sku: 'MSC-REH-001',
    name: 'Wheelchair Folding Standard',
    description: 'Standard folding wheelchair with chrome plated frame. Solid castor wheels.',
    category: 'Rehabilitation Aids',
    hsnCode: '87131000',
    unitPrice: 8500,
    costPrice: 6000,
    quantity: 35,
    reorderLevel: 10,
    unit: 'PCS',
    supplier: supplierIds[4],
    batchNumber: 'REH-2024-001',
    manufacturingDate: new Date('2024-01-30'),
    location: { warehouse: 'Main', shelf: 'F', rack: '1' },
    taxRate: 5,
    isActive: true,
  },
  {
    sku: 'MSC-REH-002',
    name: 'Walking Frame Aluminum',
    description: 'Lightweight aluminum walking frame with height adjustment. Foldable design.',
    category: 'Rehabilitation Aids',
    hsnCode: '90211000',
    unitPrice: 2500,
    costPrice: 1500,
    quantity: 60,
    reorderLevel: 20,
    unit: 'PCS',
    supplier: supplierIds[4],
    batchNumber: 'REH-2024-002',
    manufacturingDate: new Date('2024-02-25'),
    location: { warehouse: 'Main', shelf: 'F', rack: '2' },
    taxRate: 5,
    isActive: true,
  },
  {
    sku: 'MSC-REH-003',
    name: 'Cervical Collar Soft',
    description: 'Soft cervical collar for neck support. Available in S, M, L sizes.',
    category: 'Rehabilitation Aids',
    hsnCode: '90211000',
    unitPrice: 350,
    costPrice: 180,
    quantity: 150,
    reorderLevel: 40,
    unit: 'PCS',
    supplier: supplierIds[4],
    batchNumber: 'REH-2024-003',
    manufacturingDate: new Date('2024-03-12'),
    expiryDate: new Date('2026-03-12'),
    location: { warehouse: 'Main', shelf: 'F', rack: '3' },
    taxRate: 5,
    isActive: true,
  },
  // Low stock items
  {
    sku: 'MSC-AUT-003',
    name: 'Flash Sterilizer Tabletop',
    description: 'Compact tabletop flash sterilizer for quick instrument sterilization.',
    category: 'Autoclaves & Sterilizers',
    hsnCode: '84192000',
    unitPrice: 32000,
    costPrice: 24000,
    quantity: 3,
    reorderLevel: 5,
    unit: 'PCS',
    supplier: supplierIds[0],
    batchNumber: 'AUT-2024-003',
    manufacturingDate: new Date('2024-02-01'),
    location: { warehouse: 'Main', shelf: 'A', rack: '4' },
    taxRate: 12,
    isActive: true,
  },
  {
    sku: 'MSC-DIA-004',
    name: 'Blood Pressure Monitor Digital',
    description: 'Automatic digital blood pressure monitor with memory function.',
    category: 'Diagnostic Equipment',
    hsnCode: '90189040',
    unitPrice: 2800,
    costPrice: 1800,
    quantity: 5,
    reorderLevel: 15,
    unit: 'PCS',
    supplier: supplierIds[3],
    batchNumber: 'DIA-2024-004',
    manufacturingDate: new Date('2024-03-01'),
    location: { warehouse: 'Mumbai Main Warehouse', shelf: 'E', rack: '4' },
    taxRate: 12,
    isActive: true,
  },
  // Products with upcoming expiry dates for POC demo
  {
    sku: 'MSC-CON-001',
    name: 'Sterile Surgical Gloves (Box of 100)',
    description: 'Latex-free sterile surgical gloves. Powder-free.',
    category: 'Rehabilitation Aids',
    hsnCode: '40151100',
    unitPrice: 1200,
    costPrice: 800,
    quantity: 50,
    reorderLevel: 20,
    unit: 'BOX',
    supplier: supplierIds[0],
    serialNumber: 'GLV-2024-0001',
    batchNumber: 'GLV-2024-001',
    lotNumber: 'LOT-GLV-001',
    manufacturingDate: new Date('2024-01-01'),
    expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    countryOfOrigin: 'Malaysia',
    location: { warehouse: 'Mumbai Main Warehouse', zone: 'C', shelf: 'G', rack: '1' },
    taxRate: 5,
    isActive: true,
  },
  {
    sku: 'MSC-CON-002',
    name: 'Surgical Sutures Kit',
    description: 'Absorbable surgical sutures - assorted sizes.',
    category: 'Orthopedic Instruments',
    hsnCode: '30061000',
    unitPrice: 2500,
    costPrice: 1500,
    quantity: 30,
    reorderLevel: 10,
    unit: 'SET',
    supplier: supplierIds[1],
    serialNumber: 'SUT-2024-0001',
    batchNumber: 'SUT-2024-001',
    lotNumber: 'LOT-SUT-001',
    manufacturingDate: new Date('2024-02-01'),
    expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    countryOfOrigin: 'Germany',
    location: { warehouse: 'Mumbai Main Warehouse', zone: 'D', shelf: 'H', rack: '2' },
    taxRate: 5,
    isActive: true,
  },
  {
    sku: 'MSC-CON-003',
    name: 'Wound Dressing Pads (Pack of 50)',
    description: 'Sterile non-adherent wound dressing pads.',
    category: 'Rehabilitation Aids',
    hsnCode: '30059000',
    unitPrice: 850,
    costPrice: 500,
    quantity: 100,
    reorderLevel: 30,
    unit: 'BOX',
    supplier: supplierIds[0],
    serialNumber: 'WDP-2024-0001',
    batchNumber: 'WDP-2024-001',
    lotNumber: 'LOT-WDP-001',
    manufacturingDate: new Date('2024-03-01'),
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    countryOfOrigin: 'India',
    location: { warehouse: 'Delhi Distribution Center', zone: 'A', shelf: 'B', rack: '1' },
    taxRate: 5,
    isActive: true,
  },
];

// Number to words conversion for invoice
const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

// Seed function
const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Supplier.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Invoice.deleteMany({}),
      StockMovement.deleteMany({}),
      QRScan.deleteMany({}),
      Warehouse.deleteMany({}),
      Transfer.deleteMany({}),
    ]);

    // Create Users
    console.log('Creating users...');
    const createdUsers = await User.create(users);
    const adminUser = createdUsers[0];
    const managerUser = createdUsers[1];
    console.log(`Created ${createdUsers.length} users`);

    // Create Warehouses
    console.log('Creating warehouses...');
    const warehouses = [
      {
        code: 'MUM-MAIN',
        name: 'Mumbai Main Warehouse',
        type: 'main',
        address: {
          street: 'Plot 45, MIDC Industrial Area',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400093',
          country: 'India',
        },
        contactPerson: {
          name: 'Vikram Singh',
          phone: '+91-22-45678901',
          email: 'mumbai@growinch.com',
        },
        capacity: { maxItems: 15000, currentItems: 0 },
        zones: [
          { code: 'A', name: 'Autoclaves & Sterilizers', type: 'storage' },
          { code: 'B', name: 'Hospital Beds', type: 'storage' },
          { code: 'C', name: 'Hospital Furniture', type: 'storage' },
          { code: 'D', name: 'Orthopedic Instruments', type: 'storage' },
          { code: 'E', name: 'Diagnostic Equipment', type: 'storage' },
          { code: 'F', name: 'Rehabilitation Aids', type: 'storage' },
          { code: 'R', name: 'Receiving Bay', type: 'receiving' },
          { code: 'S', name: 'Shipping Dock', type: 'shipping' },
        ],
        operatingHours: {
          weekdays: { open: '08:00', close: '20:00' },
          weekends: { open: '09:00', close: '14:00' },
        },
        isActive: true,
        isDefault: true,
        notes: 'Primary warehouse for all western region operations',
        createdBy: adminUser._id,
      },
      {
        code: 'DEL-DIST',
        name: 'Delhi Distribution Center',
        type: 'distribution',
        address: {
          street: '12, Okhla Industrial Estate, Phase III',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110020',
          country: 'India',
        },
        contactPerson: {
          name: 'Rahul Sharma',
          phone: '+91-11-23456789',
          email: 'delhi@growinch.com',
        },
        capacity: { maxItems: 8000, currentItems: 0 },
        zones: [
          { code: 'A', name: 'General Storage', type: 'storage' },
          { code: 'B', name: 'Fast Moving Items', type: 'storage' },
          { code: 'Q', name: 'Quarantine', type: 'quarantine' },
          { code: 'R', name: 'Receiving', type: 'receiving' },
          { code: 'S', name: 'Shipping', type: 'shipping' },
        ],
        operatingHours: {
          weekdays: { open: '09:00', close: '18:00' },
          weekends: { open: '10:00', close: '14:00' },
        },
        isActive: true,
        isDefault: false,
        notes: 'North India distribution hub',
        createdBy: adminUser._id,
      },
      {
        code: 'BLR-REG',
        name: 'Bangalore Regional Warehouse',
        type: 'regional',
        address: {
          street: '78, Electronic City, Phase II',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560100',
          country: 'India',
        },
        contactPerson: {
          name: 'Suresh Reddy',
          phone: '+91-80-45678901',
          email: 'bangalore@growinch.com',
        },
        capacity: { maxItems: 5000, currentItems: 0 },
        zones: [
          { code: 'A', name: 'Storage Zone A', type: 'storage' },
          { code: 'B', name: 'Storage Zone B', type: 'storage' },
          { code: 'R', name: 'Receiving', type: 'receiving' },
          { code: 'S', name: 'Dispatch', type: 'shipping' },
        ],
        operatingHours: {
          weekdays: { open: '09:00', close: '18:00' },
          weekends: { open: '09:00', close: '13:00' },
        },
        isActive: true,
        isDefault: false,
        notes: 'South India regional operations',
        createdBy: adminUser._id,
      },
      {
        code: 'CHN-RET',
        name: 'Chennai Returns Center',
        type: 'returns',
        address: {
          street: '34, Ambattur Industrial Estate',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600058',
          country: 'India',
        },
        contactPerson: {
          name: 'Kumar Krishnan',
          phone: '+91-44-23456789',
          email: 'chennai@growinch.com',
        },
        capacity: { maxItems: 3000, currentItems: 0 },
        zones: [
          { code: 'I', name: 'Inspection', type: 'receiving' },
          { code: 'R', name: 'Refurbishment', type: 'storage' },
          { code: 'D', name: 'Damaged Goods', type: 'quarantine' },
          { code: 'S', name: 'Return to Stock', type: 'storage' },
        ],
        operatingHours: {
          weekdays: { open: '09:00', close: '17:00' },
          weekends: { open: '00:00', close: '00:00' },
        },
        isActive: true,
        isDefault: false,
        notes: 'Handles all returns and refurbishment',
        createdBy: adminUser._id,
      },
    ];
    const createdWarehouses = await Warehouse.create(warehouses);
    console.log(`Created ${createdWarehouses.length} warehouses`);

    // Create Suppliers
    console.log('Creating suppliers...');
    const suppliersWithCreator = suppliers.map(s => ({ ...s, createdBy: adminUser._id }));
    const createdSuppliers = await Supplier.create(suppliersWithCreator);
    console.log(`Created ${createdSuppliers.length} suppliers`);

    // Create Customers
    console.log('Creating customers...');
    const customersWithCreator = customers.map(c => ({ ...c, createdBy: adminUser._id }));
    const createdCustomers = await Customer.create(customersWithCreator);
    console.log(`Created ${createdCustomers.length} customers`);

    // Create Products
    console.log('Creating products...');
    const supplierIds = createdSuppliers.map(s => s._id);
    const productsData = getProducts(supplierIds).map(p => ({ ...p, createdBy: adminUser._id }));
    const createdProducts = await Product.create(productsData);
    console.log(`Created ${createdProducts.length} products`);

    // Create Stock Movements for initial stock
    console.log('Creating stock movements...');
    const mainWarehouse = createdWarehouses[0]; // Mumbai Main
    const stockMovements = createdProducts.map(product => ({
      product: product._id,
      type: 'in',
      quantity: product.quantity,
      previousQuantity: 0,
      newQuantity: product.quantity,
      reason: 'initial',
      reference: 'Initial Stock',
      referenceType: 'manual',
      warehouse: mainWarehouse.name,
      warehouseRef: mainWarehouse._id,
      notes: 'Initial inventory setup',
      scannedVia: 'manual',
      performedBy: adminUser._id,
    }));
    await StockMovement.create(stockMovements);
    console.log(`Created ${stockMovements.length} stock movements`);

    // Create Invoices
    console.log('Creating invoices...');
    const invoices = [];

    // Invoice 1 - Apollo Hospitals (Paid)
    const invoice1Items = [
      { product: createdProducts[3], qty: 2 }, // ICU Bed
      { product: createdProducts[6], qty: 10 }, // Bedside Locker
      { product: createdProducts[7], qty: 5 }, // Over Bed Table
    ];
    let subtotal1 = 0;
    const items1 = invoice1Items.map(item => {
      const taxableAmount = item.product.unitPrice * item.qty;
      const taxAmount = (taxableAmount * item.product.taxRate) / 100;
      subtotal1 += taxableAmount;
      return {
        product: item.product._id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.qty,
        unit: item.product.unit,
        rate: item.product.unitPrice,
        taxRate: item.product.taxRate,
        taxableAmount,
        taxAmount,
        totalAmount: taxableAmount + taxAmount,
      };
    });
    const totalTax1 = items1.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal1 = subtotal1 + totalTax1;

    invoices.push({
      invoiceNumber: 'MSC/2024-07/0001',
      invoiceDate: new Date('2024-07-05'),
      dueDate: new Date('2024-08-04'),
      customer: {
        name: createdCustomers[0].name,
        email: createdCustomers[0].email,
        phone: createdCustomers[0].phone,
        gstNumber: createdCustomers[0].gstNumber,
      },
      billingAddress: createdCustomers[0].billingAddress,
      shippingAddress: createdCustomers[0].shippingAddress,
      items: items1,
      subtotal: subtotal1,
      taxBreakdown: {
        cgst: { rate: 9, amount: totalTax1 / 2 },
        sgst: { rate: 9, amount: totalTax1 / 2 },
      },
      totalTax: totalTax1,
      grandTotal: grandTotal1,
      amountInWords: numberToWords(Math.round(grandTotal1)) + ' Rupees Only',
      status: 'paid',
      paymentMethod: 'bank_transfer',
      paymentDate: new Date('2024-07-15'),
      paymentReference: 'NEFT/UTR/123456789',
      createdBy: managerUser._id,
    });

    // Invoice 2 - Fortis (Sent)
    const invoice2Items = [
      { product: createdProducts[12], qty: 3 }, // ECG Machine
      { product: createdProducts[13], qty: 5 }, // Patient Monitor
    ];
    let subtotal2 = 0;
    const items2 = invoice2Items.map(item => {
      const taxableAmount = item.product.unitPrice * item.qty;
      const taxAmount = (taxableAmount * item.product.taxRate) / 100;
      subtotal2 += taxableAmount;
      return {
        product: item.product._id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.qty,
        unit: item.product.unit,
        rate: item.product.unitPrice,
        taxRate: item.product.taxRate,
        taxableAmount,
        taxAmount,
        totalAmount: taxableAmount + taxAmount,
      };
    });
    const totalTax2 = items2.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal2 = subtotal2 + totalTax2;

    invoices.push({
      invoiceNumber: 'MSC/2024-07/0002',
      invoiceDate: new Date('2024-07-12'),
      dueDate: new Date('2024-08-11'),
      customer: {
        name: createdCustomers[1].name,
        email: createdCustomers[1].email,
        phone: createdCustomers[1].phone,
        gstNumber: createdCustomers[1].gstNumber,
      },
      billingAddress: createdCustomers[1].billingAddress,
      shippingAddress: createdCustomers[1].shippingAddress,
      items: items2,
      subtotal: subtotal2,
      taxBreakdown: {
        cgst: { rate: 6, amount: totalTax2 / 2 },
        sgst: { rate: 6, amount: totalTax2 / 2 },
      },
      totalTax: totalTax2,
      grandTotal: grandTotal2,
      amountInWords: numberToWords(Math.round(grandTotal2)) + ' Rupees Only',
      status: 'sent',
      createdBy: managerUser._id,
    });

    // Invoice 3 - MedSupply Distributors (Draft)
    const invoice3Items = [
      { product: createdProducts[15], qty: 50 }, // Wheelchair
      { product: createdProducts[16], qty: 30 }, // Walking Frame
      { product: createdProducts[14], qty: 100 }, // Pulse Oximeter
    ];
    let subtotal3 = 0;
    const items3 = invoice3Items.map(item => {
      const taxableAmount = item.product.unitPrice * item.qty;
      const taxAmount = (taxableAmount * item.product.taxRate) / 100;
      subtotal3 += taxableAmount;
      return {
        product: item.product._id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.qty,
        unit: item.product.unit,
        rate: item.product.unitPrice,
        taxRate: item.product.taxRate,
        taxableAmount,
        taxAmount,
        totalAmount: taxableAmount + taxAmount,
      };
    });
    const totalTax3 = items3.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal3 = subtotal3 + totalTax3;
    const discount3 = grandTotal3 * 0.05; // 5% discount

    invoices.push({
      invoiceNumber: 'MSC/2024-07/0003',
      invoiceDate: new Date('2024-07-20'),
      dueDate: new Date('2024-08-19'),
      customer: {
        name: createdCustomers[3].name,
        email: createdCustomers[3].email,
        phone: createdCustomers[3].phone,
        gstNumber: createdCustomers[3].gstNumber,
      },
      billingAddress: createdCustomers[3].billingAddress,
      shippingAddress: createdCustomers[3].shippingAddress,
      items: items3,
      subtotal: subtotal3,
      discountType: 'percentage',
      discountValue: 5,
      discountAmount: discount3,
      taxBreakdown: {
        cgst: { rate: 2.5, amount: totalTax3 / 2 },
        sgst: { rate: 2.5, amount: totalTax3 / 2 },
      },
      totalTax: totalTax3,
      grandTotal: grandTotal3 - discount3,
      amountInWords: numberToWords(Math.round(grandTotal3 - discount3)) + ' Rupees Only',
      status: 'draft',
      notes: 'Bulk order - Distributor discount applied',
      createdBy: adminUser._id,
    });

    // Invoice 4 - Government Hospital (Overdue)
    const invoice4Items = [
      { product: createdProducts[0], qty: 5 }, // Horizontal Autoclave
      { product: createdProducts[1], qty: 2 }, // Vertical Autoclave
    ];
    let subtotal4 = 0;
    const items4 = invoice4Items.map(item => {
      const taxableAmount = item.product.unitPrice * item.qty;
      const taxAmount = (taxableAmount * item.product.taxRate) / 100;
      subtotal4 += taxableAmount;
      return {
        product: item.product._id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.qty,
        unit: item.product.unit,
        rate: item.product.unitPrice,
        taxRate: item.product.taxRate,
        taxableAmount,
        taxAmount,
        totalAmount: taxableAmount + taxAmount,
      };
    });
    const totalTax4 = items4.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal4 = subtotal4 + totalTax4;

    invoices.push({
      invoiceNumber: 'MSC/2024-06/0008',
      invoiceDate: new Date('2024-06-01'),
      dueDate: new Date('2024-06-30'),
      customer: {
        name: createdCustomers[4].name,
        email: createdCustomers[4].email,
        phone: createdCustomers[4].phone,
        gstNumber: createdCustomers[4].gstNumber,
      },
      billingAddress: createdCustomers[4].billingAddress,
      shippingAddress: createdCustomers[4].shippingAddress,
      items: items4,
      subtotal: subtotal4,
      taxBreakdown: {
        igst: { rate: 12, amount: totalTax4 },
      },
      totalTax: totalTax4,
      grandTotal: grandTotal4,
      amountInWords: numberToWords(Math.round(grandTotal4)) + ' Rupees Only',
      status: 'overdue',
      notes: 'Government tender order',
      createdBy: adminUser._id,
    });

    // Invoice 5 - City Medical Centre (Paid)
    const invoice5Items = [
      { product: createdProducts[9], qty: 1 }, // Bone Saw
      { product: createdProducts[10], qty: 1 }, // Orthopedic Drill
    ];
    let subtotal5 = 0;
    const items5 = invoice5Items.map(item => {
      const taxableAmount = item.product.unitPrice * item.qty;
      const taxAmount = (taxableAmount * item.product.taxRate) / 100;
      subtotal5 += taxableAmount;
      return {
        product: item.product._id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.qty,
        unit: item.product.unit,
        rate: item.product.unitPrice,
        taxRate: item.product.taxRate,
        taxableAmount,
        taxAmount,
        totalAmount: taxableAmount + taxAmount,
      };
    });
    const totalTax5 = items5.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal5 = subtotal5 + totalTax5;

    invoices.push({
      invoiceNumber: 'MSC/2024-07/0004',
      invoiceDate: new Date('2024-07-25'),
      dueDate: new Date('2024-08-24'),
      customer: {
        name: createdCustomers[2].name,
        email: createdCustomers[2].email,
        phone: createdCustomers[2].phone,
        gstNumber: createdCustomers[2].gstNumber,
      },
      billingAddress: createdCustomers[2].billingAddress,
      shippingAddress: createdCustomers[2].shippingAddress,
      items: items5,
      subtotal: subtotal5,
      taxBreakdown: {
        cgst: { rate: 6, amount: totalTax5 / 2 },
        sgst: { rate: 6, amount: totalTax5 / 2 },
      },
      totalTax: totalTax5,
      grandTotal: grandTotal5,
      amountInWords: numberToWords(Math.round(grandTotal5)) + ' Rupees Only',
      status: 'paid',
      paymentMethod: 'upi',
      paymentDate: new Date('2024-07-26'),
      paymentReference: 'UPI/123456789012',
      createdBy: managerUser._id,
    });

    const createdInvoices = await Invoice.create(invoices);
    console.log(`Created ${createdInvoices.length} invoices`);

    // Create some QR Scans
    console.log('Creating QR scan records...');
    const qrScans = [
      {
        product: createdProducts[0]._id,
        action: 'view',
        device: 'Chrome Mobile - Android',
        scannedBy: createdUsers[2]._id,
      },
      {
        product: createdProducts[3]._id,
        action: 'stock_out',
        quantity: 2,
        invoice: createdInvoices[0]._id,
        device: 'Safari - iPhone',
        scannedBy: managerUser._id,
      },
      {
        product: createdProducts[12]._id,
        action: 'verify',
        device: 'Chrome - Windows',
        scannedBy: adminUser._id,
      },
      {
        product: createdProducts[15]._id,
        action: 'location_update',
        location: { latitude: 28.6139, longitude: 77.2090 },
        device: 'Chrome Mobile - Android',
        notes: 'Moved to warehouse B',
        scannedBy: createdUsers[3]._id,
      },
      {
        product: createdProducts[6]._id,
        action: 'add_to_invoice',
        quantity: 10,
        invoice: createdInvoices[0]._id,
        device: 'Firefox - macOS',
        scannedBy: managerUser._id,
      },
    ];
    await QRScan.create(qrScans);
    console.log(`Created ${qrScans.length} QR scan records`);

    console.log('\n========================================');
    console.log('Seed data created successfully!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- Warehouses: ${createdWarehouses.length}`);
    console.log(`- Suppliers: ${createdSuppliers.length}`);
    console.log(`- Customers: ${createdCustomers.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Invoices: ${createdInvoices.length}`);
    console.log(`- Stock Movements: ${stockMovements.length}`);
    console.log(`- QR Scans: ${qrScans.length}`);
    console.log('\nWarehouses:');
    createdWarehouses.forEach(w => console.log(`  - ${w.code}: ${w.name} (${w.type})`));
    console.log('\nLogin credentials:');
    console.log('- Admin: admin@growinch.com / Admin@123');
    console.log('- Manager: rajesh@growinch.com / Manager@123');
    console.log('- Staff: priya@growinch.com / Staff@123');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run seed
seedData();
