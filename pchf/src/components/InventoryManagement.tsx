import { useState, useEffect } from "react";
import type { Product } from "../types";
import type { User } from "../types/auth";
import { Plus, Edit, Search, Package, Archive, RotateCcw, LayoutGrid, FileDown, Boxes, ClipboardList, AlertCircle, ShoppingBag, Tag, Layers, Info } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import apiService from "../services/api";

import { Modal, Button } from "react-bootstrap";

export function InventoryManagement({ user }: { user?: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    stock: "",
    sku: "",
    description: "",
    image: "",
  });

  // Example categories
  const categories = ["All", "Tools", "Electrical", "Fasteners", "Painting"];

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      category: "",
      stock: "",
      sku: "",
      description: "",
      image: "",
    });
  };

  useEffect(() => {
    apiService
      .getProducts({ archived: showArchived })
      .then(({ products }) => setProducts(products))
      .catch((err: any) => {
        toast.error(err?.message || "Failed to load products");
      });
  }, [showArchived]);

  // SKU Generator (e.g., COF001, SNA123) pwedi ni ninyo i Module
  const generateSKU = (category: string) => {
    const prefix = category.substring(0, 3).toUpperCase(); // First 3 letters
    const randomNum = Math.floor(100 + Math.random() * 900); // Random 3-digit number
    return `${prefix}${randomNum}`;
  };

  const handleAddProduct = async () => {
    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      toast.error("Please fill in all required fields");
      return;
    }

    const skuValue = formData.sku.trim() || generateSKU(formData.category);

    setIsSaving(true);
    try {
      const created = await apiService.createProduct({
        name: formData.name,
        sku: skuValue,
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        description: formData.description,
        image: formData.image,
      });
      setProducts((prev) => [...prev, created.product]);
      resetForm();
      setIsAddDialogOpen(false);
      toast.success("Product added successfully");
    } catch (e: any) {
      // Show only one toast for the error
      const errorMsg = e?.status === 409
        ? "Data changed by someone else. Please refresh and try again."
        : e?.message || "Failed to add product. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    if (editingProduct.__v === undefined) {
      toast.error("This product's version is unknown. Please refresh before editing.");
      return;
    }

    const updates = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      stock: parseInt(formData.stock),
      sku: formData.sku.trim() || generateSKU(formData.category),
      description: formData.description,
      image: formData.image,
      version: editingProduct.__v,
    } as any;

    setIsSaving(true);
    try {
      const { product } = await apiService.updateProduct(editingProduct.id, updates);
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? product : p)));
      resetForm();
      setEditingProduct(null);
      toast.success("Product updated successfully");
    } catch (e: any) {
      if (e?.status === 409) {
        toast.error("Data changed by someone else. Please refresh and try again.");
        return;
      }
      toast.error(e?.message || "Failed to update product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Keymaping for Edit
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (isAddDialogOpen || editingProduct)) {
        e.preventDefault(); 
        if (editingProduct) {
          handleEditProduct();
        } else {
          handleAddProduct();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isAddDialogOpen, editingProduct, formData]);

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      stock: product.stock.toString(),
      sku: product.sku,
      description: product.description || "",
      image: product.image || "",
    });
  };

  const handleArchiveProduct = async (productId: string) => {
    if (!user || user.role !== "owner") {
      toast.error("Only the owner can archive products");
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (product.__v === undefined) {
      toast.error("This product's version is unknown. Please refresh.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to archive this product? It will no longer appear in the POS.");
    if (!confirmed) return;
    try {
      await apiService.deleteProduct(productId, product.__v);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product archived");
    } catch (e: any) {
      if (e?.status === 409) {
        toast.error("Data changed by someone else. Please refresh.");
        return;
      }
      toast.error(e?.message || "Failed to archive product.");
    }
  };

  const handleRestoreProduct = async (productId: string) => {
    if (!user || user.role !== "owner") {
      toast.error("Only the owner can restore products");
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (product.__v === undefined) {
      toast.error("This product's version is unknown. Please refresh.");
      return;
    }

    try {
      await apiService.restoreProduct(productId, product.__v);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product restored to active inventory");
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore product.");
    }
  };

  // color codes. aypag bout bout sa color ako rabay UI 
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "danger"};
    if (stock <= 10) return { label: "Low Stock", variant: "warning" };
    return { label: "In Stock", variant: "primary" };
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Inventory Report", 14, 22);
    
    // Subtitle / Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Filter categories
    const outOfStock = products.filter((p) => p.stock === 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10);
    const inStock = products.filter((p) => p.stock > 10);

    // Summary stats
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Items: ${products.length}  |  Out of Stock: ${outOfStock.length}  |  Low Stock: ${lowStock.length}`, 14, 38);

    const tableColumn = ["Product Name", "SKU", "Category", "Price", "Stock", "Status"];
    const tableRows: any[] = [];

    // Helper to add rows
    const addRows = (items: Product[], statusLabel: string) => {
      items.forEach((p) => {
        tableRows.push([
          p.name,
          p.sku,
          p.category,
          `PHP ${p.price.toFixed(2)}`,
          p.stock.toString(),
          statusLabel
        ]);
      });
    };

    // Add rows grouping by stock status to keep it organized
    addRows(outOfStock, "Out of Stock");
    addRows(lowStock, "Low Stock");
    addRows(inStock, "In Stock");

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: [40, 40, 40],
        lineColor: [240, 240, 240],
        lineWidth: 0.1,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [250, 250, 250],
        textColor: [50, 50, 50],
        fontStyle: 'bold',
        lineWidth: { bottom: 0.5 },
        lineColor: [200, 200, 200]
      },
      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },
      columnStyles: {
        3: { halign: 'right' }, // Price right aligned
        4: { halign: 'center' }, // Stock center aligned
      },
      didParseCell: function(data) {
        // Color code status column
        if (data.section === 'body' && data.column.index === 5) {
          const status = data.cell.raw;
          if (status === 'Out of Stock') {
            data.cell.styles.textColor = [220, 53, 69]; // Danger red
            data.cell.styles.fontStyle = 'bold';
          } else if (status === 'Low Stock') {
            data.cell.styles.textColor = [255, 152, 0]; // Warning orange
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [25, 135, 84]; // Success green
          }
        }
      }
    });

    // Add footer with page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount}`,
            (doc.internal.pageSize as any).getWidth() - 20,
            (doc.internal.pageSize as any).getHeight() - 10,
            { align: 'right' }
        );
    }

    doc.save("Inventory_Report.pdf");
  };

  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.stock <= 10 && p.stock > 0).length;
  const outOfStockProducts = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-primary bg-opacity-10 p-2">
                <Boxes size={20} className="text-primary" />
              </div>
              <span className="text-muted small fw-medium">Total Items</span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{totalProducts.toLocaleString()}</h3>
            <div className="text-muted small mt-2">Active SKUs</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-success bg-opacity-10 p-2">
                <ShoppingBag size={20} className="text-success" />
              </div>
              <span className="text-muted small fw-medium">Stock Value</span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">₱{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="text-muted small mt-2">Inventory Worth</div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-warning bg-opacity-10 p-2">
                <AlertCircle size={20} className="text-warning" />
              </div>
              <span className="text-muted small fw-medium">Low Stock</span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{lowStockProducts}</h3>
            <div className="text-warning small mt-2 d-flex align-items-center">
              Requires Attention
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white text-danger">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-danger bg-opacity-10 p-2">
                <Archive size={20} className="text-danger" />
              </div>
              <span className="text-muted small fw-medium">Out of Stock</span>
            </div>
            <h3 className="fw-bold mb-0">{outOfStockProducts}</h3>
            <div className="text-danger small mt-2">Unavailable Items</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="card border-0 rounded-4 shadow-sm mb-4 bg-white">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5 position-relative border-0 text-start">
              <Search size={18} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="form-control form-control-lg border-light bg-light bg-opacity-50 ps-5 fs-6"
                placeholder="Search products by name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="col-lg-7 text-end d-flex gap-2 justify-content-end align-items-center">
              <button
                className={`btn btn-lg border-0 d-flex align-items-center fs-6 fw-medium ${showArchived ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted'}`}
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? <LayoutGrid size={18} className="me-2" /> : <Archive size={18} className="me-2" />}
                {showArchived ? 'Active' : 'Archived'}
              </button>

              <div className="vr mx-2 opacity-10"></div>

              <button
                className="btn btn-lg btn-outline-dark border-light bg-light bg-opacity-50 d-flex align-items-center fs-6 fw-medium"
                onClick={handleDownloadPDF}
              >
                <FileDown size={18} className="me-2" />
                Export PDF
              </button>

              <button
                className="btn btn-lg btn-dark d-flex align-items-center px-4 fs-6 fw-bold shadow-sm"
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus size={20} className="me-2" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={!!(isAddDialogOpen || editingProduct)}
        onHide={() => {
          setIsAddDialogOpen(false);
          setEditingProduct(null);
        }}
        centered
        size="lg"
        contentClassName="border-0 rounded-4 shadow-lg"
      >
        <Modal.Header closeButton className="border-0 p-4 pb-2">
          <Modal.Title className="fw-bold d-flex align-items-center">
            <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
              <ClipboardList size={20} className="text-primary" />
            </div>
            {editingProduct ? (showArchived ? "View Product Details" : "Edit Product") : "Add New Product"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4 pt-0">
          <div className="bg-light bg-opacity-50 p-3 rounded-4 mb-4 border border-light">
            <div className="row g-3">
              <div className="col-md-7">
                <label className="form-label small text-muted text-uppercase fw-bold mb-1">Product Information</label>
                <div className="mb-3">
                  <div className="input-group input-group-lg border-0 shadow-sm rounded-3 overflow-hidden">
                    <span className="input-group-text bg-white border-0 text-muted ps-3"><Package size={18} /></span>
                    <input
                      type="text"
                      className="form-control border-0 ps-2"
                      placeholder="Product Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <div className="input-group border-0 shadow-sm rounded-3 overflow-hidden">
                      <span className="input-group-text bg-white border-0 text-muted ps-3"><Tag size={16} /></span>
                      <select
                        className="form-select border-0 ps-2"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">Category</option>
                        {categories.map((cat) => cat !== "All" && (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="input-group border-0 shadow-sm rounded-3 overflow-hidden">
                      <span className="input-group-text bg-white border-0 text-muted ps-3">#</span>
                      <input
                        type="text"
                        className="form-control border-0 ps-2"
                        placeholder="SKU (Auto)"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-5">
                <label className="form-label small text-muted text-uppercase fw-bold mb-1">Pricing & Inventory</label>
                <div className="mb-3">
                  <div className="input-group input-group-lg border-0 shadow-sm rounded-3 overflow-hidden">
                    <span className="input-group-text bg-white border-0 text-dark fw-bold ps-3">₱</span>
                    <input
                      type="number"
                      className="form-control border-0 ps-2 fw-bold"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <div className="input-group border-0 shadow-sm rounded-3 overflow-hidden">
                    <span className="input-group-text bg-white border-0 text-muted ps-3"><Layers size={16} /></span>
                    <input
                      type="number"
                      className="form-control border-0 ps-2"
                      placeholder="Stock Quantity"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label small text-muted text-uppercase fw-bold mb-2 d-flex align-items-center">
                <Info size={14} className="me-1" /> Description
              </label>
              <textarea
                className="form-control border-light shadow-sm rounded-4"
                rows={5}
                placeholder="Details and specifications..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="col-md-6 text-center">
              <label className="form-label small text-muted text-uppercase fw-bold mb-2">Product Images</label>
              <div 
                className="border-dashed-custom rounded-4 d-flex flex-column align-items-center justify-content-center bg-light transition-all overflow-hidden mb-3"
                style={{ height: "135px", cursor: "pointer", border: "2px dashed #dee2e6" }}
                onClick={() => document.getElementById('productImageInput')?.click()}
              >
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-100 h-100 object-fit-cover" />
                ) : (
                  <div className="text-secondary opacity-75">
                    <Plus size={32} />
                    <div className="small fw-bold mt-1">Select File</div>
                  </div>
                )}
              </div>
              <input 
                type="text" 
                className="form-control form-control-sm border-light shadow-sm mb-2" 
                placeholder="Or paste Image URL..."
                value={formData.image.startsWith('data:') ? '' : formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
              <input id="productImageInput" type="file" accept="image/*" className="d-none" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0 p-4 pt-0 gap-2">
          <Button variant="light" className="px-4 py-2 rounded-3 fw-medium" onClick={() => { setIsAddDialogOpen(false); setEditingProduct(null); }}>
            Cancel
          </Button>
          <Button
            variant="dark"
            className="px-5 py-2 rounded-3 fw-bold shadow-sm"
            disabled={showArchived || isSaving}
            onClick={editingProduct ? handleEditProduct : handleAddProduct}
          >
            {isSaving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              editingProduct ? "Save Changes" : "Create Product"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Products Table */}
      <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light border-bottom border-light">
              <tr>
                <th className="ps-4 py-3 text-muted small fw-bold text-uppercase" style={{width: "80px"}}>Preview</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Product Details</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Reference</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Category</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Price</th>
                <th className="py-3 text-muted small fw-bold text-uppercase text-center">Stock</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Status</th>
                <th className="pe-4 py-3 text-end text-muted small fw-bold text-uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                return (
                  <tr key={product.id} className="border-bottom border-light hover-bg-light transition-all">
                    <td className="ps-4">
                      <div className="rounded-3 border border-light overflow-hidden shadow-sm bg-white d-flex align-items-center justify-content-center" style={{ width: "56px", height: "56px" }}>
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-100 h-100 object-fit-cover" />
                        ) : (
                          <Package size={24} className="text-light-grey opacity-25" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark fs-6 mb-0">{product.name}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: "0.75rem", maxWidth: "250px" }}>{product.description || "No description provided."}</div>
                    </td>
                    <td>
                      <code className="text-primary bg-primary bg-opacity-10 px-2 py-1 rounded small fw-bold">{product.sku}</code>
                    </td>
                    <td>
                      <span className="badge bg-light text-muted border py-2 px-3 rounded-pill fw-medium d-inline-flex align-items-center">
                        <Tag size={12} className="me-1" />
                        {product.category}
                      </span>
                    </td>
                    <td className="fw-bold text-dark">
                      ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <div className={`fw-bold ${product.stock <= 5 ? 'text-danger' : 'text-dark'}`}>
                        {product.stock.toLocaleString()}
                      </div>
                      <div className="text-muted" style={{fontSize: "0.65rem"}}>Units</div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill px-3 py-2 fw-bold d-flex align-items-center gap-1 w-fit ${
                        stockStatus.variant === 'danger' ? 'bg-danger bg-opacity-10 text-danger' :
                        stockStatus.variant === 'warning' ? 'bg-warning bg-opacity-10 text-warning' :
                        'bg-success bg-opacity-10 text-success'
                      }`} style={{fontSize: "0.7rem", width: "fit-content"}}>
                        <div className={`rounded-circle bg-current`} style={{width: "6px", height: "6px", backgroundColor: "currentColor"}}></div>
                        {stockStatus.label.toUpperCase()}
                      </span>
                    </td>
                    <td className="pe-4 text-end">
                      <div className="btn-group shadow-sm rounded-3 overflow-hidden border">
                        {!showArchived && (
                          <button
                            className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light p-2"
                            onClick={() => openEditDialog(product)}
                            title="Edit Product"
                          >
                            <Edit size={18} className="text-secondary" />
                          </button>
                        )}
                        
                        {user?.role === "owner" && (
                          <>
                            {showArchived ? (
                              <button
                                className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light p-2"
                                onClick={() => handleRestoreProduct(product.id)}
                                title="Restore to Active"
                              >
                                <RotateCcw size={18} className="text-success" />
                              </button>
                            ) : (
                              <button
                                className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light p-2"
                                onClick={() => handleArchiveProduct(product.id)}
                                title="Archive Product"
                              >
                                <Archive size={18} className="text-warning" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

//BUSHIT!