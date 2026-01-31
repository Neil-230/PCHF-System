import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getDashboardMetrics,
  getActiveLogEntries,
  clearActiveLog,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/metrics', verifyToken, authorize('dashboard', 'read:any'), asyncHandler(getDashboardMetrics));

router.get('/active-log', verifyToken, authorize('dashboard', 'read:any'), asyncHandler(getActiveLogEntries));

router.delete('/active-log', verifyToken, authorize('dashboard', 'delete:any'), asyncHandler(clearActiveLog));

export default router;
