import { User, PendingAdmin } from '../database/mongodb.js';
import { PERMISSION_CATALOG, isValidPermission } from '../constants/permissions.js';
import { emailHashFilter } from '../utils/emailLookup.js';

const sanitizeOverridesInput = (rawOverrides = []) => {
  if (!Array.isArray(rawOverrides)) {
    throw new Error('Overrides must be an array.');
  }
  if (rawOverrides.length > 50) {
    throw new Error('Too many overrides submitted (max 50).');
  }

  const allowedEffects = new Set(['allow', 'deny']);
  const allowedActions = new Set(['create', 'read', 'update', 'delete']);
  const allowedPossessions = new Set(['any', 'own']);
  const seenKeys = new Set();

  return rawOverrides.map((override, index) => {
    if (!override || typeof override !== 'object') {
      throw new Error(`Override at index ${index} is invalid.`);
    }
    const resource = typeof override.resource === 'string' ? override.resource.trim() : '';
    const action = override.action;
    const possession = override.possession || 'any';
    const effect = override.effect;

    if (!resource) {
      throw new Error(`Override at index ${index} is missing a resource.`);
    }
    if (!allowedActions.has(action)) {
      throw new Error(`Invalid action: ${action}`);
    }
    if (!allowedPossessions.has(possession)) {
      throw new Error(`Invalid possession: ${possession}`);
    }
    if (!allowedEffects.has(effect)) {
      throw new Error(`Invalid effect: ${effect}`);
    }
    if (!isValidPermission(resource, action, possession)) {
      throw new Error(`Permission ${resource}:${action}:${possession} is not recognized.`);
    }

    const key = `${resource}:${action}:${possession}`;
    if (seenKeys.has(key)) {
      throw new Error(`Duplicate override submitted for ${key}.`);
    }
    seenKeys.add(key);

    return { resource, action, possession, effect };
  });
};

export const getAllUsers = async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const filter = includeArchived ? {} : { isArchived: false };
  const users = await User.find(filter);
  res.json({ users: users.map(u => u.toJSON()) });
};

export const getUserById = async (req, res) => {
  const user = await User.findOne({ id: req.params.id, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: user.toJSON() });
};

export const updateUser = async (req, res) => {
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

  const clientVersion = req.body.version ?? req.body.__v;
  if (clientVersion === undefined) {
    return res.status(400).json({ error: 'Version is required to update user.' });
  }
  if (Number(clientVersion) !== user.__v) {
    return res.status(409).json({ error: 'Conflict: user data is stale. Please refresh and retry.' });
  }

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
};

export const getPendingAdmins = async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only owner or admin can view pending sign-ups' });
  }

  const pending = await PendingAdmin.find({});
  res.json({ pending: pending.map(p => p.toJSON()) });
};

export const approveAdmin = async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only owner or admin can approve sign-ups' });
  }

  const email = req.params.email;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  const filter = emailHashFilter(sanitizedEmail);
  const adminToApprove = await PendingAdmin.findOne(filter);
  if (!adminToApprove) {
    return res.status(404).json({ error: 'Pending admin not found' });
  }

  const roleToApprove = adminToApprove.role || 'admin';

  let user = await User.findOne(filter, { isArchived: false });
  if (user) {
    // Update existing user atomically
    user = await User.findOneAndUpdate(
      filter,
      {
        $set: {
          role: roleToApprove,
          isVerified: true,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
  } else {
    // Create new user
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
    try {
      await user.save();
    } catch (err) {
      if (err.code === 11000) {
        // Another request created it, fetch it
        user = await User.findOne(filter);
      } else {
        throw err;
      }
    }
  }

  await PendingAdmin.deleteOne(filter);

  res.json({ message: `${roleToApprove.charAt(0).toUpperCase() + roleToApprove.slice(1)} approved`, user: user.toJSON() });
};

export const declineAdmin = async (req, res) => {
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only owner or admin can decline sign-ups' });
  }

  const email = req.params.email;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  const filter = emailHashFilter(sanitizedEmail);
  const pending = await PendingAdmin.findOne(filter);
  if (!pending) {
    return res.status(404).json({ error: 'Pending admin not found' });
  }

  await pending.deleteOne();
  await User.deleteOne(filter);

  res.json({ message: 'Sign-up request declined and account deleted' });
};

export const updateUserRole = async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can modify user roles' });
  }
  const { role } = req.body;
  if (!role || !['admin', 'cashier'].includes(role)) {
    return res.status(400).json({ error: 'Role must be admin or cashier' });
  }
  const target = await User.findOne({ id: req.params.id, isArchived: false });
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (target.role === 'owner') {
    return res.status(400).json({ error: 'Owner role cannot be changed' });
  }
  target.role = role;
  target.updatedAt = new Date();
  await target.save();
  res.json({ message: 'User role updated', user: target.toJSON() });
};

export const getPermissionCatalog = async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can view the permission catalog' });
  }
  res.json({ catalog: PERMISSION_CATALOG });
};

export const updateUserPermissionOverrides = async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can modify permission overrides' });
  }

  const target = await User.findOne({ id: req.params.id, isArchived: false });
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (target.role === 'owner') {
    return res.status(400).json({ error: 'Owner permissions cannot be overridden' });
  }

  const clientVersion = req.body.version ?? req.body.__v;
  if (clientVersion === undefined) {
    return res.status(400).json({ error: 'Version is required to update permission overrides.' });
  }
  if (Number(clientVersion) !== target.__v) {
    return res.status(409).json({ error: 'Conflict: user data is stale. Please refresh and retry.' });
  }

  const rawOverrides = req.body.overrides ?? [];
  let sanitizedOverrides;
  try {
    sanitizedOverrides = sanitizeOverridesInput(rawOverrides);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid overrides payload' });
  }

  target.permissionOverrides = sanitizedOverrides;
  target.updatedAt = new Date();

  try {
    await target.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: user was updated concurrently. Please retry.' });
    }
    throw err;
  }

  res.json({ message: 'Permission overrides updated', user: target.toJSON() });
};

export const getDeletionStatus = async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.deletionScheduledFor) {
    return res.json({ scheduledFor: null, daysRemaining: null });
  }
  const ms = user.deletionScheduledFor.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  res.json({ scheduledFor: user.deletionScheduledFor.toISOString(), daysRemaining });
};

export const requestDeletion = async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.deletionScheduledFor) {
    // Already scheduled, return existing date
    const ms = user.deletionScheduledFor.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    return res.json({ scheduledFor: user.deletionScheduledFor.toISOString(), daysRemaining, alreadyScheduled: true });
  }

  // Schedule deletion atomically using findOneAndUpdate
  const now = new Date();
  const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const updated = await User.findOneAndUpdate(
    { id: req.user.id, isArchived: false, deletionScheduledFor: null },
    {
      $set: {
        deletionRequestedAt: now,
        deletionScheduledFor: scheduled,
      }
    },
    { new: true }
  );

  if (!updated) {
    // Another request beat us to it, fetch current state
    const current = await User.findOne({ id: req.user.id });
    const ms = current.deletionScheduledFor.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
    return res.json({ scheduledFor: current.deletionScheduledFor.toISOString(), daysRemaining });
  }

  const ms = updated.deletionScheduledFor.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  res.json({ scheduledFor: updated.deletionScheduledFor.toISOString(), daysRemaining });
};

export const cancelDeletion = async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.deletionRequestedAt = null;
  user.deletionScheduledFor = null;
  await user.save();

  res.json({ scheduledFor: null, daysRemaining: null });
};
