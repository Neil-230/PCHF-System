import { useEffect, useMemo, useState } from "react";
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
  Search,
  Trash2,
  FileDown,
} from "lucide-react";
import { Chart } from "react-google-charts";
import { AuthService } from "../data/authData";
import { toast } from "sonner";
import type { User } from "../types/auth";
import apiService from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


interface DashboardProps {
  transactions: any[];
  CurrentUser: User;
}

export function Dashboard({ transactions, CurrentUser }: DashboardProps) {
  const today = new Date();
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [activeLog, setActiveLog] = useState<any[]>([]);
  const [isActiveLogLoading, setIsActiveLogLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [isClearingLog, setIsClearingLog] = useState(false);
  const [isExportingLogPdf, setIsExportingLogPdf] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const loadActiveLog = async () => {
      setIsActiveLogLoading(true);
      try {
        const { entries } = await apiService.getActiveLog();
        if (!mounted) return;
        setActiveLog(entries || []);
      } catch {
        if (!mounted) return;
        setActiveLog([]);
      } finally {
        if (mounted) setIsActiveLogLoading(false);
      }
    };
    loadActiveLog();
    const interval = setInterval(loadActiveLog, 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredActiveLog = useMemo(() => {
    const query = logSearch.trim().toLowerCase();
    if (!query) return activeLog;
    return activeLog.filter((entry) => {
      const haystack = [
        entry.name,
        entry.email,
        entry.role,
        entry.status,
        entry.ip,
        entry.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeLog, logSearch]);

  const handleClearActiveLog = async () => {
    if (!activeLog.length) {
      toast.info("There are no logs to clear right now.");
      return;
    }
    if (!window.confirm("Clear all activity logs? This action cannot be undone.")) {
      return;
    }
    setIsClearingLog(true);
    try {
      await apiService.clearActiveLog();
      setActiveLog([]);
      toast.success("Active log cleared successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to clear active log");
    } finally {
      setIsClearingLog(false);
    }
  };
  
//  <iframe
//     src="https://nonspirited-interwrought-scott.ngrok-free.dev"

//     style="position:fixed;bottom:0;right:0;z-index:9999;border:0;width:420px;height:720px;border-radius:16px;overflow:hidden;background:transparent;pointer-events:auto;"
//     allow="microphone;"
//     ></iframe>

  //handle the pdf export
  const handleDownloadActiveLogPdf = async () => {
    if (!filteredActiveLog.length) {
      toast.info("No entries to export.");
      return;
    }
    setIsExportingLogPdf(true);
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("Active Log", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [["Name", "Email", "Role", "Status", "Time", "IP", "Location"]],
        body: filteredActiveLog.map((entry) => [
          entry.name,
          entry.email,
          entry.role,
          entry.status,
          entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—",
          entry.ip || "N/A",
          entry.location || "Unavailable",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [51, 51, 51] },
      });
      doc.save(`active-log-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (error: any) {
      toast.error(error?.message || "Failed to export PDF");
    } finally {
      setIsExportingLogPdf(false);
    }
  };

  

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
        <div
          className="card p-3 border-0 h-100"
          style={{ boxShadow: "2px 4px 8px  rgba(0, 0, 0, 0.10)" }}
        >
          <div className="card-header bg-transparent d-flex gap-2">
            {/* ActiveLog HeadTitle_________ */}
            <h6 className="mt-2 fw-bold me-auto">
              <Clock size={18} /> Active log
            </h6>
            {/* ActiveLog Search_________ */}
            <div className="flex-grow-0 position-relative border-0">
              <Search
                size={18}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#6c757d" }}
              />
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Search for spacific Account..."
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
              />
            </div>
            {/* ActiveLog Clear Button_________ */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-dark d-flex align-items-center"
                onClick={handleClearActiveLog}
                disabled={isClearingLog}
              >
                <Trash2 size={18} className="me-2" />
                {isClearingLog ? "Clearing..." : "Clear Active Log"}
              </button>
            </div>
            {/* ActiveLog PDF button */}
            <button
              className="btn btn-outline-secondary d-flex align-items-center"
              onClick={handleDownloadActiveLogPdf}
              disabled={isExportingLogPdf}
            >
              <FileDown size={18} className="me-2" />
              {isExportingLogPdf ? "Preparing..." : "PDF"}
            </button>
          </div>
          <div className="card-body" style={{ maxHeight: "255px", overflowY: "auto" }}>
            <div className="list-group border-0">
              {isActiveLogLoading && (
                <div className="list-group-item border-0 text-center text-muted">
                  Loading activity...
                </div>
              )}
              {!isActiveLogLoading && activeLog.length === 0 && (
                <div className="list-group-item border-0 text-center text-muted">
                  No activity logs yet.
                </div>
              )}
              {!isActiveLogLoading && activeLog.length > 0 && filteredActiveLog.length === 0 && (
                <div className="list-group-item border-0 text-center text-muted">
                  No matches for “{logSearch.trim()}”.
                </div>
              )}
              {!isActiveLogLoading &&
                filteredActiveLog.map((entry: any) => (
                  <div
                    key={`${entry.id}-${entry.timestamp}`}
                    className="list-group-item border-0 mb-2 d-flex align-items-start"
                    style={{ borderRadius: "8px", padding: "12px" }}
                  >
                    <div className="me-auto">
                      <strong>{entry.name}</strong>{" "}
                      <span className="badge border text-dark ms-1 text-capitalize">
                        {entry.role}
                      </span>
                      <br />
                      <span className="text-muted">{entry.email}</span>
                      <br />
                      <small>
                        Status:{" "}
                        <span
                          className={`badge ${entry.status === 'Logout' ? 'bg-warning text-dark' : 'bg-success'}`}
                        >
                          {entry.status || "Login"}
                        </span>
                      </small>
                      <br />
                      <small>
                        Time: {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—" }
                      </small>
                    </div>
                    <div className="text-end me-2">
                      <small>IP: {entry.ip || "N/A"}</small>
                      <br />
                      <small>Location: {entry.location || "Unavailable"}</small>
                      <br />
                      <small>
                        Lat / Long:{" "}
                        {Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude)
                          ? `${entry.latitude?.toFixed(4)}°, ${entry.longitude?.toFixed(4)}°`
                          : "N/A"}
                      </small>
                    </div>
                    {/* <div className="ms-none mt-4">
                      <button
                        className="btn btn-outline-dark d-flex align-items-center"
                      >
                        <Trash2 size={18} className="me-0" />

                      </button>
                    </div> */}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-3 border-0 mt-4" style={{ boxShadow: "2px 4px 8px  rgba(0, 0, 0, 0.10)" }}>
        <h6>Inventory Status</h6>
        <div className="d-flex justify-content-between text-center">
          <div style={{ flex: 1 }}>
            <h3 style={{ color: "blue" }}>
              {(displayTotalProducts ?? totalProducts) -
                (displayLowStockItems ?? lowStockItems) -
                (displayOutOfStockItems ?? outOfStockItems)}
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
  );
}

//joker kaayo na emoji i backspace gali kausa mawala ang bula,
//ma reveal iyang nawong hahahha
//😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️
