import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
} from '../controllers/productsController.js';

const router = express.Router();

// Get all products with optional filters
router.get('/', verifyToken, authorize('product', 'read:any'), asyncHandler(listProducts));

// Get single product by id
router.get('/:id', verifyToken, authorize('product', 'read:any'), asyncHandler(getProductById));

// Create product (owner/admin)
router.post('/', verifyToken, authorize('product', 'create:any'), asyncHandler(createProduct));

// Update product (owner/admin)
router.put('/:id', verifyToken, authorize('product', 'update:any'), asyncHandler(updateProduct));

// Restore product (owner/admin)
router.post('/:id/restore', verifyToken, authorize('product', 'update:any'), asyncHandler(restoreProduct));

// Archive product (owner/admin)
router.delete('/:id', verifyToken, authorize('product', 'delete:any'), asyncHandler(archiveProduct));

export default router;
