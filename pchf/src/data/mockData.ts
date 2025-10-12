import type { Product, Transaction, InventoryAlert } from '../types/index';

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Coffee Beans (1kg)',
    price: 24.99,
    category: 'Beverages',
    stock: 45,
    sku: 'COF001',
    description: 'Premium arabica coffee beans'
  },
  {
    id: '2',
    name: 'Chocolate Bar',
    price: 3.99,
    category: 'Snacks',
    stock: 120,
    sku: 'CHO001',
    description: 'Dark chocolate bar 70% cocoa'
  },
  {
    id: '3',
    name: 'Organic Milk (1L)',
    price: 5.49,
    category: 'Dairy',
    stock: 8,
    sku: 'MIL001',
    description: 'Fresh organic whole milk'
  },
  {
    id: '4',
    name: 'Sourdough Bread',
    price: 6.99,
    category: 'Bakery',
    stock: 15,
    sku: 'BRD001',
    description: 'Artisan sourdough bread'
  },
  {
    id: '5',
    name: 'Greek Yogurt',
    price: 7.99,
    category: 'Dairy',
    stock: 2,
    sku: 'YOG001',
    description: 'Natural Greek yogurt 500g'
  },
  {
    id: '6',
    name: 'Energy Drink',
    price: 2.99,
    category: 'Beverages',
    stock: 0,
    sku: 'ENR001',
    description: 'Sugar-free energy drink'
  },
  {
    id: '7',
    name: 'Potato Chips',
    price: 4.49,
    category: 'Snacks',
    stock: 67,
    sku: 'CHI001',
    description: 'Crispy potato chips sea salt'
  },
  {
    id: '8',
    name: 'Orange Juice (1L)',
    price: 8.99,
    category: 'Beverages',
    stock: 25,
    sku: 'JUI001',
    description: 'Fresh squeezed orange juice'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 'TXN001',
    items: [
      { product: mockProducts[0], quantity: 1 },
      { product: mockProducts[1], quantity: 2 }
    ],
    subtotal: 32.97,
    tax: 3.30,
    total: 36.27,
    paymentMethod: 'card',
    timestamp: new Date('2024-01-15T10:30:00'),
    status: 'completed',
    customerName: 'John Doe',
  },
  {
    id: 'TXN002',
    items: [
      { product: mockProducts[3], quantity: 1 },
      { product: mockProducts[4], quantity: 1 }
    ],
    subtotal: 14.98,
    tax: 1.50,
    total: 16.48,
    paymentMethod: 'cash',
    timestamp: new Date('2024-01-15T11:15:00'),
    status: 'completed',
    customerName: 'Jane Smith',
  }
];

export const mockInventoryAlerts: InventoryAlert[] = [
  {
    id: 'ALERT001',
    productId: '3',
    productName: 'Organic Milk (1L)',
    currentStock: 8,
    threshold: 10,
    type: 'low_stock'
  },
  {
    id: 'ALERT002',
    productId: '5',
    productName: 'Greek Yogurt',
    currentStock: 2,
    threshold: 5,
    type: 'low_stock'
  },
  {
    id: 'ALERT003',
    productId: '6',
    productName: 'Energy Drink',
    currentStock: 0,
    threshold: 10,
    type: 'out_of_stock'
  }
];

export const categories = ['All', 'Beverages', 'Snacks', 'Dairy', 'Bakery'];