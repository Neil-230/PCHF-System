import { useState } from "react";
import type { Product, CartItem } from "../types";
import { mockProducts, categories } from "../data/mockData";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/Badge";

import { BootstrapSelect } from "./ui/select";
import { Separator } from "./ui/separator";
import { Plus, Minus, Search, CreditCard, DollarSign, Smartphone } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import './css/PointOfSales.css'

interface PointOfSaleProps {
  onTransactionComplete: (transaction: any) => void;
}

export function PointOfSale({ onTransactionComplete }: PointOfSaleProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const filteredProducts = mockProducts.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      toast.error("Product is out of stock");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Not enough stock available");
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxQuantity = Math.min(newQuantity, item.product.stock);
          return { ...item, quantity: maxQuantity };
        }
        return item;
      })
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handlePayment = (method: "card" | "cash" | "digital") => {
    const transaction = {
      id: `TXN${Date.now()}`,
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod: method,
      timestamp: new Date(),
      status: "completed" as const,
    };
    onTransactionComplete(transaction);
    setCart([]);
    setIsCheckoutOpen(false);
    toast.success(`Payment processed successfully via ${method}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* SELECT AND SEARCH HEADER */}
        <div className="d-flex gap-2 align-items-center mb-3">
          {/* Search Bar */}
          <form className="flex-grow-1">
            <div className="input-group">
              <span className="input-group-text border-end-0 bg-transparent border-secondary">
                <Search className="text-secondary" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 border-secondary"
                placeholder="Search products or SKU..."
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
              />
            </div>
          </form>

          {/* Bootstrap Select for Categories */}
          <BootstrapSelect
            options={[{ value: "All", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[calc(200px)] overflow-y-auto">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all hover:shadow-md ${product.stock === 0 ? "opacity-50" : ""}`}
              onClick={() => addToCart(product)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                  <Badge
                    variant={
                      product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"
                    }
                  >
                    {product.stock > 0 ? `${product.stock}` : "Out"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                <p className="fw-semibold">${product.price.toFixed(2)}</p>
                <Badge variant="outline" className="text-xs">
                  {product.category}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="bg-card border rounded-lg p-4 d-flex flex-column">
        <h3 className="fw-semibold mb-4">Current Order</h3>
        {cart.length === 0 ? (
          <div className="flex-1 d-flex align-items-center justify-content-center text-muted-foreground">
            <div className="text-center">
              <p>No items in cart</p>
              <p className="text-sm">Select products to add them</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="d-flex align-items-center justify-content-between">
                  <div className="flex-1">
                    <p className="fw-medium text-sm">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.product.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <p className="fw-medium text-sm w-16 text-end">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="d-flex justify-content-between text-sm">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between text-sm">
                <span>Tax (10%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="d-flex justify-content-between fw-semibold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Dialog open={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)}>
              <DialogHeader>
                <DialogTitle>Payment Method</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="fw-semibold">Total: ${total.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Button onClick={() => handlePayment("card")} className="d-flex align-items-center gap-2 h-12">
                    <CreditCard className="size-4" /> Credit/Debit Card
                  </Button>
                  <Button
                    onClick={() => handlePayment("cash")}
                    variant="outline"
                    className="d-flex align-items-center gap-2 h-12"
                  >
                    <DollarSign className="size-4" /> Cash
                  </Button>
                  <Button
                    onClick={() => handlePayment("digital")}
                    variant="outline"
                    className="d-flex align-items-center gap-2 h-12"
                  >
                    <Smartphone className="size-4" /> Digital Wallet
                  </Button>
                </div>
              </div>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
