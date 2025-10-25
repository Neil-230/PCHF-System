import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../database/mongodb.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get all products with optional filters
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const { q, category } = req.query;
  const filter = {};
  if (q) {
    const regex = new RegExp(String(q), 'i');
    filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
  }
  if (category) {
    filter.category = category;
  }
  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json({ products: products.map(p => p.toJSON()) });
}));

// Get single product by id
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: product.toJSON() });
}));

// Create product (owner/admin)
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const { role } = req.user || {};
  if (!['owner', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { name, sku, category, price, stock, description } = req.body;
  if (!name || !sku || price == null) {
    return res.status(400).json({ error: 'name, sku and price are required' });
  }

  const exists = await Product.findOne({ $or: [{ id: req.body.id }, { sku }] });
  if (exists) return res.status(409).json({ error: 'Product with same ID or SKU already exists' });

  const product = new Product({
    id: req.body.id || uuidv4(),
    name,
    sku,
    category,
    price,
    stock: stock ?? 0,
    description,
  });
  await product.save();
  res.status(201).json({ message: 'Product created', product: product.toJSON() });
}));

// Update product (owner/admin)
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
  const { role } = req.user || {};
  if (!['owner', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const updates = { ...req.body, updatedAt: new Date() };
  const product = await Product.findOneAndUpdate({ id: req.params.id }, updates, { new: true });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product updated', product: product.toJSON() });
}));

// Delete product (owner/admin)
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can delete products' });
  }
  const deleted = await Product.findOneAndDelete({ id: req.params.id });
  if (!deleted) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
}));

export default router;
