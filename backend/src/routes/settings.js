import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getPublicSettings,
  getDriveStatus,
  getDriveAuthUrl,
  handleDriveCallback,
  toggleBackupEnabled,
  ensureDriveFolder,
  runDriveBackup,
  validateDriveTokenStatus,
  updateNotifications,
  toggleSignups,
  updateStoreSettings,
} from '../controllers/settingsController.js';

const router = express.Router();

// Public: Get system settings (non-sensitive)
router.get('/', asyncHandler(getPublicSettings));

// Backup: status
router.get('/drive/status', verifyToken, authorize('backupSetting', 'read:any'), asyncHandler(getDriveStatus));

// Backup: validate token status
router.get('/drive/validate-token', verifyToken, authorize('backupSetting', 'read:any'), asyncHandler(validateDriveTokenStatus));

// Backup: get Google OAuth URL
router.get('/drive/auth-url', verifyToken, authorize('backupSetting', 'read:any'), asyncHandler(getDriveAuthUrl));

// Backup: OAuth callback (no auth header on this route)
router.get('/drive/callback', asyncHandler(handleDriveCallback));

// Backup: toggle enable
router.post('/backup-enabled', verifyToken, authorize('backupSetting', 'update:any'), asyncHandler(toggleBackupEnabled));

// Backup: ensure folder
router.post('/drive/ensure-folder', verifyToken, authorize('backupSetting', 'update:any'), asyncHandler(ensureDriveFolder));

// Backup: manual trigger
router.post('/drive/backup', verifyToken, authorize('backupSetting', 'update:any'), asyncHandler(runDriveBackup));

// Notifications: update inventory alert settings
router.post('/notifications', verifyToken, authorize('notificationSetting', 'update:any'), asyncHandler(updateNotifications));

// Owner-only: Toggle signups open/closed
router.post('/signups-open', verifyToken, authorize('signupSetting', 'update:any'), asyncHandler(toggleSignups));

// Owner/Admin: Update store settings
router.post('/store', verifyToken, authorize('storeSetting', 'update:any'), asyncHandler(updateStoreSettings));

export default router;
