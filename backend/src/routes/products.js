import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Product, SystemSettings } from '../database/mongodb.js';
import { verifyToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendGenericEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';

const router = express.Router();

// Get all products with optional filters
router.get('/', verifyToken, authorize('product', 'read:any'), asyncHandler(async (req, res) => {
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
router.get('/:id', verifyToken, authorize('product', 'read:any'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: product.toJSON() });
}));

// Create product (owner/admin)
router.post('/', verifyToken, authorize('product', 'create:any'), asyncHandler(async (req, res) => {

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
router.put('/:id', verifyToken, authorize('product', 'update:any'), asyncHandler(async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const updates = { ...req.body };
  Object.assign(product, updates);
  product.updatedAt = new Date();
  try {
    await product.save();
  } catch (err) {
    if (err && err.name === 'VersionError') {
      return res.status(409).json({ error: 'Conflict: product was updated concurrently. Please retry.' });
    }
    throw err;
  }
  if (typeof updates.stock === 'number') {
    const settings = await SystemSettings.findOne({ id: 'system' });
    if (settings) {
      const threshold = typeof settings.lowStockThreshold === 'number' ? settings.lowStockThreshold : 10;
      const isOut = settings.notifyOutOfStock && product.stock === 0;
      const isLow = settings.notifyLowStock && product.stock > 0 && product.stock <= threshold;
      if (isOut || isLow) {
        const method = settings.notificationMethod || 'email';
        const wantsEmail = method === 'email' || method === 'both';
        const wantsSMS = method === 'sms' || method === 'both';
        const emailTo = settings.email;
        const smsTo = settings.phone;
        const typeText = isOut ? 'Out of stock' : 'Low stock';
        const smsBody = `Inventory alert:\n${typeText}: ${product.name} (SKU: ${product.sku}) – stock: ${product.stock}`;
        const emailHtml = `<div style="font-family:Arial,sans-serif"><p>Inventory alert:</p><ul><li>${typeText}: ${product.name} (SKU: ${product.sku}) – stock: ${product.stock}</li></ul></div>`;
        try { if (wantsEmail && emailTo) { await sendGenericEmail(emailTo, 'Inventory alert', emailHtml); } } catch {}
        try { if (wantsSMS && smsTo) { await sendSMS(smsTo, smsBody); } } catch {}
      }
    }
  }
  res.json({ message: 'Product updated', product: product.toJSON() });
}));

// Delete product (owner/admin)
router.delete('/:id', verifyToken, authorize('product', 'delete:any'), asyncHandler(async (req, res) => {
  const deleted = await Product.findOneAndDelete({ id: req.params.id });
  if (!deleted) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
}));

export default router;
