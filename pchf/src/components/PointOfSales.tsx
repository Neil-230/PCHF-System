import { useState, useEffect } from "react";
import type { Product, CartItem } from "../types";
import { mockProducts, categories } from "../data/mockData";
import { Search } from "lucide-react";
import "./css/PointOfSales.css";
import { Modal, Button, Card } from "react-bootstrap";
import { Badge } from "./ui/Badge";
import { CardTitle, CardHeader, CardContent } from "./ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-hot-toast"; //toasterrrrrrr
import apiService from "../services/api";



interface User {
  name: string;
  email: string;
  role: "admin" | "cashier" | string;
}

interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  timestamp: Date;
  status: "completed" | "pending";
  paymentMethod: string;
  handledBy: {
    name: string;
    email: string;
    role: string;
  };
  isDelivery: boolean;
  deliveryFee?: number;
}

interface PointOfSaleProps {
  onTransactionComplete: (transaction: Transaction) => void;
  user: User;
}

export function PointOfSale({ onTransactionComplete, user }: PointOfSaleProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"Delivery" | "Walk-in">("Walk-in");
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(true);
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [taxRate, setTaxRate] = useState("0"); //tax rate 0 for default
  const [deliveryFeeValue, setDeliveryFeeValue] = useState(50); //Default fee 50php

  const [storeSettings, setStoreSettings] = useState({
    storeName: "My Store",
    storeAddress: "123 Main St, City, State 12345",
    phone: "+1 (555) 123-4567",
    email: "store@example.com",
    footerMessage: "Thank you for your purchase!",
  });

  useEffect(() => {
    const saved = localStorage.getItem("storeSettings");
    if (saved) setStoreSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    apiService
      .getProducts()
      .then(({ products }) => {
        setProducts(products);
      })
      .catch(() => {
        // keep mockProducts if backend not available
      });
  }, []);

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setCart([]);
    toast.success("Cart successfully cleared");


  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleNameSubmit = () => {
    if (!customerName.trim() || !customerContact.trim() || !customerAddress.trim()) {
      toast.error("Please fill out all customer details");
      return;
    }
    setHasEnteredName(true);
    setIsNameDialogOpen(false);
  };

  const addToCart = (product: Product) => {
    if (product.stock === 0) {
      toast.error("Product is out of stock");
      return;
    }

    setCart((prev) => {
      const existingItem = prev.find((i) => i.product.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast.error("Not enough stock available");
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0)
      return setCart((prev) =>
        prev.filter((item) => item.product.id !== productId)
      );

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

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const tax = subtotal * (parseFloat(taxRate) / 100 || 0);
  const deliveryFee = deliveryType === "Delivery" ? deliveryFeeValue : 0;
  const total = subtotal + tax + deliveryFee;

  const handleConfirmPayment = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const cash = parseFloat(cashAmount);
    if (isNaN(cash) || cash <= 0) return toast.error("Enter valid cash");
    if (cash < total) return toast.error("Insufficient cash"); //error bellow than total

    const change = cash - total;
    const isDelivery = deliveryType === "Delivery";

    const payload = {
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      subtotal,
      tax,
      deliveryFee: isDelivery ? deliveryFeeValue : 0,
      total,
      customerName,
      customerContact,
      customerAddress,
      paymentMethod: "Cash",
      isDelivery,
    };

    let saved: any | null = null;
    try {
      const res = await apiService.createTransaction(payload);
      saved = res.transaction;
    } catch (e: any) {
      if (e?.status === 409) {
        toast.error("Data changed by someone else. Please refresh and try again.");
      } else {
        toast.error(e?.message || "Failed to save transaction");
      }
      return;
    }

    // --- PDF receipt ---
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 200],
    });

    const date = new Date();
    const formattedDate = date.toLocaleString();

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(storeSettings.storeName, 40, 10, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(storeSettings.storeAddress, 40, 14, { align: "center" });
    doc.text(storeSettings.email, 40, 17, { align: "center" });
    doc.text(storeSettings.phone, 40, 20, { align: "center" });
    doc.text("----------------------------------------------------------------------", 40, 24, { align: "center" });

    doc.text(`Customer: ${customerName}`, 10, 29);
    doc.text(`Contact: ${customerContact}`, 10, 33);
    doc.text(`Address: ${customerAddress}`, 10, 37);
    doc.text(`Type: ${deliveryType}`, 10, 41);
    doc.text(`Date: ${formattedDate}`, 10, 45);
    doc.text(`Transaction ID: ${saved.id}`, 10, 49);
    doc.text(`Payment: Cash`, 10, 53);
    doc.text("----------------------------------------------------------------", 40, 56, { align: "center" });

    const tableData = cart.map((item) => [
      `${item.quantity} x ${item.product.name}`,
      `PHP.${(item.product.price * item.quantity).toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [["Item", "Price"]],
      body: tableData,
      startY: 58,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1 },
      headStyles: { fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 20, halign: "right" } },
      margin: { left: 5 },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 2;
    doc.text("----------------------------------------------------------------", 40, finalY, { align: "center" });
    doc.text(`Subtotal: PHP.${subtotal.toFixed(2)}`, 10, finalY + 5);
    doc.text(`Tax (${taxRate}%): PHP.${tax.toFixed(2)}`, 10, finalY + 9);
    if (isDelivery) doc.text(`Delivery Fee: PHP.${deliveryFeeValue.toFixed(2)}`, 10, finalY + 13);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: PHP.${total.toFixed(2)}`, 10, finalY + (isDelivery ? 18 : 14));
    doc.setFont("helvetica", "normal");
    doc.text(`Cash: PHP.${cash.toFixed(2)}`, 10, finalY + (isDelivery ? 23 : 19));
    doc.text(`Change: PHP.${change.toFixed(2)}`, 10, finalY + (isDelivery ? 27 : 23));
    doc.text("----------------------------------------------------------------", 40, finalY + (isDelivery ? 30 : 26), { align: "center" });

    doc.setFontSize(8);
    doc.text(`Processed by: ${user.name} (${user.role})`, 10, finalY + (isDelivery ? 35 : 31));
    doc.text(`Email: ${user.email}`, 10, finalY + (isDelivery ? 39 : 35));
    doc.text("----------------------------------------------------------------", 40, finalY + (isDelivery ? 42 : 38), { align: "center" });
    doc.setFontSize(8);
    doc.text(storeSettings.footerMessage, 40, finalY + (isDelivery ? 49 : 45), { align: "center" });
    doc.save(`receipt_${customerName}.pdf`);

    const uiTransaction: Transaction = {
      id: saved.id,
      items: (saved.items || []).map((i: any) => ({
        product: {
          id: i.productId,
          name: i.name,
          price: i.price,
          category: "",
          stock: 0,
          sku: i.sku,
        },
        quantity: i.quantity,
      })),
      subtotal: saved.subtotal,
      tax: saved.tax,
      total: saved.total,
      customerName: saved.customerName,
      customerContact: saved.customerContact,
      customerAddress: saved.customerAddress,
      timestamp: new Date(saved.timestamp),
      status: saved.status || "completed",
      paymentMethod: saved.paymentMethod || "Cash",
      handledBy: saved.handledBy || { name: user.name, email: user.email, role: user.role },
      isDelivery: !!saved.isDelivery,
      deliveryFee: saved.deliveryFee,
    };

    onTransactionComplete(uiTransaction);
    toast.success(`${deliveryType} transaction completed`);
    setCart([]);
    setCashAmount("");
    setIsCheckoutOpen(false);
    setCustomerName("");
    setCustomerContact("");
    setCustomerAddress("");
    setDeliveryType("Walk-in");
    setHasEnteredName(false);
    setIsNameDialogOpen(true);

    try {
      const { products } = await apiService.getProducts();
      setProducts(products);
    } catch {}
  };

  return (
    <>
      {/* Customer Modal */}
      <Modal show={isNameDialogOpen} onHide={() => setIsNameDialogOpen(false)} centered
        style={{ backgroundColor: "rgba(239, 252, 255, 0.31)" }}>
        <Modal.Header closeButton>
          <Modal.Title>Enter Customer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Customer Name..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Contact Number..."
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
          />
          <textarea
            className="form-control mb-3"
            placeholder="Address..."
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          ></textarea>

          <div className="mb-3">
            <label className="form-label fw-semibold">Transaction Type</label>
            <select
              className="form-select"
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as "Delivery" | "Walk-in")}
            >
              <option value="Walk-in">Walk-in</option>
              <option value="Delivery">For Delivery</option>
            </select>
          </div>

          {deliveryType === "Delivery" && (
            <div className="mb-3">
              <label className="form-label fw-semibold">Delivery Fee</label>
              <input
                type="number"
                className="form-control"
                min="0"
                value={deliveryFeeValue}
                onChange={(e) => setDeliveryFeeValue(parseFloat(e.target.value))}
              />
            </div>
          )}

          <Button variant="dark" className="w-100" onClick={handleNameSubmit}>
            Continue
          </Button>
        </Modal.Body>
      </Modal>

      {/* POS Interface NK<ADHJSKJADKJ */}
      {hasEnteredName && (
        <div className="container-fluid mt-1">
          <div className="row g-3">
            {/* Product Section */}
            <div className="col-lg-8">
              <div className="d-flex gap-2 mb-3">
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
                <select
                  className="form-select w-25"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  {categories
                    .filter((c) => c !== "All")
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <div className=" d-flex alert alert-secondary gap-2 py-2">
                <strong className="d-flex">Customer:</strong> {customerName} &nbsp;|&nbsp; {customerContact}
              </div>

              <div
                className="grid gap-3 flex-grow overflow-y-auto pe-3 ProductList"
              >
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all hover:shadow-md border border-0 ${product.stock === 0 ? "opacity-50" : ""}`}
                    onClick={() => addToCart(product)}
                    style={{ boxShadow: "2px 4px 8px  rgba(0, 0, 0, 0.10)" }}
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
            </div>

            {/* Cart Section */}
            <div className="col-lg-4">
              <Card className="p-3 d-flex flex-column h-100 border border-0"
                style={{ boxShadow: "2px 4px 8px  rgba(0, 0, 0, 0.10)", }}
              >
                <h5 className="fw-semibold mb-3">Current Order</h5>
                {cart.length === 0 ? (
                  <div className="text-center text-muted mt-5">
                    <p>No items in cart</p>
                    <small>Select a product to add</small>
                  </div>
                ) : (
                  <>
                    <div className="flex-grow-1 overflow-auto mb-3">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="d-flex align-items-center justify-content-between border-bottom py-2"
                        >
                          <div className="">
                            <p className="mb-0 fw-medium">{item.product.name}</p>
                            <small>₱{item.product.price.toFixed(2)} each</small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="number"
                              className="form-control form-control-sm text-center"
                              style={{ width: "60px" }}
                              min="1"
                              max={item.product.stock}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(
                                  item.product.id,
                                  parseInt(e.target.value)
                                )
                              }
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              ✕
                            </Button>
                          </div>
                          <p className="mb-0 fw-semibold">
                            ₱{(item.product.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between">
                        <span>Subtotal:</span>
                        <span>₱{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Tax ({taxRate}%):</span>
                        <span>₱{tax.toFixed(2)}</span>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between fw-bold">
                        <span>Total:</span>
                        <span>₱{total.toFixed(2)}</span>
                      </div>
                      <Button
                        variant="dark"
                        className="w-100 mt-3"
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={cart.length === 0}
                      >
                        Checkout
                      </Button>
                      <Button
                        variant="outline-danger"
                        className="w-100 mt-2"
                        onClick={clearCart}
                        disabled={cart.length === 0}
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <Modal show={isCheckoutOpen} onHide={() => setIsCheckoutOpen(false)} centered
        style={{ backgroundColor: "rgba(239, 252, 255, 0.31)" }}>
        <Modal.Header closeButton>
          <Modal.Title>Cash Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3 border rounded p-3 bg-light">
            <h6>Order Summary</h6>
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="d-flex justify-content-between small"
              >
                <span>
                  {item.product.name} x{item.quantity}
                </span>
                <span>₱{(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <hr />
            <div className="d-flex justify-content-between fw-bold">
              <span>Total:</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="taxRate" className="form-label fw-semibold">Tax Percentage</label>
            <input
              type="number"
              id="taxRate"
              min="0"
              max="100"
              step="0.01"
              className="form-control"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="Enter tax % (e.g., 12)"
            />
          </div>
          <label className="form-label">Cash Received</label>
          <input
            type="number"
            className="form-control mb-3"
            placeholder="0.00"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
          />

          {cashAmount && parseFloat(cashAmount) >= total && (
            <div className="alert alert-success">
              Change: ₱{(parseFloat(cashAmount) - total).toFixed(2)}
            </div>
          )}
          {cashAmount && parseFloat(cashAmount) < total && (
            <div className="alert alert-danger">
              Insufficient amount. Need ₱
              {(total - parseFloat(cashAmount)).toFixed(2)} more.
            </div>
          )}

          <Button
            variant="dark"
            onClick={handleConfirmPayment}
            className="w-100 mt-2"
            disabled={!cashAmount || parseFloat(cashAmount) < total}
          >
            Confirm Payment
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
