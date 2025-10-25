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
import { AuthWrapper } from "./components/auth/AuthWrapper";
import type { Transaction } from "./types";
import type { User } from "./types/auth";
import { mockTransactions } from "./data/mockData";
import apiService from "./services/api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pos");
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiService
      .getCurrentUser()
      .then(({ user }) => {
        setUser(user);
        setActiveTab("dashboard");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    apiService.clearToken();
    setUser(null);
    setActiveTab("pos");
  };

  const handleTransactionComplete = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
  };

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
    if (!user) return null;

    switch (activeTab) {
      case "dashboard":
        return <Dashboard transactions={transactions} CurrentUser={user} />;
      case "pos":
        return <PointOfSale user={user} onTransactionComplete={handleTransactionComplete} />;
      case "inventory":
        return <InventoryManagement user={user} />;
      case "transactions":
        return (
          <TransactionHistory
            transactions={transactions}
            onDeleteAll={() => {}}
          />
        );
      case "settings":
        // ✅ FIX: Pass user prop here
        return (
          <Settings
            onLogout={handleLogout}
            onTabChange={handleTabChange}
            user={user}
          />
        );
      default:
        return <Dashboard transactions={transactions} CurrentUser={user} />;
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
    <Layout activeTab={activeTab} onTabChange={handleTabChange} user={user} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
}
