import { useState, useEffect, useMemo } from "react";
import type { Product, CartItem } from "../types";
import { mockProducts, categories } from "../data/mockData";
import { Search, Package } from "lucide-react";
import "./css/PointOfSales.css";
import { Modal, Button, Card } from "react-bootstrap";
import { Badge } from "./ui/Badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
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
  // const didToast = useRef(false);

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
    let mounted = true;
    const syncStoreSettings = async () => {
      try {
        const s = await apiService.getSystemSettings();
        if (!mounted) return;
        setStoreSettings((prev) => {
          const updated = {
            ...prev,
            storeName: s.storeName || prev.storeName,
            storeAddress: s.storeAddress || prev.storeAddress,
            phone: s.phone || prev.phone,
            email: s.email || prev.email,
            footerMessage: s.footerMessage || prev.footerMessage,
          };
          localStorage.setItem("storeSettings", JSON.stringify(updated));
          return updated;
        });
      } catch {
        // leave existing fallback if API unavailable
      }
    };
    syncStoreSettings();
    return () => {
      mounted = false;
    };
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
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setCart([]);
    toast.success("Cart successfully cleared");
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const memoizedCategories = useMemo(() => ["All", ...categories.filter(c => c !== "All")], []);

  // SUBMIT LOGIC
  const handleNameSubmit = () => {
    if (!customerName.trim() || !customerContact.trim() || !customerAddress.trim()) {
      toast.error("Please fill out all customer details");
      return;
    }
    setHasEnteredName(true);
    toast.success("You can Continue with your transactions");
    setIsNameDialogOpen(false);
  };
  //handle submit Keymap 
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      // Only trigger when modal is open
      if (isNameDialogOpen && e.key === "Enter") {
        e.preventDefault(); // prevent form submit refresh
        handleNameSubmit(); // call your button function
      }
    };

    window.addEventListener("keydown", handleEnter);

    return () => {
      window.removeEventListener("keydown", handleEnter);
    };
  }, [isNameDialogOpen, customerName, customerContact, customerAddress])


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
    // Validate all fields before showing any toast
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const cash = parseFloat(cashAmount);
    if (isNaN(cash) || cash <= 0) {
      toast.error("Enter valid cash amount");
      return;
    }
    if (cash < total) {
      toast.error("Insufficient cash");
      return;
    } //error bellow than total

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
        <Modal.Header closeButton 
        style={{marginRight: "2px"}}>
          <Modal.Title>Enter Customer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Customer Name..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
          />
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Contact Number..."
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value.replace(/[^0-9]/g, ""))}
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
              <div className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="position-relative flex-grow-1">
                    <input
                      type="text"
                      className="form-control ps-5 py-2 border-0 bg-white"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderRadius: "10px" }}
                      placeholder="Search items, SKU, or category..."
                      onChange={(e) => setSearchQuery(e.target.value)}
                      value={searchQuery}
                    />
                    <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="d-flex gap-2 overflow-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {memoizedCategories.map((cat) => (
                      <button
                        key={cat}
                        className={`btn px-4 py-1 flex-shrink-0 transition-all border-0 ${selectedCategory === cat 
                          ? 'btn-dark text-white' 
                          : 'bg-white text-secondary'}`}
                        style={{ 
                          borderRadius: "20px", 
                          fontSize: "0.85rem",
                          boxShadow: selectedCategory === cat ? "0 4px 12px rgba(0,0,0,0.15)" : "0 2px 4px rgba(0,0,0,0.05)"
                        }}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center alert border-0 bg-white shadow-sm mb-4 py-2 px-3" style={{ borderRadius: "12px" }}>
                <div className="me-2 text-primary d-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle" style={{ width: "32px", height: "32px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: "bold" }}>{customerName[0]}</span>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold" style={{ fontSize: "0.9rem" }}>{customerName}</div>
                  <div className="text-muted" style={{ fontSize: "0.75rem" }}>{customerContact} • {deliveryType}</div>
                </div>
                <button 
                  className="btn btn-sm btn-link text-decoration-none text-primary" 
                  onClick={() => setIsNameDialogOpen(true)}
                  style={{ fontSize: "0.8rem" }}
                >
                  Edit Details
                </button>
              </div>

              <div
                className="flex-grow overflow-y-auto pe-3 ProductList"
              >
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`navbutton cursor-pointer transition-all border-0 overflow-hidden text-start ${product.stock === 0 ? "opacity-50" : ""}`}
                    onClick={() => addToCart(product)}
                    style={{ 
                      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                      borderRadius: "15px",
                      background: "white"
                    }}
                  >
                    <div className="position-relative">
                      <div 
                        className="bg-light d-flex align-items-center justify-content-center"
                        style={{ height: "130px" }}
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Package size={40} className="text-secondary opacity-30" />
                        )}
                      </div>
                      <Badge 
                        variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}
                        className="position-absolute top-0 end-0 m-2"
                        style={{ borderRadius: "8px" }}
                      >
                        {product.stock > 0 ? `${product.stock} left` : "Out"}
                      </Badge>
                    </div>
                    
                    <div className="p-3">
                      <div className="mb-1 fw-bold text-dark text-truncate fs-6">{product.name}</div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-bold text-primary fs-5">₱{product.price.toFixed(2)}</div>
                        <span className="text-muted" style={{ fontSize: "0.7rem" }}>{product.category}</span>
                      </div>
                    </div>
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
                    <div className="flex-grow-1 overflow-auto mb-4 px-1" style={{ scrollbarWidth: "none" }}>
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="d-flex align-items-center border-0 mb-3 bg-light rounded-3 p-2"
                        >
                          <div 
                            className="rounded-circle border bg-white overflow-hidden d-flex align-items-center justify-content-center me-3"
                            style={{ width: "45px", height: "45px", flexShrink: 0 }}
                          >
                            {item.product.image ? (
                              <img src={item.product.image} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <Package size={18} className="text-secondary opacity-50" />
                            )}
                          </div>
                          <div className="me-auto overflow-hidden">
                            <p className="mb-0 fw-bold text-truncate" style={{ fontSize: "0.85rem" }}>{item.product.name}</p>
                            <div className="fw-bold text-primary" style={{ fontSize: "0.8rem" }}>₱{(item.product.price * item.quantity).toFixed(2)}</div>
                          </div>
                          
                          <div className="d-flex align-items-center bg-white rounded-pill px-1 shadow-sm ms-2">
                             <button 
                               className="btn btn-sm border-0 p-1" 
                               onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                             >
                               <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>−</span>
                             </button>
                             <span className="mx-2 fw-bold" style={{ fontSize: "0.85rem", minWidth: "20px", textAlign: "center" }}>
                               {item.quantity}
                             </span>
                             <button 
                               className="btn btn-sm border-0 p-1" 
                               onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                               disabled={item.quantity >= item.product.stock}
                             >
                               <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>+</span>
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto bg-light rounded-4 p-3 shadow-sm border border-white">
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Items Subtotal:</span>
                        <span className="fw-medium">₱{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-muted small">
                        <span>Local Tax ({taxRate}%):</span>
                        <span className="fw-medium">₱{tax.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-3 fw-bold border-top pt-2" style={{ fontSize: "1.1rem" }}>
                        <span>Total:</span>
                        <span className="text-primary">₱{total.toFixed(2)}</span>
                      </div>
                      <div className="d-grid gap-2">
                        <Button
                          variant="dark"
                          style={{ borderRadius: "12px", padding: "12px", fontWeight: "bold" }}
                          onClick={() => setIsCheckoutOpen(true)}
                          disabled={cart.length === 0}
                        >
                          Checkout Now
                        </Button>
                        <Button
                          variant="outline-danger"
                          className="border-0 bg-transparent text-danger btn-sm"
                          onClick={clearCart}
                          disabled={cart.length === 0}
                        >
                          Clear Trash Cart
                        </Button>
                      </div>
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
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Process Payment</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          <div className="mb-4 bg-light rounded-4 p-3 border border-white shadow-sm">
            <h6 className="fw-bold mb-3 small text-muted text-uppercase">Order Summary</h6>
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="d-flex justify-content-between mb-2"
                style={{ fontSize: "0.9rem" }}
              >
                <span className="text-muted">
                  {item.product.name} <small>x{item.quantity}</small>
                </span>
                <span className="fw-medium">₱{(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-top mt-2 pt-2 d-flex justify-content-between align-items-center">
              <span className="fw-bold">Total Payable</span>
              <span className="fs-4 fw-bold text-primary">₱{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="taxRate" className="small fw-bold text-muted text-uppercase mb-2 d-block">Tax Percentage (%)</label>
            <input
              type="number"
              id="taxRate"
              min="0"
              max="100"
              step="0.01"
              className="form-control border-0 bg-light p-3 rounded-3"
              style={{ boxShadow: "inset 0 1px 4px rgba(0,0,0,0.05)" }}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="mb-4">
            <label className="small fw-bold text-muted text-uppercase mb-2 d-block">Cash Amount Received (₱)</label>
            <input
              type="number"
              className="form-control border-0 bg-light p-3 rounded-3 fs-4 fw-bold text-primary"
              style={{ boxShadow: "inset 0 1px 4px rgba(0,0,0,0.05)" }}
              placeholder="0.00"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </div>

          {cashAmount && parseFloat(cashAmount) >= total && (
            <div className="alert alert-success border-0 rounded-4 py-3 text-center mb-4 shadow-sm bg-success bg-opacity-10 text-success">
              <div className="small text-uppercase fw-bold opacity-75 mb-1">Return Change</div>
              <div className="fs-3 fw-bold">₱{(parseFloat(cashAmount) - total).toFixed(2)}</div>
            </div>
          )}
          
          {cashAmount && parseFloat(cashAmount) > 0 && parseFloat(cashAmount) < total && (
            <div className="alert alert-danger border-0 rounded-4 py-3 text-center mb-4 shadow-sm bg-danger bg-opacity-10 text-danger">
              <div className="small text-uppercase fw-bold opacity-75 mb-1">Remaining Balance</div>
              <div className="fs-3 fw-bold">₱{(total - parseFloat(cashAmount)).toFixed(2)}</div>
            </div>
          )}

          <Button
            variant="dark"
            onClick={handleConfirmPayment}
            className="w-100 py-3 shadow-sm"
            style={{ borderRadius: "14px", fontWeight: "bold" }}
            disabled={!cashAmount || parseFloat(cashAmount) < total}
          >
            Complete Transaction
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
