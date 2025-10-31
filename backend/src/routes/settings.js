import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyToken } from '../middleware/auth.js';
import { SystemSettings } from '../database/mongodb.js';

const router = express.Router();

// Public: Get system settings (non-sensitive)
router.get('/', asyncHandler(async (req, res) => {
  let settings = await SystemSettings.findOne({ id: 'system' });
  if (!settings) {
    settings = new SystemSettings({ id: 'system', signupsOpen: false });
    await settings.save();
  }
  res.json({ id: settings.id, signupsOpen: settings.signupsOpen, updatedAt: settings.updatedAt });
}));

// Owner-only: Toggle signups open/closed
router.post('/signups-open', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can change this setting' });
  }

  const { signupsOpen } = req.body;
  if (typeof signupsOpen !== 'boolean') {
    return res.status(400).json({ error: 'signupsOpen must be a boolean' });
  }

  const now = new Date();
  const settings = await SystemSettings.findOneAndUpdate(
    { id: 'system' },
    { signupsOpen, updatedAt: now },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ id: settings.id, signupsOpen: settings.signupsOpen, updatedAt: settings.updatedAt });
}));

export default router;
