export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  image?: string;
  description?: string;
  __v?: number;
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
  paymentMethod: 'card' | 'cash' | 'digital' | string;
  timestamp: Date;
  status: 'completed' | 'refunded' | 'pending';
  customerName?: string;
  
  handledBy: {
    name: string;
    email: string;
    role: 'admin' | 'cashier' | string;
  };
  isDelivery: boolean;
  deliveryFee?: number;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  type: 'low_stock' | 'out_of_stock';
} 