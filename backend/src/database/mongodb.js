// Centralized Mongo connection + schema exports (User, Product, Transaction, SystemSettings, etc.).
import mongoose from 'mongoose';
import { encryptValue, decryptValue, hashEmail, isEncryptedPayload } from '../utils/encryption.js';

// MongoDB’s MVCC is enabled via optimisticConcurrency so each write checks the __v version key
// instead of silently overwriting stale documents.
const applyEncryptedField = (schema, fieldName, {
  hashField,
  hashFn,
  hashUnique = false,
  hashRequired = false,
} = {}) => {
  const cacheKey = `__plain_${fieldName}`;
  if (hashField && !schema.path(hashField)) {
    const hashDef = {
      type: String,
      index: true,
    };
    if (hashUnique) hashDef.unique = true;
    if (!hashRequired) hashDef.sparse = true;
    schema.add({ [hashField]: hashDef });
  }

  const path = schema.path(fieldName);
  if (!path) {
    throw new Error(`applyEncryptedField: schema missing path ${fieldName}`);
  }

  path.get(function getEncrypted(value) {
    if (!value) return value;
    if (this[cacheKey]) return this[cacheKey];
    if (isEncryptedPayload(value)) {
      const plain = decryptValue(value);
      this[cacheKey] = plain;
      return plain;
    }
    this[cacheKey] = value;
    return value;
  });

  path.set(function setEncrypted(value) {
    if (value == null) {
      if (hashField) this.set(hashField, null);
      this[cacheKey] = null;
      return value;
    }
    const stringValue = String(value).trim();
    this[cacheKey] = stringValue;
    if (hashField && hashFn) {
      this.set(hashField, hashFn(stringValue));
    }
    return isEncryptedPayload(stringValue) ? stringValue : encryptValue(stringValue);
  });

  schema.post('init', function clearEncryptionCache(doc) {
    if (doc) {
      doc[cacheKey] = undefined;
    }
  });

  schema.pre('save', function encryptBeforeSave(next) {
    const raw = this.get(fieldName, null, { getters: false });
    if (!raw) return next();
    if (!isEncryptedPayload(raw)) {
      const plain = this[fieldName];
      this.set(fieldName, plain);
      return next();
    }
    if (hashField && hashFn && !this.get(hashField)) {
      const plain = this[fieldName];
      this.set(hashField, plain ? hashFn(plain) : null);
    }
    return next();
  });
};

// User Schema
const permissionOverrideSchema = new mongoose.Schema({
  resource: { type: String, required: true },
  action: { type: String, enum: ['create', 'read', 'update', 'delete'], required: true },
  possession: { type: String, enum: ['any', 'own'], default: 'any' },
  effect: { type: String, enum: ['allow', 'deny'], required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
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
    loc: { type: String, default: null },
    org: { type: String, default: null },
    timezone: { type: String, default: null },
    at: { type: Date, default: null },
  },
  permissionOverrides: { type: [permissionOverrideSchema], default: [] },
  lastLogout: {
    ip: { type: String, default: null },
    country: { type: String, default: null },
    region: { type: String, default: null },
    city: { type: String, default: null },
    loc: { type: String, default: null },
    org: { type: String, default: null },
    timezone: { type: String, default: null },
    at: { type: Date, default: null },
  },
  phoneNumber: { type: String, default: null },
}, { optimisticConcurrency: true, toJSON: { getters: true } });

applyEncryptedField(userSchema, 'email', {
  hashField: 'emailHash',
  hashFn: hashEmail,
  hashUnique: true,
  hashRequired: true,
});

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  used: { type: Boolean, default: false }
});

applyEncryptedField(passwordResetSchema, 'email', {
  hashField: 'emailHash',
  hashFn: hashEmail,
  hashUnique: false,
  hashRequired: false,
});

// Pending Admin Schema (also safeguarded by MVCC through optimisticConcurrency)
const pendingAdminSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  googleId: { type: String, sparse: true },
  facebookId: { type: String, sparse: true },
  role: { type: String, default: 'admin' },
  emailVerified: { type: Boolean, default: false },
  passwordSet: { type: Boolean, default: false },
  requestedAt: { type: Date, default: Date.now }
}, { optimisticConcurrency: true, toJSON: { getters: true } });

applyEncryptedField(pendingAdminSchema, 'email', {
  hashField: 'emailHash',
  hashFn: hashEmail,
  hashUnique: true,
  hashRequired: true,
});

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
}, { optimisticConcurrency: true, toJSON: { getters: true } });

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
}, { toJSON: { getters: true } });

applyEncryptedField(transactionSchema, 'customerContact');
applyEncryptedField(transactionSchema, 'handledBy.email', {
  hashField: 'handledByEmailHash',
  hashFn: hashEmail,
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
  nextTransactionNumber: { type: Number, default: 1 },
  // Cloud backup (Google Drive)
  backupEnabled: { type: Boolean, default: false },
  backupLastRun: { type: Date, default: null },
  backupLastError: { type: String, default: '' },
  driveFolderId: { type: String, default: null },
  driveRefreshToken: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now }
}, { optimisticConcurrency: true });

applyEncryptedField(systemSettingsSchema, 'email');
applyEncryptedField(systemSettingsSchema, 'phone');

const userActivityLogSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  type: { type: String, enum: ['login', 'logout'], required: true },
  ip: { type: String, default: null },
  country: { type: String, default: null },
  region: { type: String, default: null },
  city: { type: String, default: null },
  loc: { type: String, default: null },
  org: { type: String, default: null },
  timezone: { type: String, default: null },
  at: { type: Date, default: Date.now },
}, { timestamps: false, toJSON: { getters: true } });

applyEncryptedField(userActivityLogSchema, 'email', {
  hashField: 'emailHash',
  hashFn: hashEmail,
});

export const User = mongoose.model('User', userSchema);
export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);
export const PendingAdmin = mongoose.model('PendingAdmin', pendingAdminSchema);
export const Product = mongoose.model('Product', productSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);
export const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);

// MongoDB connection with resilience: retry logic, pool configuration, and event monitoring
const MONGO_CONNECT_OPTIONS = {
  // Connection pool configuration
  maxPoolSize: 20,           // Max concurrent connections
  minPoolSize: 5,            // Min connections to maintain
  // Timeout settings
  serverSelectionTimeoutMS: 5000,  // Time to wait for server selection
  socketTimeoutMS: 45000,          // Socket timeout for idle connections
  connectTimeoutMS: 10000,         // Time to establish initial connection
  // Automatic retries (driver-level)
  retryWrites: true,               // Retry failed writes
  retryReads: true,                // Retry failed reads
  // Connection monitoring
  heartbeatFrequencyMS: 30000,     // Check server health every 30s
  monitorCommands: false,          // Don't log all commands (verbose)
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const connectDB = async () => {
  const maxRetries = 5;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set. Please configure it in your .env file.');
      }

      console.log(`[MongoDB] Connection attempt ${attempt}/${maxRetries}...`);
      await mongoose.connect(process.env.MONGODB_URI, MONGO_CONNECT_OPTIONS);
      console.log('[MongoDB] Connected successfully');

      // Setup connection event listeners for runtime monitoring
      setupConnectionEventListeners();
      return; // Success
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.error(`[MongoDB] Connection failed (attempt ${attempt}/${maxRetries}):`, err.message);
        console.log(`[MongoDB] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  console.error('[MongoDB] Failed to connect after all retry attempts:', lastError);
  process.exit(1);
};

// Setup event listeners for runtime connection monitoring
function setupConnectionEventListeners() {
  const connection = mongoose.connection;

  connection.on('connected', () => {
    console.log('[MongoDB] Connected to database');
  });

  connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
    // Note: MongoDB driver handles automatic reconnection for transient errors
  });

  connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database');
  });

  connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected to database');
  });

  // Gracefully close connection on process termination
  process.on('SIGINT', async () => {
    try {
      console.log('[MongoDB] Closing connection on process exit...');
      await mongoose.connection.close();
      process.exit(0);
    } catch (err) {
      console.error('[MongoDB] Error closing connection:', err);
      process.exit(1);
    }
  });
}