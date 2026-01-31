import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  getPendingAdmins,
  approveAdmin,
  declineAdmin,
  updateUserRole,
  getPermissionCatalog,
  updateUserPermissionOverrides,
  getDeletionStatus,
  requestDeletion,
  cancelDeletion,
} from '../controllers/usersController.js';

const router = express.Router();

// Admin-specific routes should come first to avoid :id collisions
router.get('/admin/pending', verifyToken, asyncHandler(getPendingAdmins));
router.post('/admin/approve/:email', verifyToken, asyncHandler(approveAdmin));
router.post('/admin/decline/:email', verifyToken, asyncHandler(declineAdmin));

router.get('/me/deletion-status', verifyToken, asyncHandler(getDeletionStatus));
router.post('/me/deletion-request', verifyToken, asyncHandler(requestDeletion));
router.post('/me/deletion-cancel', verifyToken, asyncHandler(cancelDeletion));

router.get('/permissions/catalog', verifyToken, asyncHandler(getPermissionCatalog));

router.get('/', verifyToken, asyncHandler(getAllUsers));
router.get('/:id', verifyToken, asyncHandler(getUserById));
router.put('/:id', verifyToken, asyncHandler(updateUser));
router.patch('/:id/role', verifyToken, asyncHandler(updateUserRole));
router.patch('/:id/permission-overrides', verifyToken, asyncHandler(updateUserPermissionOverrides));

export default router;
