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
  Activity,
  Calendar,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  SearchIcon,
  Filter,
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
  const [approvingEmails, setApprovingEmails] = useState<Set<string>>(new Set());
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
        .catch((err) => {
          console.error('Failed to fetch pending admins:', err);
          const pending = AuthService.getPendingAdmins();
          setPendingAdmins(pending);
        });
    }
  }, [CurrentUser]);

  // Approve / Decline Handlers
  const handleApprove = async (email: string) => {
    if (!email) {
      toast.error("Invalid email");
      return;
    }
    
    setApprovingEmails(prev => new Set(prev).add(email));
    try {
      // Try backend first
      await apiService.approveAdmin(email);
      const { pending } = await apiService.getPendingAdmins();
      setPendingAdmins(pending);
      toast.success("Sign-up approved successfully");
    } catch (error) {
      // Fallback to local service
      try {
        AuthService.approveAdmin(email);
        setPendingAdmins(AuthService.getPendingAdmins());
        toast.success("Sign-up approved successfully");
      } catch {
        toast.error("Failed to approve sign-up");
      }
    } finally {
      setApprovingEmails(prev => {
        const updated = new Set(prev);
        updated.delete(email);
        return updated;
      });
    }
  };

  const handleDecline = async (email: string) => {
    if (!email) {
      toast.error("Invalid email");
      return;
    }
    
    setApprovingEmails(prev => new Set(prev).add(email));
    try {
      // Try backend first
      await apiService.declineAdmin(email);
      const { pending } = await apiService.getPendingAdmins();
      setPendingAdmins(pending);
      toast.info("Sign-up request declined");
    } catch (error) {
      // Fallback to local service
      try {
        AuthService.declineAdmin(email);
        setPendingAdmins(AuthService.getPendingAdmins());
        toast.info("Sign-up request declined");
      } catch {
        toast.error("Failed to decline sign-up");
      }
    } finally {
      setApprovingEmails(prev => {
        const updated = new Set(prev);
        updated.delete(email);
        return updated;
      });
    }
  };

  // Fetch metrics from backend, fallback to local computations
  useEffect(() => {
    apiService
      .getDashboardMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => {
        console.error('Failed to fetch dashboard metrics:', err);
        setMetrics(null);
      });
  }, [transactions]);

  // Fetch products for fallback and other computations
  useEffect(() => {
    apiService
      .getProducts()
      .then(({ products }) => setProducts(products))
      .catch((err) => {
        console.error('Failed to fetch products:', err);
      });
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
    <div className="container-fluid py-4 bg-light bg-opacity-25" style={{ minHeight: "100vh" }}>
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4 mb-5">
        <div className="d-flex align-items-center gap-4">
          <div className="bg-white p-3 rounded-4 shadow-sm d-flex align-items-center justify-content-center" style={{ width: "80px", height: "80px" }}>
            {CurrentUser?.role === "owner" ? (
              <Crown size={40} className="text-warning" />
            ) : (
              <LayoutDashboard size={40} className="text-primary" />
            )}
          </div>
          <div>
            <h1 className="fw-bold mb-1 text-dark tracking-tight">
              Welcome back, {CurrentUser?.name || "User"}
            </h1>
            <div className="d-flex align-items-center gap-2 text-muted">
              <Zap size={14} className="text-warning" />
              <span className="small fw-medium">Your store is performing well today.</span>
            </div>
          </div>
        </div>
        
        <div className="d-flex align-items-center gap-2 bg-white px-4 py-3 rounded-4 shadow-sm border border-light">
          <Calendar size={18} className="text-primary" />
          <span className="fw-bold text-dark small">
            {today.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {(CurrentUser?.role === "owner" || CurrentUser?.role === "admin") && pendingAdmins.length > 0 && (
        <div className="card border-0 rounded-4 shadow-sm mb-5 bg-white overflow-hidden">
          <div className="card-header bg-white border-0 p-4 pb-0 d-flex align-items-center gap-2">
            <div className="p-2 bg-warning bg-opacity-10 rounded-circle">
              <UserPlus size={18} className="text-warning" />
            </div>
            <h6 className="fw-bold mb-0">Pending Approvals</h6>
            <span className="badge bg-light text-dark border ms-2">{pendingAdmins.length}</span>
          </div>
          <div className="card-body p-4">
            <div className="row g-3">
              {pendingAdmins.map((admin) => (
                <div key={admin.email || admin.id} className="col-12 d-flex align-items-center justify-content-between p-3 bg-light bg-opacity-50 rounded-4 border border-light">
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-circle bg-white shadow-sm p-2 text-primary" style={{width: "40px", height: "40px", display: "flex", alignItems: "center", justifyItems: "center"}}>
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">{admin.name}</div>
                      <div className="text-muted small">{admin.email}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      onClick={() => handleApprove(admin.email)}
                      disabled={approvingEmails.has(admin.email)}
                      className="btn btn-sm btn-dark rounded-3 px-3 fw-bold d-flex align-items-center gap-1"
                    >
                      <Check size={14} /> {approvingEmails.has(admin.email) ? "Approving..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleDecline(admin.email)}
                      disabled={approvingEmails.has(admin.email)}
                      className="btn btn-sm btn-outline-danger rounded-3 px-3 fw-bold d-flex align-items-center gap-1"
                    >
                      <X size={14} /> {approvingEmails.has(admin.email) ? "Declining..." : "Decline"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Primary Analytics Grid */}
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="p-3 rounded-circle bg-primary bg-opacity-10">
                <TrendingUp size={24} className="text-primary" />
              </div>
              <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-1 small">+12%</span>
            </div>
            <div className="text-muted small fw-medium mb-1">Today's Revenue</div>
            <h3 className="fw-bold mb-0 text-dark">₱{displayTodaySales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="p-3 rounded-circle bg-success bg-opacity-10">
                <ShoppingCart size={24} className="text-success" />
              </div>
              <span className="text-muted small fw-medium">Items: {displayTodayItemsSold}</span>
            </div>
            <div className="text-muted small fw-medium mb-1">Total Transactions</div>
            <h3 className="fw-bold mb-0 text-dark">{displayTodayTransactions}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="p-3 rounded-circle bg-warning bg-opacity-10">
                <Package size={24} className="text-warning" />
              </div>
              <span className="text-muted small fw-medium">Stock: {displayTotalStock}</span>
            </div>
            <div className="text-muted small fw-medium mb-1">Inventory Value</div>
            <h3 className="fw-bold mb-0 text-dark">₱{displayInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</h3>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 rounded-4 shadow-sm p-4 bg-white h-100">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="p-3 rounded-circle bg-danger bg-opacity-10">
                <AlertTriangle size={24} className="text-danger" />
              </div>
              <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-1 small">{displayOutOfStockItems} Out</span>
            </div>
            <div className="text-muted small fw-medium mb-1 text-danger">Inventory Alerts</div>
            <h3 className="fw-bold mb-0 text-danger">{displayLowStockItems + displayOutOfStockItems} Items</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="row g-4 mb-5">
        <div className="col-lg-7">
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 h-100">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="p-2 bg-primary bg-opacity-10 rounded-3">
                <BarChart3 size={18} className="text-primary" />
              </div>
              <h6 className="fw-bold mb-0">Weekly Revenue Statistics</h6>
            </div>
            <div style={{ width: "100%", height: "300px"}}>
              <Chart
                chartType="LineChart"
                data={weeklySalesChartData}
                options={{
                  ...weeklySalesChartOptions,
                  backgroundColor: 'transparent',
                  chartArea: { width: "90%", height: "75%" },
                }}
                width="100%"
                height="300px"
              />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 h-100">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="p-2 bg-success bg-opacity-10 rounded-3">
                <Activity size={18} className="text-success" />
              </div>
              <h6 className="fw-bold mb-0">Sales by Product Category</h6>
            </div>
            <div style={{ width: "100%", height: "300px"}}>
              <Chart
                chartType="PieChart"
                data={categoryChartData}
                options={{
                  ...categoryChartOptions,
                  backgroundColor: 'transparent',
                  chartArea: { width: "100%", height: "80%" },
                  legend: { position: 'bottom', textStyle: { fontSize: 11 } }
                }}
                width="100%"
                height="300px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Insight Rows */}
      <div className="row g-4 mb-5">
        <div className="col-lg-6">
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 h-100">
            <h6 className="fw-bold text-dark mb-4">Top Inventory Value Products</h6>
            {topProducts.length === 0 ? (
              <div className="text-center py-5 text-muted small">No product data available</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {topProducts.map((product: any, index: number) => (
                  <div key={product.id || index} className="d-flex align-items-center justify-content-between p-2 rounded-3 hover-bg-light transition-all">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-light rounded-circle fw-bold small text-muted d-flex align-items-center justify-content-center" style={{ width: "32px", height: "32px", fontSize: "0.7rem" }}>
                        0{index + 1}
                      </div>
                      <div>
                        <div className="fw-bold text-dark small">{product.name}</div>
                        <div className="text-muted" style={{fontSize: "0.7rem"}}>{product.stock} units • ₱{Number(product.price).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-primary small">₱{(Number(product.price) * Number(product.stock)).toLocaleString()}</div>
                      <span className="badge bg-light text-muted border py-1 px-2 rounded-pill" style={{fontSize: "0.6rem"}}>{product.category || "General"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 h-100">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <Clock size={18} className="text-muted" /> Recent Activity
              </h6>
            </div>
            
            {recentTransactions.length === 0 ? (
              <div className="text-center py-5 text-muted small">No recent transactions</div>
            ) : (
              <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: "400px" }}>
                {recentTransactions.map((transaction: any) => (
                  <div key={transaction.id} className="d-flex align-items-center justify-content-between p-2 rounded-3 hover-bg-light transition-all">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary bg-opacity-10 rounded-3 p-2 text-primary shadow-sm">
                        <ShoppingCart size={16} />
                      </div>
                      <div>
                        <div className="fw-bold text-dark small">{transaction.id}</div>
                        <div className="text-muted" style={{fontSize: "0.7rem"}}>
                          {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {(transaction.items || []).length} items
                        </div>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold text-dark small">₱{Number(transaction.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <span className="badge bg-dark rounded-pill py-1 px-2" style={{fontSize: "0.6rem"}}>{transaction.paymentMethod}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Activity Log */}
      <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden mb-5">
        <div className="card-header bg-white border-0 p-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
            <div className="d-flex align-items-center gap-2">
              <div className="p-2 bg-dark rounded-3 text-white shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h6 className="fw-bold mb-0 text-dark">Security Activity Log</h6>
                <p className="text-muted small mb-0">Real-time monitoring of system access.</p>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-3">
              <div className="position-relative border-0 shadow-sm rounded-3 overflow-hidden" style={{maxWidth: "300px"}}>
                <Search size={16} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
                <input
                  type="text"
                  className="form-control border-0 ps-5 small"
                  placeholder="Filter logs by staff..."
                  style={{ fontSize: "0.85rem" }}
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>

              <div className="btn-group shadow-sm rounded-3 overflow-hidden border bg-white">
                <button className="btn btn-white btn-sm border-0 d-flex align-items-center gap-2 px-3 fw-medium" onClick={handleDownloadActiveLogPdf} disabled={isExportingLogPdf}>
                  <FileDown size={14} className="text-muted" />
                  <span className="small">Export PDF</span>
                </button>
                <div className="vr opacity-10"></div>
                <button className="btn btn-white btn-sm border-0 d-flex align-items-center gap-2 px-3 text-danger fw-medium" onClick={handleClearActiveLog} disabled={isClearingLog}>
                  <Trash2 size={14} />
                  <span className="small">Wipe Log</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: "400px" }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light border-bottom border-light text-muted small fw-bold text-uppercase">
                <tr>
                  <th className="ps-4 py-3">Team Member</th>
                  <th className="py-3">Action Status</th>
                  <th className="py-3">Timestamp</th>
                  <th className="pe-4 py-3 text-end">Access Metadata</th>
                </tr>
              </thead>
              <tbody className="border-0">
                {isActiveLogLoading ? (
                  <tr><td colSpan={4} className="text-center py-5 text-muted small">Synchronizing logs...</td></tr>
                ) : filteredActiveLog.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-5 text-muted small">No activity recorded for this period.</td></tr>
                ) : (
                  filteredActiveLog.map((entry: any) => (
                    <tr key={`${entry.id}-${entry.timestamp}`} className="border-bottom border-light hover-bg-light transition-all">
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <div className="bg-light rounded-circle d-flex align-items-center justify-content-center p-2 text-primary" style={{width: "40px", height: "40px"}}>
                            {entry.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold text-dark small">{entry.name}</div>
                            <div className="text-muted" style={{fontSize: "0.7rem"}}>{entry.email} <span className="badge bg-light text-dark border ms-1">{entry.role}</span></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge rounded-pill px-3 py-1 fw-bold ${
                          entry.status === 'Logout' ? 'bg-warning bg-opacity-10 text-warning' : 'bg-success bg-opacity-10 text-success'
                        }`} style={{fontSize: "0.65rem"}}>
                          {entry.status?.toUpperCase() || "LOGIN"}
                        </span>
                      </td>
                      <td>
                        <div className="text-dark small fw-medium">{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : "—"}</div>
                        <div className="text-muted" style={{fontSize: "0.7rem"}}>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "—"}</div>
                      </td>
                      <td className="pe-4 text-end">
                        <div className="text-muted small">IP: {entry.ip || "Unknown"}</div>
                        <div className="text-primary fw-bold" style={{fontSize: "0.65rem"}}>{entry.location || "N/A"}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
        <div className="d-flex align-items-center gap-2 mb-4 text-center justify-content-center">
          <Activity size={20} className="text-primary" />
          <h6 className="fw-bold mb-0">Live Inventory Performance</h6>
        </div>
        <div className="row g-4 text-center">
          <div className="col-6 col-md-3">
            <h3 className="fw-bold text-primary mb-1">
              {((displayTotalProducts ?? totalProducts) - (displayLowStockItems ?? lowStockItems) - (displayOutOfStockItems ?? outOfStockItems)).toLocaleString()}
            </h3>
            <div className="text-muted small fw-medium text-uppercase tracking-wider">Well Stocked</div>
          </div>
          <div className="col-6 col-md-3 border-start border-light border-opacity-50">
            <h3 className="fw-bold text-success mb-1">{(displayLowStockItems ?? lowStockItems).toLocaleString()}</h3>
            <div className="text-muted small fw-medium text-uppercase tracking-wider">Low Threshold</div>
          </div>
          <div className="col-6 col-md-3 border-start border-light border-opacity-50">
            <h3 className="fw-bold text-warning mb-1">{(displayOutOfStockItems ?? outOfStockItems).toLocaleString()}</h3>
            <div className="text-muted small fw-medium text-uppercase tracking-wider">Out of Stock</div>
          </div>
          <div className="col-6 col-md-3 border-start border-light border-opacity-50">
            <h3 className="fw-bold text-danger mb-1">{(displayTotalProducts ?? totalProducts).toLocaleString()}</h3>
            <div className="text-muted small fw-medium text-uppercase tracking-wider">Total SKUs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

//joker kaayo na emoji i backspace gali kausa mawala ang bula,
//ma reveal iyang nawong hahahha
//😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️😶‍🌫️
