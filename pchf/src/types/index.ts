export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  image?: string;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  tax: number;
  subtotal: number;
  paymentMethod: 'card' | 'cash' | 'digital';
  timestamp: Date;
  status: 'completed' | 'refunded' | 'pending';
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  type: 'low_stock' | 'out_of_stock';
}