import "./css/layout.css";
import { useState, useEffect } from "react";
import { // Iconssssssssss 
  ShoppingCart,
  Package,
  BarChart3,
  AlertTriangle,
  Settings,
  CreditCard,
  Bell,
  LogOut,
  Home,
  Menu,
  User,
  ShieldIcon,
} from "lucide-react";
import apiService from "../services/api";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: {
    name: string;
    email: string;
    role: string; // any, owner, admin, cashier. NOTE. String ni sya
  };
  onLogout: () => void;
}

//Upadetes navigation bar dependi sa owner
const navigation = [
  { id: "dashboard", label: "Dashboard", icon: Home, roles: ["admin", "owner"] },
  { id: "pos", label: "Point of Sale", icon: CreditCard, roles: ["admin", "cashier", "owner"] },
  { id: "inventory", label: "Inventory", icon: Package, roles: ["admin", "owner"] },
  { id: "transactions", label: "Transactions", icon: BarChart3, roles: ["admin", "cashier", "owner"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["admin", "cashier", "owner"] },
];

export function Layout({ children, activeTab, onTabChange, user, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifLow, setNotifLow] = useState<any[]>([]);
  const [notifOut, setNotifOut] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState<number>(0);

  const getUserInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  // Filter tabs dependi sa Roles
  const allowedNavigation = navigation.filter((item) => item.roles.includes(user.role));
  const canAccessDashboard = allowedNavigation.some((item) => item.id === 'dashboard');

  // Load notifications from backend and poll periodically
  useEffect(() => {
    let mounted = true;
    if (!canAccessDashboard) {
      setNotifLow([]);
      setNotifOut([]);
      setNotifCount(0);
      return () => { mounted = false; };
    }

    const load = async () => {
      try {
        const m = await apiService.getDashboardMetrics();
        const low = (m?.notificationsDetail?.lowStock) || [];
        const out = (m?.notificationsDetail?.outOfStock) || [];
        if (!mounted) return;
        setNotifLow(low);
        setNotifOut(out);
        const total = Number(m?.lowStockItems || 0) + Number(m?.outOfStockItems || 0);
        setNotifCount(total);
      } catch (err: any) {
        if (!mounted) return;
        if (err?.status === 403) {
          setNotifLow([]);
          setNotifOut([]);
          setNotifCount(0);
          mounted = false;
          return;
        }
        setNotifLow([]);
        setNotifOut([]);
        setNotifCount(0);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, [canAccessDashboard]);

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div
          className="border-0 pt-4 bg-dark"
          style={{
            width: "250px",
            height: "100vh",
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            boxShadow: "2px 4px 8px  rgba(27, 27, 27, 0.26)",
          }}
        >
          <div className="d-flex align-items-center mb-5 ms-4">
            <span className="fw-bold text-light">PCH Hardware Store</span>
          </div>
          <ul className="nav flex-column gap-3">
            {allowedNavigation.map((item) => (
              <li key={item.id} className="nav-item d-flex justify-content-center">
                <button
                  className="navbutton nav-link d-flex align-items-center text-light"
                  style={{
                    minWidth: "200px",
                    backgroundColor:
                      activeTab === item.id ? "rgba(27, 27, 27, 0.17)" : "transparent",
                    fontWeight: activeTab === item.id ? "bold" : "normal",
                    borderRadius: activeTab === item.id ? "6px" : "0px",
                    boxShadow:
                      activeTab === item.id
                        ? "2px 4px 8px  rgba(0, 0, 0, 0.27)"
                        : "none",
                  }}
                  onClick={() => onTabChange(item.id)}
                >
                  <item.icon size={18} className="me-2" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main content */}
      <div className="maincontent flex-grow-1 d-flex flex-column">
        {/* Header */}
        <header
          className="border-0 m-1 me-4 ms-4 rounded-3 px-3 py-2 d-flex align-items-center bg-dark"
          style={{ boxShadow: "2px 4px 8px  rgba(27, 27, 27, 0.26)" }}
        >
          <button
            className="btn btn-light me-3 bg-transparent border-0"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            <Menu className="text-light" size={20} />
          </button>

          <h5 className="m-0 text-light">
            {allowedNavigation.find((nav) => nav.id === activeTab)?.label ||
              "Point of Sale"}
          </h5>

          {/* Right side */}
          <div className="ms-auto d-flex align-items-center gap-3">
            {/* Notifications */}
            <div className="dropdown">
              <button className="btn position-relative mt-2" data-bs-toggle="dropdown">
                <Bell className="text-light" size={20} />
                {notifCount > 0 && (
                  <span className="badge bg-light position-absolute top-0 start-100 translate-middle text-dark">
                    {notifCount}
                  </span>
                )}
              </button>
              <div className="dropdown-menu dropdown-menu-end p-2" style={{ width: "320px" }}>
                <h6 className="dropdown-header d-flex justify-content-between align-items-center">
                  <span>Notifications</span>
                  <small className="text-muted">{notifCount}</small>
                </h6>
                {notifCount === 0 ? (
                  <div className="dropdown-item-text text-muted small">No notifications</div>
                ) : (
                  <>
                    {notifOut.slice(0, 6).map((p: any) => (
                      <div key={`out-${p.id}`} className="dropdown-item d-flex gap-2">
                        <Package size={16} className="text-danger mt-1" />
                        <div>
                          <strong>Out of Stock</strong>
                          <div className="small text-muted">{p.name} ({p.sku})</div>
                        </div>
                      </div>
                    ))}
                    {notifLow.slice(0, Math.max(0, 6 - Math.min(6, notifOut.length))).map((p: any) => (
                      <div key={`low-${p.id}`} className="dropdown-item d-flex gap-2">
                        <AlertTriangle size={16} className="text-warning mt-1" />
                        <div>
                          <strong>Low Stock</strong>
                          <div className="small text-muted">{p.name} ({p.sku}) • {p.stock} left</div>
                        </div>
                      </div>
                    ))}
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item" onClick={() => onTabChange("inventory")}>
                      <Package size={16} className="me-2" />
                      Manage Inventory
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Account Dropdown */}
            <div className="dropdown">
              <button
                className="btn d-flex align-items-center gap-2"
                data-bs-toggle="dropdown"
              >
                <div
                  className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px" }}
                >
                  {getUserInitials(user.name)}
                </div>
                <div className="text-start d-none d-sm-block">
                  <div className="small text-light fw-bold">{user.name}</div>
                  <div className="text-light small text-capitalize">{user.role}</div>
                </div>
              </button>
              <div className="dropdown-menu dropdown-menu-end">
                <div className="dropdown-item-text">
                  <strong>{user.name}</strong>
                  <div className="text-muted small">{user.email}</div>
                </div>
                <div className="dropdown-divider"></div>
                {/* <button className="dropdown-item">
                  <ShieldIcon size={16} className="me-2" />
                  Security Settings
                </button> */}
                <button
                  className="dropdown-item"
                  onClick={() => onTabChange("settings")}
                >
                  <Settings size={16} className="me-2" />
                  Store Settings
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item text-danger" onClick={onLogout}>
                  <LogOut size={16} className="me-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 flex-grow-1">{children}</main>
      </div>
    </div>
  );
}
