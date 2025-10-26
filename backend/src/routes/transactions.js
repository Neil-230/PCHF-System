import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User, Product, Transaction } from '../database/mongodb.js';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get transactions (optional limit)
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const txns = await Transaction.find({}).sort({ timestamp: -1 }).limit(limit);
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

export default router;
