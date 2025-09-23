import { useState } from "react";
import { Settings as SettingsIcon, Store, Receipt, Bell, Shield, LogOut } from "lucide-react";
import { CardContent, CardHeader, Card, CardFooter, CardTitle } from "./ui/card";
import { Label } from "./ui/label";

interface SettingsProps {
  onLogout?: () => void;
}

export function Settings({ onLogout }: SettingsProps) {
  const [storeSettings, setStoreSettings] = useState({
    storeName: "My Store",
    storeAddress: "123 Main St, City, State 12345",
    phone: "+63 912 345 6789",
    email: "store@example.com",
    taxRate: "10",
    currency: "PHP",
  });

  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: true,
    showAddress: true,
    printReceipt: true,
    emailReceipt: false,
    footerMessage: "Thank you for your business!",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    lowStockAlerts: true,
    salesNotifications: true,
    systemUpdates: false,
    emailNotifications: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    requirePassword: true,
    sessionTimeout: "30",
    auditLog: true,
  });

  const handleSaveSettings = () => {
    alert("Settings saved successfully ✅");
  };

  return (
    <div className="container my-4">
      {/* Store Information */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <Store size={20} />
          <strong>Store Information</strong>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Store Name</label>
              <input
                type="text"
                className="form-control"
                value={storeSettings.storeName}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={storeSettings.phone}
                onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Store Address</label>
              <input
                type="text"
                className="form-control"
                value={storeSettings.storeAddress}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={storeSettings.email}
                onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Settings */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <Receipt size={20} />
          <strong>Receipt Settings</strong>
        </div>
        <div className="card-body">
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={receiptSettings.showLogo}
              onChange={(e) => setReceiptSettings({ ...receiptSettings, showLogo: e.target.checked })}
            />
            <label className="form-check-label">Show Logo on Receipt</label>
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={receiptSettings.showAddress}
              onChange={(e) => setReceiptSettings({ ...receiptSettings, showAddress: e.target.checked })}
            />
            <label className="form-check-label">Show Store Address</label>
          </div>
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={receiptSettings.printReceipt}
              onChange={(e) => setReceiptSettings({ ...receiptSettings, printReceipt: e.target.checked })}
            />
            <label className="form-check-label">Auto-Print Receipt</label>
          </div>
          <label className="form-label mt-3">Receipt Footer Message</label>
          <input
            type="text"
            className="form-control"
            value={receiptSettings.footerMessage}
            onChange={(e) => setReceiptSettings({ ...receiptSettings, footerMessage: e.target.value })}
          />
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <Bell size={20} />
          <strong>Notifications</strong>
        </div>
        <div className="card-body">
          {Object.entries(notificationSettings).map(([key, value]) => (
            <div className="form-check form-switch mb-2" key={key}>
              <input
                className="form-check-input"
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })
                }
              />
              <label className="form-check-label text-capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <Shield size={20} />
          <strong>Security & Access</strong>
        </div>
        <div className="card-body row">
          <div className="col-md-6">
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={securitySettings.requirePassword}
                onChange={(e) => setSecuritySettings({ ...securitySettings, requirePassword: e.target.checked })}
              />
              <label className="form-check-label">Require Password</label>
            </div>
            <div className="form-check form-switch ">
              <input
                className="form-check-input"
                type="checkbox"
                checked={securitySettings.auditLog}
                onChange={(e) => setSecuritySettings({ ...securitySettings, auditLog: e.target.checked })}
              />
              <label className="form-check-label">Audit Logging</label>
            </div>
          </div>
          <div className="col-md-6">
            <label className="form-label mt-3">Session Timeout (minutes)</label>
              <select
                className="form-select"
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>
      </div>

      {/* System Information */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <SettingsIcon size={20} />
          <strong>System Information</strong>
        </div>
        <div className="card-body row">
          <div className="col-md-4">
            <label className="form-label">Application Version</label>
            <p className="fw-medium">CashierPro v1.0.0</p>
          </div>
          <div className="col-md-4">
            <label className="form-label">Last Backup</label>
            <p className="fw-medium">Today, 3:00 AM</p>
          </div>
          <div className="col-md-4">
            <label className="form-label me-3">Database Status</label>
            <span className="badge bg-success">Connected</span>
          </div>
        </div>
      </div>

      {/* Account Management */}
      {onLogout && (
        <div className="card mb-4">
          <div className="card-header d-flex align-items-center gap-2">
            <LogOut size={20} />
            <strong>Account Management</strong>
          </div>
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <label className="form-label">Sign Out</label>
              <p className="text-muted small">Sign out of your account and return to the login screen</p>
            </div>
            <button className="btn btn-danger d-flex align-items-center gap-2" onClick={onLogout}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}


      <div className="d-flex justify-content-end">
        <button className="btn btn-dark btn-lg p-2" onClick={handleSaveSettings}>
          Save All Settings
        </button>
      </div>
        
    </div>
  );
}
