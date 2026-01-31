import { useState, useEffect } from "react";
import type { Product } from "../types";
import type { User } from "../types/auth";
import { mockProducts } from "../data/mockData";
import { Plus, Edit, Search, Package, Trash2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { FileDown } from "lucide-react";
import apiService from "../services/api";

import { Modal, Button } from "react-bootstrap";

export function InventoryManagement({ user }: { user?: User }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);

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
    });
  };

  useEffect(() => {
    apiService
      .getProducts()
      .then(({ products }) => setProducts(products))
      .catch((err: any) => {
        toast.error(err?.message || "Failed to load products");
      });
  }, []);

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
      });
      setProducts((prev) => [...prev, created.product]);
      resetForm();
      setIsAddDialogOpen(false);
      toast.success("Product added successfully");
    } catch (e: any) {
      if (e?.status === 409) {
        toast.error("Data changed by someone else. Please refresh and try again.");
        return;
      }
      toast.error(e?.message || "Failed to add product. Please try again.");
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
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!user || user.role !== "owner") {
      toast.error("Only the owner can delete products");
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.error("Product not found. Please refresh.");
      return;
    }

    if (product.__v === undefined) {
      toast.error("This product's version is unknown. Please refresh before deleting.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;
    try {
      await apiService.deleteProduct(productId, product.__v);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success("Product deleted");
    } catch (e: any) {
      if (e?.status === 409) {
        toast.error("Data changed by someone else. Please refresh and try again.");
        return;
      }
      toast.error(e?.message || "Failed to delete product. Please try again.");
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
    doc.setFontSize(16);
    doc.text("Inventory Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    let yPos = 35;
    const categories = [
      { title: "Out of Stock", filter: (p: Product) => p.stock === 0 },
      { title: "Low Stock (1-10)", filter: (p: Product) => p.stock > 0 && p.stock <= 10 },
      { title: "In Stock (>10)", filter: (p: Product) => p.stock > 10 },
    ];

    categories.forEach(({ title, filter }) => {
      const items = products.filter(filter);
      if (items.length > 0) {
        doc.setFontSize(12);
        doc.text(title, 14, yPos);
        yPos += 6;
        doc.setFontSize(10);

        items.forEach((p) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(
            `${p.name} | PHP. ${p.price.toFixed(2)} | Stock: ${p.stock} | SKU: ${p.sku}`,
            14,
            yPos
          );
          yPos += 6;
        });

        yPos += 8;
      }
    });

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
          <Modal.Title>{editingProduct ? "Edit Product" : "Add Product"}</Modal.Title>
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
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit size={16} />
                      </button>
                      {user?.role === "owner" && (
                        <button
                          className="btn btn-outline-danger btn-sm ms-2"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 size={16} />
                        </button>
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