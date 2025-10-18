import React, { useEffect, useState } from "react";
import { mockProducts } from "../data/mockData";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  BarChart3,
  Clock,
  Crown,
  Check,
  X,
} from "lucide-react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { AuthService } from "../data/authData";
import { useAuth } from "./auth/AuthWrapper";
import { toast } from "sonner";
import type { User } from "../types/auth";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

interface DashboardProps {
  transactions: any[];
  CurrentUser: User;
}

export function Dashboard({ transactions, CurrentUser }: DashboardProps) {
  const today = new Date();
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);

  // ✅ Load pending admins (only for owner)
  useEffect(() => {
    if (CurrentUser?.role === "owner") {
      const pending = AuthService.getPendingAdmins();
      setPendingAdmins(pending);
    }
  }, [CurrentUser]);

  // ✅ Approve / Decline Handlers
  const handleApprove = (id: string) => {
    AuthService.approveAdmin(id);
    setPendingAdmins(AuthService.getPendingAdmins());
    toast.success("Admin approved successfully");
  };

  const handleDecline = (id: string) => {
    AuthService.declineAdmin(id);
    setPendingAdmins(AuthService.getPendingAdmins());
    toast.error("Admin request declined");
  };

  // --- Dashboard Data ---
  const todayTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.timestamp);
    return transactionDate.toDateString() === today.toDateString();
  });

  const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const todayItemsSold = todayTransactions.reduce(
    (sum, t) =>
      sum +
      t.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0),
    0
  );

  const totalProducts = mockProducts.length;
  const totalStock = mockProducts.reduce((sum, p) => sum + p.stock, 0);
  const lowStockItems = mockProducts.filter(
    (p) => p.stock <= 10 && p.stock > 0
  ).length;
  const outOfStockItems = mockProducts.filter((p) => p.stock === 0).length;
  const inventoryValue = mockProducts.reduce(
    (sum, p) => sum + p.price * p.stock,
    0
  );

  const salesData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Sales",
        data: [240, 320, 180, 410, 560, 680, 420],
        borderColor: "#8884d8",
        backgroundColor: "#8884d8",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const categoryData = {
    labels: ["Beverages", "Snacks", "Dairy", "Bakery"],
    datasets: [
      {
        data: [35, 25, 20, 20],
        backgroundColor: ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c"],
      },
    ],
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center mb-4"
        style={{ borderBottom: "1px solid #ddd", paddingBottom: "10px" }}
      >
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center">
            {CurrentUser?.role === "owner" && (
              <Crown size={20} color="gold" className="me-2" />
            )}
            <h1
              className="p-2 ps-3 rounded-3"
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                backgroundColor: "white",
                boxShadow: "2px 4px 8px rgba(0, 0, 0, 0.10)",
              }}
            >
              Welcome back, {CurrentUser?.name || "User"}!
            </h1>
          </div>
          <div className="d-flex">
            <p
              className="p-2 ps-3 rounded-3"
              style={{
                color: "gray",
                backgroundColor: "white",
                boxShadow: "2px 4px 8px rgba(0, 0, 0, 0.10)",
              }}
            >
              Here's what's happening at your store today.
            </p>
          </div>
        </div>
        <span
          style={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "5px 10px",
            fontSize: "14px",
            boxShadow: "2px 4px 8px rgba(0, 0, 0, 0.10)",
          }}
        >
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {/* ✅ Owner Only - Pending Admin Approvals */}
      {CurrentUser?.role === "owner" && (
        <div
          className="card p-3 mb-4 border-0"
          style={{ boxShadow: "2px 4px 8px rgba(0, 0, 0, 0.10)" }}
        >
          <h6 className="mb-3">
            Pending Admin Approvals ({pendingAdmins.length})
          </h6>
          {pendingAdmins.length === 0 ? (
            <p className="text-muted">No pending admin requests.</p>
          ) : (
            pendingAdmins.map((admin) => (
              <div
                key={admin.id}
                className="d-flex justify-content-between align-items-center mb-2"
                style={{
                  borderBottom: "1px solid #eee",
                  paddingBottom: "5px",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: "500" }}>{admin.name}</p>
                  <small style={{ color: "gray" }}>{admin.email}</small>
                </div>
                <div>
                  <button
                    onClick={() => handleApprove(admin.id)}
                    className="btn btn-sm btn-success me-2"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleDecline(admin.id)}
                    className="btn btn-sm btn-danger"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick analysis */}
      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Today's Sales</h6>
              <TrendingUp size={18} />
            </div>
            <h3>₱{todaySales.toFixed(2)}</h3>
            <small>
              <TrendingUp size={14} /> +12% from yesterday
            </small>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Transactions</h6>
              <ShoppingCart size={18} />
            </div>
            <h3>{todayTransactions.length}</h3>
            <small>
              <Users size={14} /> {todayItemsSold} items sold
            </small>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Inventory Value</h6>
              <Package size={18} />
            </div>
            <h3>₱{inventoryValue.toFixed(2)}</h3>
            <small>{totalStock} items in stock</small>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Stock Alerts</h6>
              <AlertTriangle size={18} color="orange" />
            </div>
            <h3 style={{ color: "orange" }}>
              {lowStockItems + outOfStockItems}
            </h3>
            <small>{outOfStockItems} out of stock</small>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row mt-4">
        <div className="col-lg-6">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <h6>
              <BarChart3 size={18} /> Weekly Sales Trend
            </h6>
            <Line data={salesData} />
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card d-flex border-0"
            style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
            >
            <h6>Sales by Category</h6>
            <div style={{ width: "100%", height: "242px"}}>
              <Pie
                data={categoryData}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Top Products */}
      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <h6>Top Products by Value</h6>
            {mockProducts
              .sort((a, b) => b.price * b.stock - a.price * a.stock)
              .slice(0, 5)
              .map((product, index) => (
                <div
                  key={product.id}
                  className="d-flex justify-content-between align-items-center mb-2"
                  style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: "5px",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: "#ddd",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: "500" }}>
                        {product.name}
                      </p>
                      <small style={{ color: "gray" }}>
                        {product.stock} in stock • ₱{product.price.toFixed(2)}
                      </small>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: "500" }}>
                      ₱{(product.price * product.stock).toFixed(2)}
                    </p>
                    <small
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        padding: "2px 6px",
                      }}
                    >
                      {product.category}
                    </small>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card p-3 border-0 h-100"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            {/* Header (fixed) */}
            <div className="card-header">
              <h6>
                <Clock size={18} /> Recent Transactions
              </h6>
            </div>

            {/* Scrollable Body */}
            <div
              className="card-body"
              style={{ maxHeight: "255px", overflowY: "auto" }}
            >
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="d-flex justify-content-between align-items-center mb-2"
                  style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: "5px",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: "500" }}>
                      {transaction.id}
                    </p>
                    <small style={{ color: "gray" }}>
                      {new Date(transaction.timestamp).toLocaleTimeString()} •{" "}
                      {transaction.items.length} items
                    </small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: "500" }}>
                      ₱{transaction.total.toFixed(2)}
                    </p>
                    <small
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        padding: "2px 6px",
                      }}
                    >
                      {transaction.paymentMethod}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Status */}
      <div className="mt-4">
        <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
          <h6>Inventory Status</h6>
          <div className="d-flex justify-content-between text-center">
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "green" }}>
                {totalProducts - lowStockItems - outOfStockItems}
              </h3>
              <small>Well Stocked</small>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "orange" }}>{lowStockItems}</h3>
              <small>Low Stock</small>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "red" }}>{outOfStockItems}</h3>
              <small>Out of Stock</small>
            </div>
            <div style={{ flex: 1 }}>
              <h3>{totalProducts}</h3>
              <small>Total Products</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
