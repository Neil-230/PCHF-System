import { useState, useEffect } from "react";
import type { Product } from "../types";
import type { User } from "../types/auth";
import { Plus, Edit, Search, Package, Archive, RotateCcw, LayoutGrid, FileDown } from "lucide-react";
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
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <div className="d-flex flex-row justify-content-between align-items-center">
              <h6>Total Products</h6>
              {/* <Package size={20} className="mb-2"/> */}
            </div>
            <strong className="text-start text-primary fs-5">{totalProducts}</strong>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <h6 className="text-start">Total Value</h6>

            <div className="fw-bold text-start text-success fs-5">₱{totalValue.toFixed(2)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <div className="d-flex flex-row justify-content-between align-items-center">
              <h6>Low Stock</h6>
              {/* <span className="badge bg-secondary text-light" style={{ width: "25px" }}>{lowStockProducts}</span> */}
            </div>
            <div className="text-warning fw-bold text-warning text-start fs-5">{lowStockProducts} items</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <div className="d-flex flex-row justify-content-between align-items-center">
              <h6>Out of Stock</h6>
              {/* <span className="badge bg-danger text-light" style={{ width: "25px" }}>{outOfStockProducts}</span> */}
            </div>
            <div className="text-danger fw-bold text-start fs-5">{outOfStockProducts} items</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="d-flex align-items-center gap-3 my-3">
        <div className="flex-grow-1 position-relative border-0">
          <Search
            size={18}
            style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6c757d" }}
          />
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search products, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="d-flex gap-2">
          <button
            className="btn btn-dark d-flex align-items-center"
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus size={18} className="me-2" />
            Add Product
          </button>

          <button
            className="btn btn-outline-secondary d-flex align-items-center"
            onClick={handleDownloadPDF}
          >
            <FileDown size={18} className="me-2" />
            Download PDF
          </button>

          <button
            className={`btn d-flex align-items-center ${showArchived ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <LayoutGrid size={18} className="me-2" /> : <Archive size={18} className="me-2" />}
            {showArchived ? 'Show Active' : 'Show Archive'}
          </button>
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
        style={{ backgroundColor: "rgba(239, 252, 255, 0.31)" }}
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title>{editingProduct ? (showArchived ? "View Archived Product" : "Edit Product") : "Add Product"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="row">
            <div className="col-md-6 d-flex flex-column">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="col-md-6 d-flex flex-column">
              <label className="form-label">Price</label>
              <input
                type="number"
                className="form-control"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="row mt-3">
            <div className="col-md-6 d-flex flex-column">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6 d-flex flex-column">
              <label className="form-label">Stock</label>
              <input
                type="number"
                className="form-control"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="form-label">SKU (leave blank for auto)</label>
            <input
              type="text"
              className="form-control"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <div className="mt-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="mt-3">
            <label className="form-label">Product Image</label>
            <div className="d-flex align-items-start gap-3">
              <div 
                className="border rounded-3 d-flex align-items-center justify-content-center bg-light overflow-hidden"
                style={{ width: "120px", height: "120px", cursor: "pointer" }}
                onClick={() => document.getElementById('productImageInput')?.click()}
              >
                {formData.image ? (
                  <img src={formData.image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="text-center text-muted p-2">
                    <Plus size={24} className="mb-1" />
                    <div style={{ fontSize: "0.75rem" }}>Upload</div>
                  </div>
                )}
              </div>
              <div className="flex-grow-1">
                <input
                  id="productImageInput"
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                
                <div className="mb-3">
                  <label className="form-label small text-muted">Paste Image URL</label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="https://example.com/image.jpg"
                    value={formData.image.startsWith('data:') ? '' : formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  />
                  <p className="text-muted" style={{ fontSize: "0.7rem", marginTop: "4px" }}>
                    Or click the box on the left to upload a local file.
                  </p>
                </div>

                {formData.image && (
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setFormData({ ...formData, image: "" })}
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button
            variant="secondary"
            onClick={() => {
              setIsAddDialogOpen(false);
              setEditingProduct(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={showArchived}
            onClick={editingProduct ? handleEditProduct : handleAddProduct}
          >
            {editingProduct ? "Save Changes" : "Add Product"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Products Table */}
      <div className="card border-0 rounded-3" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
        <div className="card-body p-0 ">
          <table className="table table-hover mb-0"> {/*table-striped Used this to make it stripe*/}
            <thead className="">
              <tr className="">
                <th>Preview</th>
                <th>Category</th>
                <th>ID</th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock);
                return (
                  <tr key={product.id}>
                    <td>
                      <div 
                        className="rounded-2 border bg-light overflow-hidden d-flex align-items-center justify-content-center"
                        style={{ width: "48px", height: "48px" }}
                      >
                        {product.image ? (
                          <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Package size={20} className="text-secondary opacity-50" />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge text-dark border-0" >{product.category}</span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{product.sku}</td>
                    <td style={{backgroundColor:"white"}}>
                      <div>
                        <p className="fw-semibold">{product.name}</p>
                        {product.description && (
                          <p style={{ fontSize: "0.875rem", color: "#6c757d" }}>{product.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="fw-semibold">₱{product.price.toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span className={`badge fw-bold text-${stockStatus.variant}`}>{stockStatus.label}</span>
                    </td>
                    <td>
                      {!showArchived && (
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      
                      {user?.role === "owner" && (
                        <>
                          {showArchived ? (
                            <button
                              className="btn btn-outline-success btn-sm ms-2"
                              onClick={() => handleRestoreProduct(product.id)}
                              title="Restore to Active"
                            >
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline-warning btn-sm ms-2"
                              onClick={() => handleArchiveProduct(product.id)}
                              title="Archive Product"
                            >
                              <Archive size={16} />
                            </button>
                          )}
                        </>
                      )}
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