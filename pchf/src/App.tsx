
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Layout } from "./components/Layout";
import Dashboard from "./components/Dashboard";
import InventoryManagement from "./components/InventoryManagement";
import TransactionHistory from "./components/TransactionHistory";
import Settings from "./components/Settings";
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
    AuthService.initializeUsers();

    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setActiveTab(currentUser.role === "admin" ? "dashboard" : "pos");
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveTab(authenticatedUser.role === "admin" ? "dashboard" : "pos");

  };

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
    setActiveTab("pos");
  };

  const handleTransactionComplete = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
  };

  const handleTabChange = (tab: string) => {
    if (!user) return;

    const allowedTabs = {
      admin: ["dashboard", "pos", "inventory", "transactions", "alerts", "settings"],
      cashier: ["pos", "transactions", "settings"],
    };

    if (allowedTabs[user.role].includes(tab)) {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "pos":
        return <PointOfSale onTransactionComplete={handleTransactionComplete} />;
      case "inventory":
        return <InventoryManagement />;
      case "transactions":
        return <TransactionHistory />;
      case "alerts":
        return <div>Inventory Alerts</div>; // Replace with <InventoryAlerts /> if available
      case "settings":
        return <Settings  />;
      default:
        return <Dashboard  />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthWrapper onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>
      <Toaster />
    </>
  );
}
