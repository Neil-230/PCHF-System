import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { InventoryManagement } from "./components/InventoryManagement";
import { TransactionHistory } from "./components/TransactionHistory";
import { Settings } from "./components/Settings";
import { PointOfSale } from "./components/PointOfSales";
import { Toaster } from "sonner";
import { AuthService } from "./data/authData";
import { AuthWrapper } from "./components/auth/AuthWrapper";
import type { Transaction } from "./types";
import type { User } from "./types/auth";
import { mockTransactions } from "./data/mockData";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pos");
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);

  useEffect(() => {
    // Initialize default users in localStorage
    AuthService.initializeUsers();

    // Restore login session if available
    const CurrentUser = AuthService.getCurrentUser();
    if (CurrentUser) {
      setUser(CurrentUser);

      // Default landing tab depending on role
      if (["admin", "owner"].includes(CurrentUser.role)) {
        setActiveTab("dashboard");
      } else {
        setActiveTab("pos");
      }
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);

    // Set initial tab after successful login
    if (["admin", "owner"].includes(authenticatedUser.role)) {
      setActiveTab("dashboard");
    } else {
      setActiveTab("pos");
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setActiveTab("pos");
  };

  const handleTransactionComplete = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
  };

  // Role-based access control for sidebar tabs
  const handleTabChange = (tab: string) => {
    if (!user) return;

    const allowedTabs: Record<string, string[]> = {
      admin: ["dashboard", "pos", "inventory", "transactions", "alerts", "settings"],
      cashier: ["pos", "transactions", "settings"],
      owner: ["dashboard", "pos", "inventory", "transactions", "alerts", "settings"],
    };

    if (allowedTabs[user.role]?.includes(tab)) {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard transactions={transactions} CurrentUser={user!} />;
      case "pos":
        return <PointOfSale user={user!} onTransactionComplete={handleTransactionComplete} />;
      case "inventory":
        return <InventoryManagement />;
      case "transactions":
        return (
          <TransactionHistory
            transactions={transactions}
            onDeleteAll={function (): void {
              throw new Error("Function not implemented.");
            }}
          />
        );
      case "settings":
        return <Settings onLogout={handleLogout} onTabChange={handleTabChange} />;
      default:
        return <Dashboard transactions={transactions} CurrentUser={user!} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mx-auto" role="status"></div>
          <p className="mt-2 text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthWrapper onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={handleTabChange} user={user} onLogout={handleLogout}>
        {renderContent()}
      </Layout>
    </>
  );
}
