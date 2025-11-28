import express from 'express';
import { User, PendingAdmin } from '../database/mongodb.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// ============ GET ALL USERS ============
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const filter = includeArchived ? {} : { isArchived: false };
  const users = await User.find(filter);
  res.json({ users: users.map(u => u.toJSON()) });
}));

// ============ GET USER BY ID ============
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.params.id, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: user.toJSON() });
}));

// ============ UPDATE USER ============
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const allowed = ['name', 'profilePic'];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  updates.updatedAt = new Date();

  const user = await User.findOne({ id: req.params.id, isArchived: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  Object.assign(user, updates);
  try {
    await user.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: user was updated concurrently. Please retry.' });
    }
    throw err;
  }

  res.json({ message: 'User updated', user: user.toJSON() });
}));

// ============ GET PENDING ADMINS ============
router.get('/admin/pending', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only owner or admin can view pending sign-ups' });
  }

  const pending = await PendingAdmin.find({});
  res.json({ pending: pending.map(p => p.toJSON()) });
}));

// ============ APPROVE ADMIN ============
router.post('/admin/approve/:email', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only owner or admin can approve sign-ups' });
  }

  const email = req.params.email;
  const adminToApprove = await PendingAdmin.findOne({ email });
  if (!adminToApprove) {
    return res.status(404).json({ error: 'Pending admin not found' });
  }

  // Approve pending user by role (admin or cashier)
  const roleToApprove = adminToApprove.role || 'admin';

  // If user already exists, update role accordingly; otherwise create
  let user = await User.findOne({ email });
  if (user) {
    user.role = roleToApprove;
    if (!user.isVerified) user.isVerified = true;
    await user.save();
  } else {
    user = new User({
      id: adminToApprove.id,
      name: adminToApprove.name,
      email: adminToApprove.email,
      password: adminToApprove.password,
      role: roleToApprove,
      isVerified: true,
      loginMethods: adminToApprove.googleId ? ['google'] : (adminToApprove.facebookId ? ['facebook'] : ['password']),
      passwordCreatedManually: !(adminToApprove.googleId || adminToApprove.facebookId),
      googleId: adminToApprove.googleId || undefined,
      facebookId: adminToApprove.facebookId || undefined,
    });
    await user.save();
  }

  await PendingAdmin.deleteOne({ email });

  res.json({ message: `${roleToApprove.charAt(0).toUpperCase() + roleToApprove.slice(1)} approved`, user: user.toJSON() });
}));

// ============ DECLINE ADMIN ============
router.post('/admin/decline/:email', verifyToken, asyncHandler(async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only owner or admin can decline sign-ups' });
  }

  const email = req.params.email;
  const pending = await PendingAdmin.findOne({ email });
  if (!pending) {
    return res.status(404).json({ error: 'Pending admin not found' });
  }

  await pending.deleteOne();

  await User.deleteOne({ email });

  res.json({ message: 'Sign-up request declined and account deleted' });
}));

// ============ ACCOUNT DELETION (30-DAY GRACE) ============
router.get('/me/deletion-status', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.deletionScheduledFor) {
    return res.json({ scheduledFor: null, daysRemaining: null });
  }
  const ms = user.deletionScheduledFor.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  res.json({ scheduledFor: user.deletionScheduledFor.toISOString(), daysRemaining });
}));

router.post('/me/deletion-request', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.deletionScheduledFor) {
    const now = new Date();
    const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    user.deletionRequestedAt = now;
    user.deletionScheduledFor = scheduled;
    await user.save();
  }

  const ms = user.deletionScheduledFor.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  res.json({ scheduledFor: user.deletionScheduledFor.toISOString(), daysRemaining });
}));

router.post('/me/deletion-cancel', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.deletionRequestedAt = null;
  user.deletionScheduledFor = null;
  await user.save();

  res.json({ scheduledFor: null, daysRemaining: null });
}));

export default router;
