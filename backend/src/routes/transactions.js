import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { transactionLimiter } from '../middleware/rateLimiters.js';
import {
  listTransactions,
  createTransaction,
  deleteTransactions,
} from '../controllers/transactionsController.js';

const router = express.Router();

// Get transactions with optional filters
router.get('/', verifyToken, authorize('transaction', 'read:any'), asyncHandler(listTransactions));

// Create a transaction and update stock
router.post('/', transactionLimiter, verifyToken, authorize('transaction', 'create:any'), asyncHandler(createTransaction));

// Delete ALL transactions (owner/admin per RBAC)
router.delete('/', verifyToken, authorize('transaction', 'delete:any'), asyncHandler(deleteTransactions));

export default router;
