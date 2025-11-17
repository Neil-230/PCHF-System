import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { SystemSettings } from '../database/mongodb.js';
import { getAuthUrl as driveAuthUrl, handleOAuthCallback, ensureFolder, uploadBackup } from '../services/driveService.js';

const router = express.Router();

// Public: Get system settings (non-sensitive)
router.get('/', asyncHandler(async (req, res) => {
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
}));

// Backup: status
router.get('/drive/status', verifyToken, authorize('backupSetting', 'read:any'), asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) {
    settings = new SystemSettings({ id: 'system' });
    await settings.save();
  }
  res.json({
    connected: !!settings.driveRefreshToken,
    backupEnabled: !!settings.backupEnabled,
    backupLastRun: settings.backupLastRun ? settings.backupLastRun.toISOString() : null,
    backupLastError: settings.backupLastError || '',
    driveFolderId: settings.driveFolderId || null,
  });
}));

// Backup: get Google OAuth URL
router.get('/drive/auth-url', verifyToken, authorize('backupSetting', 'read:any'), asyncHandler(async (req, res) => {
  const url = await driveAuthUrl();
  res.json({ url });
}));

// Backup: OAuth callback (no auth header on this route)
router.get('/drive/callback', asyncHandler(async (req, res) => {
  const code = req.query.code;
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!code) return res.redirect(`${FRONTEND}/?drive=error`);
  try {
    await handleOAuthCallback(code);
    res.redirect(`${FRONTEND}/?drive=connected`);
  } catch (e) {
    res.redirect(`${FRONTEND}/?drive=error`);
  }
}));

// Backup: toggle enable
router.post('/backup-enabled', verifyToken, authorize('backupSetting', 'update:any'), asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be a boolean' });
  }
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) {
    settings = new SystemSettings({ id: 'system' });
  }
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
}));

// Backup: ensure folder
router.post('/drive/ensure-folder', verifyToken, authorize('backupSetting', 'update:any'), asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  const id = await ensureFolder(name || 'PCH_Backups');
  res.json({ driveFolderId: id });
}));

// Backup: manual trigger
router.post('/drive/backup', verifyToken, authorize('backupSetting', 'update:any'), asyncHandler(async (req, res) => {
  const result = await uploadBackup();
  res.json({ message: 'Backup created', file: result });
}));

// Notifications: update inventory alert settings
router.post('/notifications', verifyToken, authorize('notificationSetting', 'update:any'), asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) {
    settings = new SystemSettings({ id: 'system' });
  }
  if (typeof req.body.notifyLowStock === 'boolean') settings.notifyLowStock = req.body.notifyLowStock;
  if (typeof req.body.notifyOutOfStock === 'boolean') settings.notifyOutOfStock = req.body.notifyOutOfStock;
  if (req.body.lowStockThreshold != null) {
    const n = Number(req.body.lowStockThreshold);
    if (Number.isNaN(n) || n < 0) return res.status(400).json({ error: 'Invalid lowStockThreshold' });
    settings.lowStockThreshold = n;
  }
  if (req.body.notificationMethod != null) {
    const v = String(req.body.notificationMethod);
    if (!['email','sms','both'].includes(v)) return res.status(400).json({ error: 'Invalid notificationMethod' });
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
}));

// Owner-only: Toggle signups open/closed
router.post('/signups-open', verifyToken, authorize('signupSetting', 'update:any'), asyncHandler(async (req, res) => {

  const { signupsOpen } = req.body;
  if (typeof signupsOpen !== 'boolean') {
    return res.status(400).json({ error: 'signupsOpen must be a boolean' });
  }

  const now = new Date();
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) settings = new SystemSettings({ id: 'system' });
  settings.signupsOpen = signupsOpen;
  settings.updatedAt = now;
  try {
    await settings.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: settings updated concurrently. Please retry.' });
    }
    throw err;
  }

  res.json({ id: settings.id, signupsOpen: settings.signupsOpen, updatedAt: settings.updatedAt });
}));

// Owner/Admin: Update store settings
router.post('/store', verifyToken, authorize('storeSetting', 'update:any'), asyncHandler(async (req, res) => {

  const allowed = ['storeName','storeAddress','phone','email','taxRate','currency','footerMessage'];
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) settings = new SystemSettings({ id: 'system' });
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
}));

export default router;
