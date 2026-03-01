import { SystemSettings } from '../database/mongodb.js';
import { getAuthUrl as driveAuthUrl, handleOAuthCallback, ensureFolder, uploadBackup, validateDriveToken } from '../services/driveService.js';

const getOrCreateSettings = async () => {
  try {
    const settings = await SystemSettings.findOneAndUpdate(
      { id: 'system' },
      { $setOnInsert: { id: 'system', createdAt: new Date() } },
      { upsert: true, new: true }
    );
    return settings;
  } catch (err) {
    if (err.code === 11000) {
      // Another request created it, fetch it
      return await SystemSettings.findOne({ id: 'system' });
    }
    throw err;
  }
};

export const getPublicSettings = async (_req, res) => {
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) {
    settings = new SystemSettings({ id: 'system', signupsOpen: false });
    await settings.save();
  }
  res.json({
    id: settings.id,
    signupsOpen: settings.signupsOpen,
    storeName: settings.storeName,
    storeAddress: settings.storeAddress,
    phone: settings.phone,
    email: settings.email,
    taxRate: settings.taxRate,
    currency: settings.currency,
    footerMessage: settings.footerMessage,
    notifyLowStock: !!settings.notifyLowStock,
    notifyOutOfStock: !!settings.notifyOutOfStock,
    lowStockThreshold: settings.lowStockThreshold,
    notificationMethod: settings.notificationMethod || 'email',
    updatedAt: settings.updatedAt,
  });
};

export const getDriveStatus = async (_req, res) => {
  const settings = await getOrCreateSettings();
  res.json({
    connected: !!settings.driveRefreshToken,
    backupEnabled: !!settings.backupEnabled,
    backupLastRun: settings.backupLastRun ? settings.backupLastRun.toISOString() : null,
    backupLastError: settings.backupLastError || '',
    driveFolderId: settings.driveFolderId || null,
  });
};

export const getDriveAuthUrl = async (_req, res) => {
  const url = await driveAuthUrl();
  res.json({ url });
};

export const handleDriveCallback = async (req, res) => {
  const code = req.query.code;
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!code) return res.redirect(`${FRONTEND}/?drive=error`);
  try {
    await handleOAuthCallback(code);
    res.redirect(`${FRONTEND}/?drive=connected`);
  } catch (e) {
    res.redirect(`${FRONTEND}/?drive=error`);
  }
};

export const toggleBackupEnabled = async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  const settings = await getOrCreateSettings();
  settings.backupEnabled = enabled;
  settings.updatedAt = new Date();
  try {
    await settings.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: settings updated concurrently. Please retry.' });
    }
    throw err;
  }
  res.json({ backupEnabled: !!settings.backupEnabled });
};

export const ensureDriveFolder = async (req, res) => {
  const { name } = req.body || {};
  const id = await ensureFolder(name || 'PCH_Backups');
  res.json({ driveFolderId: id });
};

export const runDriveBackup = async (_req, res) => {
  try {
    const result = await uploadBackup();
    res.json({ message: 'Backup created', file: result });
  } catch (err) {
    console.error('Backup failed:', err.message);
    return res.status(500).json({ 
      error: 'Backup failed: ' + (err?.message || 'Unknown error')
    });
  }
};

export const validateDriveTokenStatus = async (_req, res) => {
  try {
    const validation = await validateDriveToken();
    res.json(validation);
  } catch (err) {
    console.error('Drive token validation failed:', err.message);
    return res.status(500).json({ 
      error: 'Token validation failed',
      valid: false
    });
  }
};

export const updateNotifications = async (req, res) => {
  const settings = await getOrCreateSettings();
  if (typeof req.body.notifyLowStock === 'boolean') settings.notifyLowStock = req.body.notifyLowStock;
  if (typeof req.body.notifyOutOfStock === 'boolean') settings.notifyOutOfStock = req.body.notifyOutOfStock;
  if (req.body.lowStockThreshold != null) {
    const n = Number(req.body.lowStockThreshold);
    if (Number.isNaN(n) || n < 0) return res.status(400).json({ error: 'Invalid lowStockThreshold' });
    settings.lowStockThreshold = n;
  }
  if (req.body.notificationMethod != null) {
    const v = String(req.body.notificationMethod);
    if (!['email', 'sms', 'both'].includes(v)) return res.status(400).json({ error: 'Invalid notificationMethod' });
    settings.notificationMethod = v;
  }
  settings.updatedAt = new Date();
  try {
    await settings.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: settings updated concurrently. Please retry.' });
    }
    throw err;
  }
  res.json({
    notifyLowStock: !!settings.notifyLowStock,
    notifyOutOfStock: !!settings.notifyOutOfStock,
    lowStockThreshold: settings.lowStockThreshold,
    notificationMethod: settings.notificationMethod || 'email',
  });
};

export const toggleSignups = async (req, res) => {
  const { signupsOpen } = req.body;
  if (typeof signupsOpen !== 'boolean') {
    return res.status(400).json({ error: 'signupsOpen must be a boolean' });
  }
  const settings = await getOrCreateSettings();
  settings.signupsOpen = signupsOpen;
  settings.updatedAt = new Date();
  try {
    await settings.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: settings updated concurrently. Please retry.' });
    }
    throw err;
  }
  res.json({ id: settings.id, signupsOpen: settings.signupsOpen, updatedAt: settings.updatedAt });
};

export const updateStoreSettings = async (req, res) => {
  const allowed = ['storeName', 'storeAddress', 'phone', 'email', 'taxRate', 'currency', 'footerMessage'];
  const settings = await getOrCreateSettings();
  for (const key of allowed) {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  }
  if (settings.taxRate != null) {
    const n = Number(settings.taxRate);
    if (Number.isNaN(n) || n < 0) return res.status(400).json({ error: 'Invalid taxRate' });
    settings.taxRate = n;
  }
  settings.updatedAt = new Date();
  try {
    await settings.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: settings updated concurrently. Please retry.' });
    }
    throw err;
  }
  res.json({
    id: settings.id,
    signupsOpen: settings.signupsOpen,
    storeName: settings.storeName,
    storeAddress: settings.storeAddress,
    phone: settings.phone,
    email: settings.email,
    taxRate: settings.taxRate,
    currency: settings.currency,
    footerMessage: settings.footerMessage,
    updatedAt: settings.updatedAt,
  });
};
