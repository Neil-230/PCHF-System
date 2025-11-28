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
import { Chart } from "react-google-charts";
import { AuthService } from "../data/authData";
import { useAuth } from "./auth/AuthWrapper"; //ayaw ni ninyo i delete for future updates ni
import { toast } from "sonner";
import type { User } from "../types/auth";
import apiService from "../services/api";

interface DashboardProps {
  transactions: any[];
  CurrentUser: User;
}

export function Dashboard({ transactions, CurrentUser }: DashboardProps) {
  const today = new Date();
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Load pending sign-ups (owner or admin)
  useEffect(() => {
    if (CurrentUser?.role === "owner" || CurrentUser?.role === "admin") {
      // Try backend, fallback to local AuthService
      apiService
        .getPendingAdmins()
        .then(({ pending }) => setPendingAdmins(pending))
        .catch(() => {
          const pending = AuthService.getPendingAdmins();
          setPendingAdmins(pending);
        });
    }
  }, [CurrentUser]);

  // Approve / Decline Handlers
  const handleApprove = async (email: string) => {
    try {
      await apiService.approveAdmin(email);
      const { pending } = await apiService.getPendingAdmins();
      setPendingAdmins(pending);
      toast.success("Sign-up approved successfully");
    } catch {
      AuthService.approveAdmin(email);
      setPendingAdmins(AuthService.getPendingAdmins());
      toast.success("Sign-up approved successfully");
    }
  };

  const handleDecline = async (email: string) => {
    try {
      await apiService.declineAdmin(email);
      const { pending } = await apiService.getPendingAdmins();
      setPendingAdmins(pending);
      toast.error("Sign-up request declined");
    } catch {
      AuthService.declineAdmin(email);
      setPendingAdmins(AuthService.getPendingAdmins());
      toast.error("Sign-up request declined");
    }
  };

  // Fetch metrics from backend, fallback to local computations
  useEffect(() => {
    apiService
      .getDashboardMetrics()
      .then((data) => setMetrics(data))
      .catch(() => setMetrics(null));
  }, [transactions]);

  // Fetch products for fallback and other computations
  useEffect(() => {
    apiService
      .getProducts()
      .then(({ products }) => setProducts(products))
      .catch(() => {});
  }, []);

  

  // --- Dashboard Data ---
  const todayTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.timestamp);
    return transactionDate.toDateString() === today.toDateString();
  });

  const todaySalesCalc = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const todayItemsSoldCalc = todayTransactions.reduce(
    (sum, t) =>
      sum +
      t.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0),
    0
  );

  const productSource = (products?.length ? products : mockProducts);
  const totalProducts = productSource.length;
  const totalStock = productSource.reduce((sum: number, p: any) => sum + p.stock, 0);
  const lowStockItems = productSource.filter(
    (p: any) => p.stock <= 10 && p.stock > 0
  ).length;
  const outOfStockItems = productSource.filter((p: any) => p.stock === 0).length;
  const inventoryValue = productSource.reduce(
    (sum: number, p: any) => sum + p.price * p.stock,
    0
  );

  const displayTodaySales = (metrics?.todaySales ?? todaySalesCalc);
  const displayTodayTransactions = (metrics?.todayTransactions ?? todayTransactions.length);
  const displayTodayItemsSold = (metrics?.todayItemsSold ?? todayItemsSoldCalc);
  const displayTotalProducts = (metrics?.totalProducts ?? totalProducts);
  const displayTotalStock = (metrics?.totalStock ?? totalStock);
  const displayLowStockItems = (metrics?.lowStockItems ?? lowStockItems);
  const displayOutOfStockItems = (metrics?.outOfStockItems ?? outOfStockItems);
  const displayInventoryValue = (metrics?.inventoryValue ?? inventoryValue);
  const recentTransactions = (metrics?.recentTransactions?.length ? metrics.recentTransactions : transactions);
  const hasBackendTop = Array.isArray(metrics?.topProductsByInventoryValue);
  const computedFromProducts = (products && products.length > 0)
    ? [...products].sort((a: any, b: any) => b.price * b.stock - a.price * a.stock).slice(0, 5)
    : [];
  const topProducts = hasBackendTop
    ? metrics!.topProductsByInventoryValue
    : computedFromProducts;

  const weeklyLabels = metrics?.weeklySales?.labels ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyValues = metrics?.weeklySales?.data ?? [240, 320, 180, 410, 560, 680, 420];
  const weeklySalesChartData = [
    ["Day", "Sales"],
    ...weeklyLabels.map((label: string, i: number) => [label, Number(weeklyValues[i] ?? 0)]),
  ];
  const weeklySalesChartOptions = {
    legend: { position: "bottom" },
    curveType: "function",
    colors: ["#8884d8"],
    chartArea: { width: "85%", height: "70%" },
  };

  const rawCatLabels = metrics?.salesByCategory?.labels as string[] | undefined;
  const rawCatData = metrics?.salesByCategory?.data as number[] | undefined;
  const hasCategoryData = Array.isArray(rawCatLabels) && rawCatLabels.length > 0 && Array.isArray(rawCatData) && rawCatData.some((n) => Number(n) > 0);
  const categoryPalette = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#a0e7e5", "#b4f8c8", "#fbe7c6", "#ffafcc", "#cdb4db", "#90caf9"];
  const catLabels = hasCategoryData ? rawCatLabels! : ["No products"];
  const catData = hasCategoryData ? rawCatData! : [1];
  const categorySlices = Object.fromEntries(catLabels.map((_: string, i: number) => [i, { color: categoryPalette[i % categoryPalette.length] }])) as Record<number, { color: string }>;
  const categoryChartData = [
    ["Category", "Sales"],
    ...catLabels.map((label: string, i: number) => [label, Number((catData as any)[i] ?? 0)]),
  ];
  const categoryChartOptions = {
    legend: { position: "right" },
    chartArea: { width: "85%", height: "70%" },
    slices: categorySlices,
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div
        className="d-flex justify-content-between align-items-center mb-4"
        style={{ borderBottom: "1px solid #ddd", paddingBottom: "10px" }}
      >
        <div className="d-flex flex-column">
          <div className="d-flex align-items-center mb-3">
            <div className="d-flex m-0 p-2 ps-3 rounded-3"
              style={{
                fontWeight: "bold",
                background: "white",
                boxShadow: "2px 4px 8px rgba(0, 0, 0, 0.10)",
              }}
            >
              {CurrentUser?.role === "owner" && (
                <Crown size={40} color="gold" className="me-2" />
              )}
              <h1 className="fs-4 fw-bold mt-1">
                Welcome back, {CurrentUser?.name || "User"}!
              </h1>
            </div>
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

      {/* Pending sign-up approvals (Owner or Admin) */}
      { (CurrentUser?.role === "owner" || CurrentUser?.role === "admin") && (
        <div
          className="card p-3 mb-4 border-0"
          style={{ boxShadow: "2px 4px 8px rgba(0, 0, 0, 0.10)" }}
        >
          <h6 className="mb-3">
            Pending Sign-up Approvals ({pendingAdmins.length})
          </h6>
          {pendingAdmins.length === 0 ? (
            <p className="text-muted">No pending sign-up requests.</p>
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
                    onClick={() => handleApprove(admin.email)}
                    className="btn btn-sm btn-success me-2"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleDecline(admin.email)}
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

      {/* Quick fucking analysis */}
      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Today's Sales</h6>
              <TrendingUp size={18} className="text-primary" />
            </div>
            <h3 className="text-primary">₱{displayTodaySales.toFixed(2)}</h3>
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
              <ShoppingCart size={18} className="text-success" />
            </div>
            <h3 className="text-success">{displayTodayTransactions}</h3>
            <small>
              <Users size={14} /> {displayTodayItemsSold} items sold
            </small>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Inventory Value</h6>
              <Package size={18} className="text-warning" />
            </div>
            <h3 className="text-warning">₱{displayInventoryValue.toFixed(2)}</h3>
            <small>{displayTotalStock} items in stock</small>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6>Stock Alerts</h6>
              <AlertTriangle size={18} className="text-danger" />
            </div>
            <h3 className="text-danger">
              {displayLowStockItems + displayOutOfStockItems}
            </h3>
            <small>{displayOutOfStockItems} out of stock</small>
          </div>
        </div>
      </div>

      {/* Charts yeahhhhhhhhh  */}
      <div className="row mt-4 align-items-stretch">
        <div className="col-lg-6">
          <div className="card p-3 border-0 h-100"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <h6>
              <BarChart3 size={18} /> Weekly Sales Trend
            </h6>
            <div style={{ width: "100%", height: "242px"}}>
              <Chart
                chartType="LineChart"
                data={weeklySalesChartData}
                options={weeklySalesChartOptions}
                width="100%"
                height="242px"
              />
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card p-3 border-0 h-100"
            style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
            >
            <h6><BarChart3 size={18} /> Sales by Category</h6>
            <div style={{ width: "100%", height: "242px"}}>
              <Chart
                chartType="PieChart"
                data={categoryChartData}
                options={categoryChartOptions}
                width="100%"
                height="242px"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Top Products hapit najud mahuman */}
      <div className="row g-3 mt-1">
        <div className="col-md-6">
          <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
            <h6>Top Products by Value</h6>
            {topProducts.length === 0 && (
              <p className="text-muted mb-2">No products to display.</p>
            )}
            {topProducts.map((product: any, index: number) => (
                <div
                  key={product.id || index}
                  className="d-flex justify-content-between align-items-center mb-2"
                  style={{
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
                        {product.stock} in stock • ₱{Number(product.price).toFixed(2)}
                      </small>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: "500" }}>
                      ₱{(Number(product.price) * Number(product.stock)).toFixed(2)}
                    </p>
                    <small
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        padding: "2px 6px",
                      }}
                    >
                      {product.category || "Uncategorized"}
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
            {/* Header */}
            <div className="card-header bg-transparent">
              <h6>
                <Clock size={18} /> Recent Transactions
              </h6>
            </div>

            {/* Scrollable body for better user experience 😗😗*/}
            <div
              className="card-body"
              style={{ maxHeight: "255px", overflowY: "auto" }}
            >
              {recentTransactions.map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="d-flex justify-content-between align-items-center mb-2"
                  style={{
                    background: "white",
                    paddingBottom: "5px",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: "500" }}>
                      {transaction.id}
                    </p>
                    <small style={{ color: "gray" }}>
                      {new Date(transaction.timestamp).toLocaleTimeString()} •{" "}
                      {(transaction.items || []).length} items
                    </small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontWeight: "500" }}>
                      ₱{Number(transaction.total).toFixed(2)}
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

      <div className="mt-4">
        <div className="card p-3 border-0 h-100"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
        >
          {/* Header */}
          <div className="card-header bg-transparent">
            <h6>
              <Clock size={18} /> Active log
            </h6>
          </div>

          {/* Scrollable body for better user experience 😗😗*/}
          <div
            className="card-body"
            style={{ maxHeight: "255px", overflowY: "auto" }}
          >
           

          <div className="list-group border-0">

            {/* Owner Login */}
            <div className="list-group-item border-0 mb-2 d-flex justify-content-between align-items-start" style={{ borderRadius: "8px", padding: "12px"}}>
              <div>
                <strong>Juan Dela Cruz</strong> <span className="badge border text-dark ms-1">Owner</span><br />
                <span className="text-muted">juan.owner@gmail.com</span><br />
                <small>Status: Login</small><br />
                <small>Time: 2025-11-28 08:32 AM</small>
              </div>
              <div className="text-end">
                <small>IP: 192.168.1.14</small><br />
                <small>Location: Cagayan de Oro City, PH</small><br />
                <small>Lat / Long: 8.4542° N, 124.6319° E</small>
              </div>
            </div>

            {/* Admin Login */}
            <div className="list-group-item border-0 mb-2 d-flex justify-content-between align-items-start" style={{ borderRadius: "8px", padding: "12px"}}>
              <div>
                <strong>Maria Santos</strong> <span className="badge border text-dark ms-1">Admin</span><br />
                <span className="text-muted">maria.admin@gmail.com</span><br />
                <small>Status: Login</small><br />
                <small>Time: 2025-11-28 09:15 AM</small>
              </div>
              <div className="text-end">
                <small>IP: 192.168.1.22</small><br />
                <small>Location: Valencia City, PH</small><br />
                <small>Lat / Long: 7.9061° N, 125.0942° E</small>
              </div>
            </div>

            {/* Cashier Logout */}
            <div className="list-group-item border-0 mb-2 d-flex justify-content-between align-items-start" style={{ borderRadius: "8px", padding: "12px"}}>
              <div>
                <strong>Ana Mae Villarin</strong> <span className="badge border text-dark ms-1">Cashier</span><br />
                <span className="text-muted">ana.cashier@gmail.com</span><br />
                <small>Status: Logout</small><br />
                <small>Time: 2025-11-28 03:38 PM</small>
              </div>
              <div className="text-end">
                <small>IP: 192.168.1.33</small><br />
                <small>Location: Malaybalay City, PH</small><br />
                <small>Lat / Long: 8.1521° N, 125.1277° E</small>
              </div>
            </div>

            {/* Additional stacked logs */}
            <div className="list-group-item border-0 mb-2 d-flex justify-content-between align-items-start" style={{ borderRadius: "8px", padding: "12px"}}>
              <div>
                <strong>Juan Dela Cruz</strong> <span className="badge border text-dark ms-1">Owner</span><br />
                <span className="text-muted">juan.owner@gmail.com</span><br />
                <small>Status: Logout</small><br />
                <small>Time: 2025-11-28 05:01 PM</small>
              </div>
              <div className="text-end">
                <small>IP: 192.168.1.14</small><br />
                <small>Location: Cagayan de Oro City, PH</small><br />
                <small>Lat / Long: 8.4542° N, 124.6319° E</small>
              </div>
            </div>

          </div>


          </div>
        </div>
      </div>

      {/* Inventory Status ? wamani pulos unta pero naa naman sa user requirement 😶‍🌫️😶‍🌫️😶‍🌫️ */}
      <div className="mt-4">
        <div className="card p-3 border-0"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}
          >
          <h6>Inventory Status</h6>
          <div className="d-flex justify-content-between text-center">
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "blue" }}>
                {(displayTotalProducts ?? totalProducts) - (displayLowStockItems ?? lowStockItems) - (displayOutOfStockItems ?? outOfStockItems)}
              </h3>
              <small>Well Stocked</small>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "green" }}>{displayLowStockItems ?? lowStockItems}</h3>
              <small>Low Stock</small>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "orange" }}>{displayOutOfStockItems ?? outOfStockItems}</h3>
              <small>Out of Stock</small>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "red" }}>{displayTotalProducts ?? totalProducts}</h3>
              <small>Total Products</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//joker kaayo na emoji i backspace gali kausa mawala ang bula,
//ma reveal iyang nawong hahahha
//😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️
