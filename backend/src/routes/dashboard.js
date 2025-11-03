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

  // Weekly sales (last 7 days)
  const startOfWeekWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfWeekWindow.setDate(startOfWeekWindow.getDate() - 6);
  const weeklyAgg = await Transaction.aggregate([
    { $match: { timestamp: { $gte: startOfWeekWindow } } },
    {
      $group: {
        _id: {
          y: { $year: '$timestamp' },
          m: { $month: '$timestamp' },
          d: { $dayOfMonth: '$timestamp' },
          dow: { $dayOfWeek: '$timestamp' }
        },
        total: { $sum: '$total' }
      }
    }
  ]);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyMap = new Map();
  for (const w of weeklyAgg) {
    const dateKey = new Date(w._id.y, w._id.m - 1, w._id.d).toDateString();
    weeklyMap.set(dateKey, w.total || 0);
  }
  const weeklyLabels = [];
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    weeklyLabels.push(dayNames[d.getDay()]);
    weeklyData.push(weeklyMap.get(key) || 0);
  }

  // Sales by category (sum of item price*qty by product category)
  const startOfCategoryWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  startOfCategoryWindow.setDate(startOfCategoryWindow.getDate() - 30);
  const salesByCategoryAgg = await Transaction.aggregate([
    { $match: { timestamp: { $gte: startOfCategoryWindow } } },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.productId', foreignField: 'id', as: 'prod' } },
    { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $ifNull: ['$prod.category', 'Uncategorized'] },
        total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { total: -1 } }
  ]);
  const salesCategoryLabels = salesByCategoryAgg.map(r => r._id || 'Uncategorized');
  const salesCategoryData = salesByCategoryAgg.map(r => r.total || 0);

  // Top products by inventory value
  const topProductsAgg = await Product.aggregate([
    { $project: { id: 1, name: 1, category: 1, price: 1, stock: 1, value: { $multiply: ['$price', '$stock'] } } },
    { $sort: { value: -1 } },
    { $limit: 5 }
  ]);

  // Notifications
  const notifications = [];
  if (outOfStockItems > 0) notifications.push(`${outOfStockItems} out-of-stock item(s)`);
  if (lowStockItems > 0) notifications.push(`${lowStockItems} low-stock item(s)`);

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
    weeklySales: { labels: weeklyLabels, data: weeklyData },
    salesByCategory: { labels: salesCategoryLabels, data: salesCategoryData },
    topProductsByInventoryValue: topProductsAgg,
    notifications,
  });
}));

export default router;
