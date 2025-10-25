import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { Product, Transaction } from '../database/mongodb.js';

const router = express.Router();

router.get('/metrics', verifyToken, asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const todayTxns = await Transaction.find({
    timestamp: { $gte: startOfDay, $lt: endOfDay },
  }).sort({ timestamp: -1 });

  const todaySales = todayTxns.reduce((sum, t) => sum + (t.total || 0), 0);
  const todayItemsSold = todayTxns.reduce((sum, t) => sum + (Array.isArray(t.items) ? t.items.reduce((s, i) => s + (i.quantity || 0), 0) : 0), 0);

  const [counts] = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        inventoryValue: { $sum: { $multiply: ['$price', '$stock'] } },
      }
    }
  ]);

  const lowStockItems = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } });
  const outOfStockItems = await Product.countDocuments({ stock: 0 });

  const recentTransactions = await Transaction.find({}).sort({ timestamp: -1 }).limit(10);

  res.json({
    todaySales,
    todayTransactions: todayTxns.length,
    todayItemsSold,
    totalProducts: counts?.totalProducts || 0,
    totalStock: counts?.totalStock || 0,
    lowStockItems,
    outOfStockItems,
    inventoryValue: counts?.inventoryValue || 0,
    recentTransactions: recentTransactions.map(t => t.toJSON()),
  });
}));

export default router;
