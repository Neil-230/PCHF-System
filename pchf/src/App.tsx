import "./App.css";
import { useState, useEffect, useRef, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { InventoryManagement } from "./components/InventoryManagement";
import { TransactionHistory } from "./components/TransactionHistory";
import { Settings } from "./components/Settings";
import type { SecuritySettings } from "./components/Settings";
import { PointOfSale } from "./components/PointOfSales";
import { AuthWrapper } from "./components/auth/AuthWrapper";
import type { Transaction } from "./types";
import type { User } from "./types/auth";
import { mockTransactions } from "./data/mockData";
import apiService from "./services/api";
import { useLocation, useNavigate } from "react-router-dom";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pos");
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const defaultSecurity: SecuritySettings = {
    requirePin: true,
    autoLogout: true,
    sessionTimeout: "15",
    dataBackup: false,
  };
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    try {
      const saved = localStorage.getItem("securitySettings");
      if (saved) {
        return { ...defaultSecurity, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultSecurity;
  });
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Initialize activeTab from URL on first render
  useEffect(() => {
    const path = location.pathname.replace("/", ""); // "dashboard" | "pos" | ...
    if (path && path !== "login" && path !== "auth/google-callback" && path !== "auth/facebook-callback") {
      setActiveTab(path);
    }
  }, [location.pathname]);

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
        const defaultTab = user.role === 'cashier' ? 'pos' : 'dashboard';
        setActiveTab(defaultTab);
        navigate(`/${defaultTab}`, { replace: true }); // make URL match default tab
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loadTransactions = async () => {
    try {
      const { transactions } = await apiService.getTransactions({ limit: 200 });
      const mapped: Transaction[] = transactions.map((t: any) => ({
        id: t.id,
        items: (t.items || []).map((i: any) => ({
          product: { id: i.productId, name: i.name, price: i.price, category: "", stock: 0, sku: i.sku },
          quantity: i.quantity,
        })),
        subtotal: t.subtotal,
        tax: t.tax,
        total: t.total,
        customerName: t.customerName,
        paymentMethod: t.paymentMethod,
        status: t.status || 'completed',
        timestamp: new Date(t.timestamp),
        handledBy: t.handledBy,
        isDelivery: !!t.isDelivery,
        deliveryFee: t.deliveryFee,
      }));
      setTransactions(mapped);
    } catch {}
  };

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    const defaultTab = authenticatedUser.role === 'cashier' ? 'pos' : 'dashboard';
    setActiveTab(defaultTab);
    navigate(`/${defaultTab}`, { replace: true });
  };

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      window.clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };

  const clearCountdownInterval = () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleLogout = useCallback(async () => {
    clearInactivityTimeout();
    clearCountdownInterval();
    setInactivityWarning(false);
    try {
      await apiService.logout();
    } catch {}
    apiService.clearToken();
    setUser(null);
    setActiveTab("pos");
    navigate("/pos", { replace: true });
  }, [navigate]);

  const triggerInactivityPrompt = useCallback(() => {
    if (!user) return;
    setCountdown(10);
    setInactivityWarning(true);
  }, [user]);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimeout();
    if (!user || !securitySettings.autoLogout) return;
    const configured = Number(securitySettings.sessionTimeout);
    const minutes = Math.max(1, Number.isFinite(configured) ? configured : 15);
    inactivityTimeoutRef.current = window.setTimeout(
      triggerInactivityPrompt,
      minutes * 60 * 1000
    );
  }, [securitySettings, triggerInactivityPrompt, user]);

  const handleUserActivity = useCallback(() => {
    if (!user || !securitySettings.autoLogout) return;
    if (inactivityWarning) {
      return; // require explicit button choice while modal is open
    }
    resetInactivityTimer();
  }, [inactivityWarning, resetInactivityTimer, securitySettings.autoLogout, user]);

  useEffect(() => {
    if (!user || !securitySettings.autoLogout) {
      clearInactivityTimeout();
      setInactivityWarning(false);
      return;
    }
    resetInactivityTimer();
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInactivityTimeout();
    };
  }, [handleUserActivity, resetInactivityTimer, securitySettings.autoLogout, user]);

  const handleSecuritySettingsChange = useCallback((settings: SecuritySettings) => {
    setSecuritySettings(settings);
  }, []);

  const handleStayActive = useCallback(() => {
    setInactivityWarning(false);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  const handleTimeoutLogout = useCallback(async () => {
    try {
      await apiService.recordTimeoutLogout();
    } catch {}
    await handleLogout();
  }, [handleLogout]);

  useEffect(() => {
    if (!inactivityWarning) {
      clearCountdownInterval();
      setCountdown(10);
      return;
    }
    clearCountdownInterval();
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdownInterval();
          setInactivityWarning(false);
          handleTimeoutLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearCountdownInterval();
  }, [handleTimeoutLogout, inactivityWarning]);

  const handleTransactionComplete = (transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
    loadTransactions();
  };

  const handleTabChange = (tab: string) => {
    if (!user) return;
    const allowedTabs: Record<string, string[]> = {
      admin: ["dashboard", "pos", "inventory", "transactions", "alerts", "settings"],
      cashier: ["pos", "transactions", "settings"],
      owner: ["dashboard", "pos", "inventory", "transactions", "alerts", "settings"],
    };
    const tabs = allowedTabs[user.role] || [];
    const nextTab = tabs.includes(tab) ? tab : tabs[0] || 'pos';
    setActiveTab(nextTab);
    navigate(`/${nextTab}`); // update URL
    if (nextTab === 'transactions') loadTransactions();
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
            onDeleteAll={async () => {
              try { await apiService.deleteTransactions(); } catch {}
              await loadTransactions();
            }}
            canDeleteAll={user.role === 'admin' || user.role === 'owner'}
          />
        );
      case "settings":
        return (
          <Settings
            onLogout={handleLogout}
            onTabChange={handleTabChange}
            user={user}
            onSecuritySettingsChange={handleSecuritySettingsChange}
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

  if (!user) return <AuthWrapper onAuthSuccess={handleAuthSuccess} />;

  const effectiveSessionMinutes = Math.max(1, Number(securitySettings.sessionTimeout) || 15);

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
        autoLogoutEnabled={securitySettings.autoLogout}
        sessionTimeoutMinutes={effectiveSessionMinutes}
      >
        {renderContent()}
      </Layout>
      {inactivityWarning && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal d-block" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 shadow-lg border-0">
                <div className="modal-body text-center p-4">
                  <h4 className="mb-2">Are you still active?</h4>
                  <p className="text-muted mb-4">
                    You will be logged out in <strong>{countdown}</strong> seconds due to inactivity.
                  </p>
                  <div className="d-flex gap-2 justify-content-center">
                    <button className="btn btn-primary" onClick={handleStayActive}>
                      Stay Logged In
                    </button>
                    <button className="btn btn-outline-danger" onClick={handleLogout}>
                      Logout Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
