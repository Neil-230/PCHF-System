import mongoose from 'mongoose';
import { User, Product, Transaction, SystemSettings } from '../database/mongodb.js';
import { sendGenericEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';

const normalizeItemsForCompare = (items) => {
  const map = new Map();
  for (const item of items || []) {
    const key = String(item.productId);
    const qty = Number(item.quantity) || 0;
    map.set(key, (map.get(key) || 0) + qty);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
};

const areTransactionItemsEqual = (aItems, bItems) => {
  const na = normalizeItemsForCompare(aItems);
  const nb = normalizeItemsForCompare(bItems);
  if (na.length !== nb.length) return false;
  for (let i = 0; i < na.length; i += 1) {
    if (na[i][0] !== nb[i][0] || na[i][1] !== nb[i][1]) return false;
  }
  return true;
};

export const listTransactions = async (req, res) => {
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
      end.setHours(23, 59, 59, 999);
      filter.timestamp.$lt = end;
    }
  }
  if (paymentMethod) filter.paymentMethod = String(paymentMethod);
  if (status) filter.status = String(status);

  const txns = await Transaction.find(filter).sort({ timestamp: -1 }).limit(limit);
  res.json({ transactions: txns.map((t) => t.toJSON()) });
};

export const createTransaction = async (req, res) => {
  const { items, subtotal, tax, deliveryFee, total, customerName, customerContact, customerAddress, paymentMethod, isDelivery } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' });
  }

  // Validate each item has required fields and valid quantities
  for (const item of items) {
    if (!item.productId || !item.quantity) {
      return res.status(400).json({ error: 'Each item must have productId and quantity' });
    }
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Item quantity must be a positive number' });
    }
    // if (!item.product || typeof item.product.price !== 'number' || item.product.price < 0) {
    //   return res.status(400).json({ error: 'Invalid product information in item' });
    // }
  }

  const currentUser = await User.findOne({ id: req.user.id });
  if (!currentUser) {
    return res.status(401).json({ error: 'Invalid user' });
  }

  const recentTxn = await Transaction.findOne({ 'handledBy.email': currentUser.email }).sort({ timestamp: -1 });
  if (recentTxn) {
    const now = Date.now();
    const lastTs = new Date(recentTxn.timestamp).getTime();
    if (Number.isFinite(lastTs) && lastTs <= now && now - lastTs <= 5000 && areTransactionItemsEqual(recentTxn.items, items)) {
      return res.status(200).json({
        message: 'Duplicate transaction ignored',
        transaction: recentTxn.toJSON(),
        duplicate: true,
      });
    }
  }

  const session = await mongoose.startSession();
  try {
    let txn;
    await session.withTransaction(async () => {
      const productIds = items.map((i) => i.productId);
      const products = await Product.find({ id: { $in: productIds } }).session(session);
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of items) {
        const p = productMap.get(item.productId);
        if (!p) throw Object.assign(new Error(`Product not found: ${item.productId}`), { status: 400 });
        if (p.stock < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${p.name}`), { status: 400 });
      }

      const serverSubtotal = items.reduce((sum, i) => {
        const p = productMap.get(i.productId);
        return sum + (p.price * i.quantity);
      }, 0);
      const serverTax = typeof tax === 'number' ? tax : 0;
      const serverDelivery = typeof deliveryFee === 'number' ? deliveryFee : 0;
      const serverTotal = serverSubtotal + serverTax + serverDelivery;

      for (const item of items) {
        const p = productMap.get(item.productId);
        p.stock = p.stock - item.quantity;
        p.updatedAt = new Date();
        await p.save({ session });
      }

      const inventorySettings = await SystemSettings.findOne({ id: 'system' }).session(session);
      if (inventorySettings) {
        const toNotify = [];
        const threshold = typeof inventorySettings.lowStockThreshold === 'number' ? inventorySettings.lowStockThreshold : 10;
        for (const item of items) {
          const p = productMap.get(item.productId);
          if (!p) continue;
          if (inventorySettings.notifyOutOfStock && p.stock === 0) {
            toNotify.push({ type: 'out', name: p.name, sku: p.sku, stock: p.stock });
          } else if (inventorySettings.notifyLowStock && p.stock > 0 && p.stock <= threshold) {
            toNotify.push({ type: 'low', name: p.name, sku: p.sku, stock: p.stock });
          }
        }
        if (toNotify.length > 0) {
          const method = inventorySettings.notificationMethod || 'email';
          const wantsEmail = method === 'email' || method === 'both';
          const wantsSMS = method === 'sms' || method === 'both';
          const emailTo = inventorySettings.email;
          const smsTo = inventorySettings.phone;
          const lines = toNotify.map((e) => `${e.type === 'out' ? 'Out of stock' : 'Low stock'}: ${e.name} (SKU: ${e.sku}) – stock: ${e.stock}`);
          const smsBody = `Inventory alert:\n${lines.join('\n')}`;
          const emailHtml = `<div style="font-family:Arial,sans-serif"><p>Inventory alert:</p><ul>${toNotify.map((e) => `<li>${e.type === 'out' ? 'Out of stock' : 'Low stock'}: ${e.name} (SKU: ${e.sku}) – stock: ${e.stock}</li>`).join('')}</ul></div>`;
          try { if (wantsEmail && emailTo) { await sendGenericEmail(emailTo, 'Inventory alert', emailHtml); } } catch (err) { console.error('Failed to send transaction inventory alert email:', err); }
          try { if (wantsSMS && smsTo) { await sendSMS(smsTo, smsBody); } } catch (err) { console.error('Failed to send transaction inventory alert SMS:', err); }
        }
      }

      let settingsDoc = inventorySettings;
      if (!settingsDoc) {
        settingsDoc = await SystemSettings.findOne({ id: 'system' }).session(session);
      }
      if (!settingsDoc) {
        settingsDoc = new SystemSettings({ id: 'system' });
      }

      // ============================================
      // FIXED: Use atomic counter instead of while loop
      // This avoids the infinite loop issue when there are many transactions
      // ============================================
      
      // Atomic increment and get next number
      const counterDoc = await SystemSettings.findOneAndUpdate(
        { id: 'system' },
        { 
          $inc: { nextTransactionNumber: 1 },
          $setOnInsert: { createdAt: new Date() }
        },
        { 
          new: true,
          upsert: true,
          session
        }
      );

      const nextNumber = counterDoc.nextTransactionNumber;
      const transactionId = `t_${String(nextNumber).padStart(4, '0')}`;

      txn = new Transaction({
        id: transactionId,
        items: items.map((i) => {
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
        requestInfo: (req.ipinfo ? {
          ip: req.ipinfo.ip,
          country: req.ipinfo.country,
          region: req.ipinfo.region,
          city: req.ipinfo.city,
          org: req.ipinfo.org,
          timezone: req.ipinfo.timezone,
        } : undefined),
      });
      await txn.save({ session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });

    res.status(201).json({ message: 'Transaction created', transaction: txn.toJSON() });
  } catch (err) {
    console.error('Transaction creation error:', {
      message: err?.message,
      code: err?.code,
      codeName: err?.codeName,
      name: err?.name,
      timestamp: new Date().toISOString(),
    });
    
    if (err && (err.name === 'VersionError' || err.codeName === 'WriteConflict')) {
      return res.status(409).json({ error: 'Conflict: inventory was updated concurrently. Please retry.' });
    }
    throw err;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (sessionError) {
        console.error('Error ending session:', sessionError.message);
      }
    }
  }
};

export const deleteTransactions = async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'dateFrom and dateTo are required to delete transactions' });
  }
  const filter = {
    timestamp: {
      $gte: new Date(String(dateFrom)),
    },
  };
  const end = new Date(String(dateTo));
  end.setHours(23, 59, 59, 999);
  filter.timestamp.$lt = end;
  const result = await Transaction.deleteMany(filter);
  res.json({ message: 'Transactions deleted', deletedCount: result.deletedCount });
};
