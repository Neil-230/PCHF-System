import { useState } from "react";
import {
  ShoppingCart,
  Package,
  BarChart3,
  AlertTriangle,
  Settings,
  CreditCard,
  Bell,
  User,
  LogOut,
  Home,
  Menu,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
}

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: Home, roles: ["admin"] },
  { id: "pos", label: "Point of Sale", icon: CreditCard, roles: ["admin", "cashier"] },
  { id: "inventory", label: "Inventory", icon: Package, roles: ["admin"] },
  { id: "transactions", label: "Transactions", icon: BarChart3, roles: ["admin", "cashier"] },
  { id: "settings", label: "Settings", icon: Settings, roles: ["admin", "cashier"] },
];

export function Layout({ children, activeTab, onTabChange, user, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // sidebar state

  const getUserInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  const allowedNavigation = navigation.filter((item) => item.roles.includes(user.role));

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="border-end pt-4" 
          style={{
            width: "250px",
            height: "100vh",
            position: "sticky",
            top: 0,
          }}>
          <div className="d-flex align-items-center mb-4 ms-4">
            <ShoppingCart size={24} className="me-2" />
            <span className="fw-bold">CashierPro</span>
          </div>
          <ul className="nav flex-column">
            {allowedNavigation.map((item) => (
              <li key={item.id} className="nav-item">
                <button
                  className="nav-link d-flex align-items-center text-dark w-100"
                  style={{
                    backgroundColor: activeTab === item.id ? "#dadada46" : "transparent",
                    fontWeight: activeTab === item.id ? "bold" : "normal",
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
      <div className="flex-grow-1 d-flex flex-column">
        {/* Header */}
        <header className="border-bottom px-3 py-2 d-flex align-items-center">
          {/* Toggle button */}
          <button
            className="btn btn-light me-3"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
          >
            <Menu size={20} />
          </button>

          <h5 className="m-0">
            {allowedNavigation.find((nav) => nav.id === activeTab)?.label || "Point of Sale"}
          </h5>

          {/* Right side */}
          <div className="ms-auto d-flex align-items-center gap-3">
            <div className="dropdown">
              <button className="btn position-relative" data-bs-toggle="dropdown">
                <Bell size={20} />
                <span className="badge bg-dark position-absolute top-0 start-100 translate-middle p-1">
                  3
                </span>
              </button>
              <div className="dropdown-menu dropdown-menu-end p-2" style={{ width: "300px" }}>
                <h6 className="dropdown-header">Notifications</h6>
                <div className="dropdown-item d-flex gap-2">
                  <AlertTriangle size={16} className="text-danger mt-1" />
                  <div>
                    <strong>Low Stock Alert</strong>
                    <div className="small text-muted">Greek Yogurt is running low</div>
                  </div>
                </div>
                <div className="dropdown-item d-flex gap-2">
                  <Package size={16} className="text-warning mt-1" />
                  <div>
                    <strong>Out of Stock</strong>
                    <div className="small text-muted">Energy Drink is out of stock</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Dropdown */}
            <div className="dropdown">
              <button className="btn d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                  style={{ width: "32px", height: "32px" }}
                >
                  {getUserInitials(user.name)}
                </div>
                <div className="text-start d-none d-sm-block">
                  <div className="small fw-bold">{user.name}</div>
                  <div className="text-muted small">{user.role}</div>
                </div>
              </button>
              <div className="dropdown-menu dropdown-menu-end">
                <div className="dropdown-item-text">
                  <strong>{user.name}</strong>
                  <div className="text-muted small">{user.email}</div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item">
                  <User size={16} className="me-2" />
                  Profile Settings
                </button>
                <button className="dropdown-item" onClick={() => onTabChange("settings")}>
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

        {/* Page Content */}
        <main className="p-4 flex-grow-1">{children}</main>
      </div>
    </div>
  );
}
