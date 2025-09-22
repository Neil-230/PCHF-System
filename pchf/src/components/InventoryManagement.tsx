import { useState } from "react";
import type { Product } from "../types";
import { mockProducts } from "../data/mockData";
import { Plus, Edit, Search, Package } from "lucide-react";
import { toast } from "sonner";
export function InventoryManagement() {
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
  const categories = ["Coffee", "Snacks", "Drinks", "Stationery"];

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

  // SKU Generator (e.g., COF001, SNA123)
  const generateSKU = (category: string) => {
    const prefix = category.substring(0, 3).toUpperCase(); // First 3 letters
    const randomNum = Math.floor(100 + Math.random() * 900); // Random 3-digit number
    return `${prefix}${randomNum}`;
  };

  const handleAddProduct = () => {
    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      toast.error("Please fill in all required fields");
      return;
    }

    const skuValue = formData.sku.trim() || generateSKU(formData.category);

    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      stock: parseInt(formData.stock),
      sku: skuValue,
      description: formData.description,
    };

    setProducts((prev) => [...prev, newProduct]);
    resetForm();
    setIsAddDialogOpen(false);
    toast.success("Product added successfully");
  };

  const handleEditProduct = () => {
    if (!editingProduct) return;

    const updatedProduct: Product = {
      ...editingProduct,
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      stock: parseInt(formData.stock),
      sku: formData.sku.trim() || generateSKU(formData.category),
      description: formData.description,
    };

    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p))
    );
    resetForm();
    setEditingProduct(null);
    toast.success("Product updated successfully");
  };

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

  // Stocks color coding
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "danger"};
    if (stock <= 10) return { label: "Low Stock", variant: "secondary" };
    return { label: "In Stock", variant: "dark" };
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
          <div className="card text-center p-3 gap-4">
            <div className="d-flex flex-row justify-content-between align-items-center">
              <h6>Total Products</h6>
              <Package size={20} className="mb-2"/>
            </div>
            <strong className="text-start">{totalProducts}</strong>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 gap-4">
            <h6 className="text-start">Total Value</h6>

            <div className="fw-bold text-start">₱{totalValue.toFixed(2)}</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 gap-4">
            <div className="d-flex flex-row justify-content-between align-items-center">
              <h6>Low Stock</h6>
              <span className="badge bg-secondary text-light" style={{ width: "25px" }}>{lowStockProducts}</span>
            </div>
            <div className="text-warning fw-bold text-muted text-start">{lowStockProducts} items</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center p-3 gap-4">
            <div className="d-flex flex-row justify-content-between align-items-center">
              <h6>Out of Stock</h6>
              <span className="badge bg-danger text-light" style={{ width: "25px" }}>{outOfStockProducts}</span>
            </div>
            <div className="text-danger fw-bold text-start">{outOfStockProducts} items</div>
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="d-flex align-items-center gap-3 my-3">
        <div className="flex-grow-1 position-relative">
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
      </div>

      {/* Add/Edit Modal */}
      {(isAddDialogOpen || editingProduct) && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingProduct(null);
                  }}
                />
              </div>
              <div className="modal-body">
                {/* PRODUCT AND PRICE */}
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
                {/* ___ */}

                <div className="row">
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
                <div className="mb-3">
                  <label className="form-label">SKU (leave blank for auto)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingProduct(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={editingProduct ? handleEditProduct : handleAddProduct}
                >
                  {editingProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="card">
        <div className="card-body p-0">
          <table className="table table-striped table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
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
                      <div>
                        <p className="fw-semibold">{product.name}</p>
                        {product.description && (
                          <p style={{ fontSize: "0.875rem", color: "#6c757d" }}>{product.description}</p>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{product.sku}</td>
                    <td>
                      <span className="badge text-dark border" >{product.category}</span>
                    </td>
                    <td className="fw-semibold">₱{product.price.toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span className={`badge bg-${stockStatus.variant}`}>{stockStatus.label}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit size={16} />
                      </button>
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