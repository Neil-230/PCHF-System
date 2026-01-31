import { v4 as uuidv4 } from 'uuid';
import { Product, SystemSettings } from '../database/mongodb.js';
import { sendGenericEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';

const resolveClientVersion = (req) => {
  if (req.body && (req.body.version ?? req.body.__v) !== undefined) {
    return req.body.version ?? req.body.__v;
  }
  if (req.query && (req.query.version ?? req.query.__v) !== undefined) {
    return req.query.version ?? req.query.__v;
  }
  return undefined;
};

const ensureProductVersionInitialized = async (product) => {
  if (!product || typeof product.__v === 'number') {
    return;
  }
  try {
    const query = { _id: product._id, __v: { $exists: false } };
    const update = { $set: { __v: 0 } };
    await Product.updateOne(query, update);
    product.__v = 0;
  } catch (err) {
    console.error(`Failed to initialize version for product ${product.id}:`, err);
  }
};

export const listProducts = async (req, res) => {
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
  await Promise.all(products.map((p) => ensureProductVersionInitialized(p)));
  res.json({ products: products.map(p => p.toJSON()) });
};

export const getProductById = async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await ensureProductVersionInitialized(product);
  res.json({ product: product.toJSON() });
};

export const createProduct = async (req, res) => {
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
};

export const updateProduct = async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await ensureProductVersionInitialized(product);
  const clientVersion = resolveClientVersion(req);
  if (clientVersion === undefined) {
    return res.status(400).json({ error: 'Version is required to update product.' });
  }
  if (Number(clientVersion) !== product.__v) {
    return res.status(409).json({ error: 'Conflict: product data is stale. Please refresh and retry.' });
  }

  const updates = { ...req.body };
  delete updates.version;
  delete updates.__v;
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
};

export const deleteProduct = async (req, res) => {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await ensureProductVersionInitialized(product);

  const clientVersion = resolveClientVersion(req);
  if (clientVersion === undefined) {
    return res.status(400).json({ error: 'Version is required to delete product.' });
  }
  if (Number(clientVersion) !== product.__v) {
    return res.status(409).json({ error: 'Conflict: product data is stale. Please refresh and retry.' });
  }

  await product.deleteOne();
  res.json({ message: 'Product deleted' });
};
