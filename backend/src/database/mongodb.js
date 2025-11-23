import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'cashier'], default: 'cashier' },
  googleId: { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },
  profilePic: { type: String },
  loginMethods: { type: [String], default: [] },
  isVerified: { type: Boolean, default: false },
  passwordCreatedManually: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null },
  deletionRequestedAt: { type: Date, default: null },
  deletionScheduledFor: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: {
    ip: { type: String, default: null },
    country: { type: String, default: null },
    region: { type: String, default: null },
    city: { type: String, default: null },
    org: { type: String, default: null },
    timezone: { type: String, default: null },
    at: { type: Date, default: null },
  }
}, { optimisticConcurrency: true });

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  used: { type: Boolean, default: false }
});

// Pending Admin Schema
const pendingAdminSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  googleId: { type: String, sparse: true },
  facebookId: { type: String, sparse: true },
  role: { type: String, default: 'admin' },
  emailVerified: { type: Boolean, default: false },
  passwordSet: { type: Boolean, default: false },
  requestedAt: { type: Date, default: Date.now }
}, { optimisticConcurrency: true });

// Product Schema
const productSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  sku: { type: String, unique: true, required: true },
  category: { type: String },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { optimisticConcurrency: true });

// Transaction Item Subschema
const transactionItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  items: { type: [transactionItemSchema], default: [] },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  customerName: { type: String },
  customerContact: { type: String },
  customerAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['completed', 'pending', 'refunded'], default: 'completed' },
  paymentMethod: { type: String, default: 'Cash' },
  handledBy: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
  },
  isDelivery: { type: Boolean, default: false },
  deliveryFee: { type: Number },
  requestInfo: {
    ip: { type: String, default: null },
    country: { type: String, default: null },
    region: { type: String, default: null },
    city: { type: String, default: null },
    org: { type: String, default: null },
    timezone: { type: String, default: null },
  },
});

// System Settings Schema (singleton)
const systemSettingsSchema = new mongoose.Schema({
  id: { type: String, unique: true, default: 'system' },
  signupsOpen: { type: Boolean, default: false },
  // Store info for receipts and POS defaults
  storeName: { type: String, default: 'My Store' },
  storeAddress: { type: String, default: '123 Main St, City, State 12345' },
  phone: { type: String, default: '+63 912 345 6789' },
  email: { type: String, default: 'store@example.com' },
  taxRate: { type: Number, default: 10 },
  currency: { type: String, default: 'PHP' },
  footerMessage: { type: String, default: 'Thank you for your purchase! Please come again.' },
  notifyLowStock: { type: Boolean, default: false },
  notifyOutOfStock: { type: Boolean, default: false },
  lowStockThreshold: { type: Number, default: 10 },
  notificationMethod: { type: String, enum: ['email', 'sms', 'both'], default: 'email' },
  // Cloud backup (Google Drive)
  backupEnabled: { type: Boolean, default: false },
  backupLastRun: { type: Date, default: null },
  backupLastError: { type: String, default: '' },
  driveFolderId: { type: String, default: null },
  driveRefreshToken: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
}, { optimisticConcurrency: true });

export const User = mongoose.model('User', userSchema);
export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
export const PendingAdmin = mongoose.model('PendingAdmin', pendingAdminSchema);
export const Product = mongoose.model('Product', productSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};