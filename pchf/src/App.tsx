import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Layout } from "./components/Layout";
import Dashboard from "./components/Dashboard";
import InventoryManagement from "./components/InventoryManagement";
import TransactionHistory from "./components/TransactionHistory";
import Settings from "./components/Settings";
import PointOfSale from "./components/PointOfSales";
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "./components/ui/sidebar";
import type { User } from './types/auth';

// Dummy data and mock 
const mockTransactions: any[] = [];
const AuthService = {
  initializeUsers: () => {
    if (!localStorage.getItem("users")) {
      const defaultUsers = [
        { name: "Admin User", email: "admin@example.com", role: "admin" },
        { name: "Cashier User", email: "cashier@example.com", role: "cashier" },
      ];
      localStorage.setItem("users", JSON.stringify(defaultUsers));
    }
  },
  getCurrentUser: () => {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  },
  login: (user: any) => {
    localStorage.setItem("currentUser", JSON.stringify(user));
  },
  logout: () => {
    localStorage.removeItem("currentUser");
  },
};

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pos"); // default
  const [transactions, setTransactions] = useState<any[]>(mockTransactions);

  useEffect(() => {
    AuthService.initializeUsers();

    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setActiveTab(currentUser.role === "admin" ? "dashboard" : "pos");
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    setActiveTab(authenticatedUser.role === "admin" ? "dashboard" : "pos");
    AuthService.login(authenticatedUser);
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setActiveTab("pos");
  };

  const handleTransactionComplete = (transaction: any) => {
    setTransactions((prev) => [...prev, transaction]);
  };

  const handleTabChange = (tab: string) => {
    if (!user) return;

    const allowedTabs: Record<string, string[]> = {
      admin: ["dashboard", "pos", "inventory", "transactions", "alerts", "settings"],
      cashier: ["pos", "transactions", "settings"],
    };

    if (allowedTabs[user.role]?.includes(tab)) {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard  />;
      case "pos":
        return <PointOfSale  />;
      case "inventory":
        return <InventoryManagement />;
      case "transactions":
        return <TransactionHistory  />;
      case "settings":
        return <Settings  />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex min-vh-100 justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Instead of AuthWrapper, show a simple login picker
    return (
      <div className="d-flex min-vh-100 justify-content-center align-items-center">
        <div className="card p-4">
          <h5 className="mb-3">Select User</h5>
          <button
            className="btn btn-primary mb-2"
            onClick={() =>
              handleAuthSuccess({ name: "Admin User", email: "admin@example.com", role: "admin" })
            }
          >
            Login as Admin
          </button>
          <button
            className="btn btn-secondary"
            onClick={() =>
              handleAuthSuccess({
                name: "Cashier User",
                email: "cashier@example.com",
                role: "cashier",
              })
            }
          >
            Login as Cashier
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange} user={user} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
}
