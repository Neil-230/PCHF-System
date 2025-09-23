import { useState } from "react";
import type { Product, CartItem } from "../types";
import { mockProducts, categories } from "../data/mockData";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/Badge";
import { BootstrapSelect } from "./ui/select";
import { Plus, Minus, Search } from "lucide-react"; // removed DollarSign
import { Dialog, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import './css/PointOfSales.css'


interface PointOfSaleProps {
  onTransactionComplete: (transaction: any) => void;
}

export function PointOfSale({ onTransactionComplete }: PointOfSaleProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showCashInput, setShowCashInput] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);

  // New: Returns state
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<CartItem[]>([]);

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

  // Handle cash payment
  const handleCashPayment = () => {
    if (cashAmount < total) {
      toast.error("Cash amount is less than total!");
      return;
    }

    const change = cashAmount - total;

    // Generate PDF receipt
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Official Receipt", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

    let y = 40;
    cart.forEach((item) => {
      doc.text(
        `${item.product.name} x ${item.quantity} - ₱${(item.product.price * item.quantity).toFixed(2)}`,
        20,
        y
      );
      y += 10;
    });

    doc.text(`Subtotal: ₱${subtotal.toFixed(2)}`, 20, y + 10);
    doc.text(`Cash Given: ₱${cashAmount.toFixed(2)}`, 20, y + 20);
    doc.text(`Change: ₱${change.toFixed(2)}`, 20, y + 30);
    doc.save(`Receipt_${Date.now()}.pdf`);

    const transaction = {
      id: `TXN${Date.now()}`,
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod: "cash",
      timestamp: new Date(),
      status: "completed" as const,
    };
    onTransactionComplete(transaction);

    // Reset
    setCart([]);
    setCashAmount(0);
    setShowCashInput(false);
    setIsCheckoutOpen(false);
    toast.success("Cash payment completed and receipt generated!");
  };

  // -------------------
  // RETURNS FEATURE
  // -------------------
  const handleReturn = () => {
    if (returnItems.length === 0) {
      toast.error("No items selected for return");
      return;
    }

    const refundAmount = returnItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // Generate Return Receipt
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Return Receipt", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);

    let y = 40;
    returnItems.forEach((item) => {
      doc.text(
        `${item.product.name} x ${item.quantity} - -₱${(item.product.price * item.quantity).toFixed(2)}`,
        20,
        y
      );
      y += 10;
    });

    doc.text(`Refund Total: -₱${refundAmount.toFixed(2)}`, 20, y + 10);
    doc.save(`Return_${Date.now()}.pdf`);

    const transaction = {
      id: `RTN${Date.now()}`,
      items: returnItems,
      refund: refundAmount,
      paymentMethod: "return",
      timestamp: new Date(),
      status: "returned" as const,
    };

    onTransactionComplete(transaction);

    // Reset
    setReturnItems([]);
    setIsReturnOpen(false);
    toast.success("Return processed and receipt generated!");
  };

  return (
    <div className="d-flex" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "1rem" }}>
      <div className="container-fluid">
        <div className="row">
          {/* Products Section */}
          <div className="col-md-8 ps-0">
            {/* Header */}
            <div className="d-flex gap-2 align-items-center mb-3">
              <form className="flex-grow-1">
                <div className="position-relative w-100">
                  <input
                    type="text"
                    className="form-control ps-5"
                    placeholder="Search products or SKU..."
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                  />
                  <Search className="position-absolute top-50 start-0 translate-middle-y ms-2 text-secondary" size={18} />
                </div>
              </form>
              <BootstrapSelect
                options={[{ value: "All", label: "All" }, ...categories.filter((c) => c !== "All").map((c) => ({ value: c, label: c }))]}
                value={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>
            {/* __________ */}

            {/* Products */}
            <div
              className="grid gap-3 flex-grow overflow-y-auto pe-3"
              style={{ maxHeight: "calc(100vh - 180px)", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1rem" }}
            >
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${product.stock === 0 ? "opacity-50" : ""}`}
                  onClick={() => addToCart(product)}
                >
                  <CardHeader>
                    <div className="d-flex flex-row">
                      <CardTitle>{product.name}</CardTitle>
                      <div className="ms-2">
                        <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}>
                          {product.stock > 0 ? `${product.stock}` : "Out"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    <p className="fw-semibold">₱{product.price.toFixed(2)}</p>
                    <Badge variant="outline" className="">{product.category}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* _____________ */}
          </div>

          {/* Cart Section */}
          <div className="col-md-4 border-0 rounded-3 p-4 d-flex flex-column"
            style={{backgroundColor:"white", boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <h3 className="fw-bold">Current Order</h3>

            {cart.length === 0 ? (
              <div className="d-flex align-items-center justify-content-center flex-grow-1 text-muted-foreground" style={{ minHeight: "200px" }}>
                <div className="text-center">
                  <p>No items in cart</p>
                  <p className="text-sm">Select products to add them</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto" style={{ maxHeight: "300px" }}>
                  {cart.map((item) => (
                    <div key={item.product.id} className="d-flex align-items-center justify-content-between mb-2">
                      <div className="flex-1">
                        <p className="fw-medium text-sm mb-0">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground mb-0">₱{item.product.price.toFixed(2)} each</p>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stock}>
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <p className="fw-medium text-sm w-16 text-end mb-0">₱{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <hr className="my-3" />

                <div className="space-y-2">
                  <div className="d-flex justify-content-between text-sm">
                    <span>Subtotal:</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between text-sm">
                    <span>Tax (10%):</span>
                    <span>₱{tax.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between fw-semibold">
                    <span>Total:</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout button */}
                <Button className="w-100 mt-3 bg-dark border-dark" size="lg" onClick={() => setIsCheckoutOpen(true)}>
                  Checkout
                </Button>

                {/* Checkout Modal */}
                <Dialog open={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)}>
                  <DialogHeader>
                    <DialogTitle>Cash Payment</DialogTitle>
                  </DialogHeader>
                  <div className="d-flex flex-column gap-1 mt-3" >
                    <div className="text-center p-1 bg-light rounded">
                      <p className="fw-semibold">Total: ₱{total.toFixed(2)}</p>
                    </div>
                    <div className="flex-grow-1 border-top"></div>
                    <div className="d-flex flex-column gap-2">
                      <label>Enter Cash Amount:</label>
                      <input
                        type="number"
                        className="form-control"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(parseFloat(e.target.value))}
                        placeholder="₱"
                      />
                      <Button className="mt-2" onClick={handleCashPayment}>
                        Pay Cash
                      </Button>
                      <Button variant="outline" className="mt-2" onClick={() => setIsCheckoutOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}