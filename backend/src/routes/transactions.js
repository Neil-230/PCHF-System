import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User, Product, Transaction, SystemSettings } from '../database/mongodb.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendGenericEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';

const router = express.Router();

// Get transactions with optional filters
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
  const { q, dateFrom, dateTo, paymentMethod, status } = req.query;

  const filter = {};
  if (q) {
    const regex = new RegExp(String(q), 'i');
    filter.$or = [
      { id: regex },
      { customerName: regex },
      { 'handledBy.name': regex },
      { paymentMethod: regex },
    ];
  }
  if (dateFrom || dateTo) {
    filter.timestamp = {};
    if (dateFrom) filter.timestamp.$gte = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23,59,59,999);
      filter.timestamp.$lt = end;
    }
  }
  if (paymentMethod) filter.paymentMethod = String(paymentMethod);
  if (status) filter.status = String(status);

  const txns = await Transaction.find(filter).sort({ timestamp: -1 }).limit(limit);
  res.json({ transactions: txns.map(t => t.toJSON()) });
}));

// Create a transaction and update stock
router.post('/', verifyToken, asyncHandler(async (req, res) => {
  const { items, subtotal, tax, deliveryFee, total, customerName, customerContact, customerAddress, paymentMethod, isDelivery } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' });
  }

  // Load current user to stamp handledBy
  const currentUser = await User.findOne({ id: req.user.id });
  if (!currentUser) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  // Fetch products and validate stock
  const productIds = items.map(i => i.productId);
  const products = await Product.find({ id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p.id, p]));

  for (const item of items) {
    const p = productMap.get(item.productId);
    if (!p) return res.status(400).json({ error: `Product not found: ${item.productId}` });
    if (p.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${p.name}` });
  }

  // Compute server-side subtotal and total to avoid trusting client
  const serverSubtotal = items.reduce((sum, i) => {
    const p = productMap.get(i.productId);
    return sum + (p.price * i.quantity);
  }, 0);
  const serverTax = typeof tax === 'number' ? tax : 0;
  const serverDelivery = typeof deliveryFee === 'number' ? deliveryFee : 0;
  const serverTotal = serverSubtotal + serverTax + serverDelivery;

  // Update stock
  for (const item of items) {
    const p = productMap.get(item.productId);
    p.stock = p.stock - item.quantity;
    await p.save();
  }

  const settings = await SystemSettings.findOne({ id: 'system' });
  if (settings) {
    const toNotify = [];
    const threshold = typeof settings.lowStockThreshold === 'number' ? settings.lowStockThreshold : 10;
    for (const item of items) {
      const p = productMap.get(item.productId);
      if (!p) continue;
      if (settings.notifyOutOfStock && p.stock === 0) {
        toNotify.push({ type: 'out', name: p.name, sku: p.sku, stock: p.stock });
      } else if (settings.notifyLowStock && p.stock > 0 && p.stock <= threshold) {
        toNotify.push({ type: 'low', name: p.name, sku: p.sku, stock: p.stock });
      }
    }
    if (toNotify.length > 0) {
      const method = settings.notificationMethod || 'email';
      const wantsEmail = method === 'email' || method === 'both';
      const wantsSMS = method === 'sms' || method === 'both';
      const emailTo = settings.email;
      const smsTo = settings.phone;
      const lines = toNotify.map(e => `${e.type === 'out' ? 'Out of stock' : 'Low stock'}: ${e.name} (SKU: ${e.sku}) – stock: ${e.stock}`);
      const smsBody = `Inventory alert:\n${lines.join('\n')}`;
      const emailHtml = `<div style="font-family:Arial,sans-serif"><p>Inventory alert:</p><ul>${toNotify.map(e => `<li>${e.type === 'out' ? 'Out of stock' : 'Low stock'}: ${e.name} (SKU: ${e.sku}) – stock: ${e.stock}</li>`).join('')}</ul></div>`;
      try { if (wantsEmail && emailTo) { await sendGenericEmail(emailTo, 'Inventory alert', emailHtml); } } catch {}
      try { if (wantsSMS && smsTo) { await sendSMS(smsTo, smsBody); } } catch {}
    }
  }

  // Build transaction record with snapshot of item details
  const txn = new Transaction({
    id: uuidv4(),
    items: items.map(i => {
      const p = productMap.get(i.productId);
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        quantity: i.quantity,
      };
    }),
    subtotal: serverSubtotal,
    tax: serverTax,
    total: serverTotal,
    customerName,
    customerContact,
    customerAddress,
    status: 'completed',
    paymentMethod: paymentMethod || 'Cash',
    handledBy: {
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
    },
    isDelivery: !!isDelivery,
    deliveryFee: serverDelivery || undefined,
    timestamp: new Date(),
  });

  await txn.save();
  res.status(201).json({ message: 'Transaction created', transaction: txn.toJSON() });
}));

// Delete ALL transactions (owner only)
router.delete('/', verifyToken, asyncHandler(async (req, res) => {
  const { role } = req.user || {};
  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only owner can delete all transactions' });
  }

  const { dateFrom, dateTo } = req.query;
  const filter = {};
  if (dateFrom || dateTo) {
    filter.timestamp = {};
    if (dateFrom) filter.timestamp.$gte = new Date(String(dateFrom));
    if (dateTo) {
      const end = new Date(String(dateTo));
      end.setHours(23,59,59,999);
      filter.timestamp.$lt = end;
    }
  }
  const result = await Transaction.deleteMany(filter);
  res.json({ message: 'Transactions deleted', deletedCount: result.deletedCount });
}));

export default router;
