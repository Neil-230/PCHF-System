// Settings.tsx
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { AuthService, defaultPasswords } from "../data/authData";
import apiService from "../services/api";

/* ---------- Types ---------- */
interface StoreSettings {
  storeName: string;
  storeAddress: string;
  phone: string;
  email: string;
  taxRate: string;
  currency: string;
  footerMessage: string;
}

//For future updatess. pero pwedi nani i delete
// interface ReceiptSettings {
//   includeLogo: boolean;
//   showDiscounts: boolean;
//   showTax: boolean;
//   showChange: boolean;
// }

//kani pwedi nani i delete wamani pulos
// interface NotificationSettings {
//   lowStock: boolean;
//   newSale: boolean;
//   dailySummary: boolean;
//   sound: boolean;
// }

interface SecuritySettings {
  requirePin: boolean;
  autoLogout: boolean;
  sessionTimeout: string;
  dataBackup: boolean;
}

interface SettingsProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  user?: {
    name: string;
    email: string;
    role: "owner" | "admin" | "cashier";
  };
}

/* ---------- Inline SVGs ---------- */
const LockSVG = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="10" width="18" height="11" rx="2" stroke="#111" strokeWidth="1.5" fill="#f5f5f5"/>
    <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const CodeSVG = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M8 17l-4-5 4-5" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17l4-5-4-5" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 19V5" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const KeySVG = () => (
  <svg width="96" height="96" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="8" cy="8" r="3" stroke="#111" strokeWidth="1.5" fill="#f5f5f5"/>
    <path d="M11 11h6l-1 1v1l-1 1h-1" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ---------- Component ---------- */
export const Settings: React.FC<SettingsProps> = ({ onLogout, onTabChange, user }) => {
  const currentRole = user?.role ?? "unknown";
  const isCashier = currentRole === "cashier";
  const canAccessStoreSettings = currentRole === "admin" || currentRole === "owner";
  /* ---------- States ---------- */
  const [signupsOpen, setSignupsOpen] = useState<boolean | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem("storeSettings");
    return saved
      ? JSON.parse(saved)
      : {
          storeName: "My Store",
          storeAddress: "123 Main St, City, State 12345",
          phone: "+63 912 345 6789",
          email: "store@example.com",
          taxRate: "10",
          currency: "PHP",
          footerMessage: "Thank you for your purchase! Please come again.",
        };
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => {
    const saved = localStorage.getItem("securitySettings");
    return saved
      ? JSON.parse(saved)
      : {
          requirePin: true,
          autoLogout: true,
          sessionTimeout: "15",
          dataBackup: false,
        };
  });

  const [deletion, setDeletion] = useState<{ scheduledFor: string | null; daysRemaining: number | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [loadingDeletion, setLoadingDeletion] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean; backupEnabled: boolean; backupLastRun: string | null; backupLastError: string; driveFolderId: string | null }>({ connected: false, backupEnabled: false, backupLastRun: null, backupLastError: '', driveFolderId: null });
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [notifyLowStock, setNotifyLowStock] = useState(false);
  const [notifyOutOfStock, setNotifyOutOfStock] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('10');
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'sms' | 'both'>('email');

  useEffect(() => {
    apiService.getDeletionStatus().then(setDeletion).catch(() => setDeletion(null));
  }, []);

  useEffect(() => {
    apiService.getSystemSettings()
      .then((s) => {
        if (currentRole === "owner") setSignupsOpen(!!s.signupsOpen);
        setStoreSettings((prev) => ({
          ...prev,
          storeName: s.storeName || prev.storeName,
          storeAddress: s.storeAddress || prev.storeAddress,
          phone: s.phone || prev.phone,
          email: s.email || prev.email,
          taxRate: String(s.taxRate ?? prev.taxRate),
          currency: s.currency || prev.currency,
          footerMessage: s.footerMessage || prev.footerMessage,
        }));
        setNotifyLowStock(!!s.notifyLowStock);
        setNotifyOutOfStock(!!s.notifyOutOfStock);
        setLowStockThreshold(String(s.lowStockThreshold ?? '10'));
        setNotificationMethod((s.notificationMethod as any) || 'email');
      })
      .catch(() => {
        if (currentRole === "owner") setSignupsOpen(false);
      });
  }, [currentRole]);

  // Initialize Drive status and handle OAuth callback indicator
  useEffect(() => {
    if (canAccessStoreSettings) {
      const refresh = async () => {
        try {
          const s = await apiService.getDriveStatus();
          setDriveStatus(s);
          setSecuritySettings((prev) => ({ ...prev, dataBackup: !!s.backupEnabled }));
        } catch {}
      };
      refresh();
    }
    const params = new URLSearchParams(window.location.search);
    const st = params.get('drive');
    if (st === 'connected') {
      toast.success('Google Drive connected');
      params.delete('drive');
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
      // refresh status
      (async () => {
        try { const s = await apiService.getDriveStatus(); setDriveStatus(s); } catch {}
      })();
    } else if (st === 'error') {
      toast.error('Google Drive connection failed');
      params.delete('drive');
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [canAccessStoreSettings]);

  const handleConnectDrive = async () => {
    try {
      const { url } = await apiService.getDriveAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || 'Failed to initiate Google Drive connection');
    }
  };

  const handleEnsureFolder = async () => {
    setLoadingDrive(true);
    try {
      const { driveFolderId } = await apiService.ensureDriveFolder('PCH_Backups');
      setDriveStatus((prev) => ({ ...prev, driveFolderId }));
      toast.success('Backup folder is ready');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to ensure folder');
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleRunBackup = async () => {
    setLoadingDrive(true);
    try {
      await apiService.runDriveBackup();
      setDriveStatus((prev) => ({ ...prev, backupLastRun: new Date().toISOString(), backupLastError: '' }));
      toast.success('Backup created');
    } catch (e: any) {
      const msg = e?.message || 'Backup failed';
      setDriveStatus((prev) => ({ ...prev, backupLastError: msg }));
      toast.error(msg);
    } finally {
      setLoadingDrive(false);
    }
  };

  /* ---------- Save Settings ---------- */
  const handleSaveSettings = async () => {
    if (isCashier) {
      localStorage.setItem("securitySettings", JSON.stringify(securitySettings));
      toast.info("Only Security Settings were updated (Cashier mode).");
      setTimeout(() => onTabChange("dashboard"), 800);
      return;
    }

    try {
      const payload = {
        storeName: storeSettings.storeName,
        storeAddress: storeSettings.storeAddress,
        phone: storeSettings.phone,
        email: storeSettings.email,
        taxRate: Number(storeSettings.taxRate),
        currency: storeSettings.currency,
        footerMessage: storeSettings.footerMessage,
      };
      await apiService.updateStoreSettings(payload);
      await apiService.updateNotificationSettings({
        notifyLowStock,
        notifyOutOfStock,
        lowStockThreshold: Number(lowStockThreshold),
        notificationMethod,
      });
      localStorage.setItem("storeSettings", JSON.stringify(storeSettings));
      localStorage.setItem("securitySettings", JSON.stringify(securitySettings));
      toast.success("Settings saved successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings");
      // still persist locally for POS fallback
      localStorage.setItem("storeSettings", JSON.stringify(storeSettings));
      localStorage.setItem("securitySettings", JSON.stringify(securitySettings));
    }

    setTimeout(() => onTabChange("dashboard"), 800);
  };

  /* ---------- Modal State ---------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [cpStep, setCpStep] = useState<"verify" | "code" | "new">("verify");
  const [cpEmail, setCpEmail] = useState("");
  const [cpOldPassword, setCpOldPassword] = useState("");
  const [cpCodeInput, setCpCodeInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");
  const [cpMessage, setCpMessage] = useState<string | null>(null);

  useEffect(() => {
    AuthService.initializeUsers();
  }, []);

  const openChangePasswordModal = () => {
    setModalOpen(true);
    setCpStep("verify");
    setCpEmail("");
    setCpOldPassword("");
    setCpCodeInput("");
    setGeneratedCode("");
    setCpNewPassword("");
    setCpConfirmPassword("");
    setCpMessage(null);
  };

  const closeChangePasswordModal = () => {
    setModalOpen(false);
    setCpMessage(null);
  };

  /* ---------- Password Handling ---------- */
  //kamo na bahala modify sa combination sa password
  const handleSendCode = () => {
    setCpMessage(null);
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      setCpMessage("No current user is logged in.");
      return;
    }
    if (!cpEmail.trim() || cpEmail.trim() !== currentUser.email) {
      setCpMessage("Invalid email.");
      return;
    }
    if (!cpOldPassword || !AuthService.login(cpEmail.trim(), cpOldPassword)) {
      setCpMessage("Incorrect password.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCpMessage(`Verification code sent to ${cpEmail} (demo code: ${code})`);
    setCpStep("code");
  };


  const handleVerifyCode = () => {
    if (cpCodeInput.trim() !== generatedCode) {
      setCpMessage("Verification code is incorrect.");
      return;
    }
    setCpStep("new");
  };

  const handleChangePassword = () => {
    if (cpNewPassword !== cpConfirmPassword) {
      setCpMessage("Passwords do not match.");
      return;
    }
    if (cpNewPassword.length < 8) {
      setCpMessage("Password too short.");
      return;
    }
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      (defaultPasswords as Record<string, string>)[currentUser.email] = cpNewPassword;
      toast.success("Password changed successfully (demo).");
      setTimeout(() => closeChangePasswordModal(), 800);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="container py-2">
      <h2 className="fw-bold mb-4 text-center">System Settings</h2>

      {/* ---------- Store Settings ---------- */}
      <div className="position-relative mb-4">
        <div className="card" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
          <div className="card-header bg-0 text-dark fw-bold">Store Information</div>
          <div className="card-body">
            {/* store info form para nis receipt */}
            {/* store langnis DATAbase para dimag cge kawala */}
            <div className="mb-3">
              <label className="form-label">Store Name</label>
              <input
                type="text"
                className="form-control"
                value={storeSettings.storeName}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                disabled={!canAccessStoreSettings}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                rows={2}
                value={storeSettings.storeAddress}
                onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}
                disabled={!canAccessStoreSettings}
              ></textarea>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={storeSettings.phone}
                  onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                  disabled={!canAccessStoreSettings}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={storeSettings.email}
                  onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                  disabled={!canAccessStoreSettings}
                />
              </div>
            </div>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={storeSettings.taxRate}
                  onChange={(e) => setStoreSettings({ ...storeSettings, taxRate: e.target.value })}
                  disabled={!canAccessStoreSettings}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={storeSettings.currency}
                  onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}
                  disabled={!canAccessStoreSettings}
                >
                  <option value="PHP">PHP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Receipt Footer Message</label>
              <textarea
                className="form-control"
                rows={2}
                value={storeSettings.footerMessage}
                onChange={(e) => setStoreSettings({ ...storeSettings, footerMessage: e.target.value })}
                disabled={!canAccessStoreSettings}
              ></textarea>
              <small className="text-muted">
                This message will appear at the bottom of each printed receipt.
              </small>
            </div>
          </div>
        </div>

        {/* Block overlay for Cashier */}
        {isCashier && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.7)",
              borderRadius: "12px",
              backdropFilter: "blur(3px)",
            }}
          >
            <div className="text-center text-dark fw-bold">
              <i className="bi bi-lock-fill fs-3 d-block mb-2"></i>
              Store Settings Locked for Cashiers
            </div>
          </div>
        )}
      </div>

      {/* ---------- Security Settings ---------- */}
      <div className="card mb-4" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
        <div className="card-header bg-0 text-dark fw-bold">Security Settings</div>
        <div className="card-body">
          {currentRole === "owner" && (
            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                checked={!!signupsOpen}
                onChange={async (e) => {
                  const next = e.target.checked;
                  try {
                    const res = await apiService.setSignupsOpen(next);
                    setSignupsOpen(res.signupsOpen);
                    toast.success(res.signupsOpen ? "Sign-ups opened" : "Sign-ups closed");
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to update setting");
                  }
                }}
                disabled={signupsOpen === null}
              />
              <label className="form-check-label">Allow new sign-ups</label>
            </div>
          )}
          {/* <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={securitySettings.requirePin}
              onChange={(e) => setSecuritySettings({ ...securitySettings, requirePin: e.target.checked })} />
            <label className="form-check-label">Require PIN at Login</label>
          </div> */}
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={securitySettings.autoLogout}
              onChange={(e) => setSecuritySettings({ ...securitySettings, autoLogout: e.target.checked })} />
            <label className="form-check-label">Auto Logout on Inactivity</label>
          </div>

          {/* kani bay pwedi ni ninyo i implement na mag logout ang account depending on time */}
          <div className="mb-3">
            <label className="form-label">Session Timeout (minutes)</label>
            <select className="form-select" value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="30">30</option>
            </select>
          </div>
          {/* you can delete the logout mechanism kong feel ninyo dina needed */}


          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={securitySettings.dataBackup}
              onChange={async (e) => {
                const enabled = e.target.checked;
                setSecuritySettings({ ...securitySettings, dataBackup: enabled });
                if (!canAccessStoreSettings) return;
                try {
                  const res = await apiService.setBackupEnabled(enabled);
                  setDriveStatus((prev) => ({ ...prev, backupEnabled: res.backupEnabled }));
                  toast.success(res.backupEnabled ? 'Automatic backup enabled' : 'Automatic backup disabled');
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to update backup setting');
                }
              }}
              disabled={!canAccessStoreSettings || !driveStatus.connected}
            />
            <label className="form-check-label">Automatic Data Backup</label>
          </div>

          {canAccessStoreSettings && (
            <div className="mb-2">
              <label className="fw-bold d-block mb-1">Cloud Backup (Google Drive)</label>
              <div className="small text-muted mb-2">
                Status: {driveStatus.connected ? 'Connected' : 'Not connected'}
                {driveStatus.backupLastRun ? ` • Last run: ${new Date(driveStatus.backupLastRun).toLocaleString()}` : ''}
              </div>
              {!driveStatus.connected ? (
                <button className="btn btn-outline-dark btn-sm" onClick={handleConnectDrive} disabled={loadingDrive}>Connect Google Drive</button>
              ) : (
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  <button className="btn btn-outline-secondary btn-sm" onClick={handleEnsureFolder} disabled={loadingDrive}>Ensure Backup Folder</button>
                  <button className="btn btn-dark btn-sm" onClick={handleRunBackup} disabled={loadingDrive}>Run Backup Now</button>
                  {driveStatus.driveFolderId && (
                    <a className="btn btn-link btn-sm p-0" href={`https://drive.google.com/drive/folders/${driveStatus.driveFolderId}`} target="_blank" rel="noreferrer">Open Folder</a>
                  )}
                </div>
              )}
              {driveStatus.backupLastError && <div className="text-danger small mt-2">{driveStatus.backupLastError}</div>}
            </div>
          )}

          <hr className="my-4" />
          <label className="fw-bold mb-3">Change your account password</label>
          <div>
            <button className="btn btn-dark" onClick={openChangePasswordModal}>Change password</button>
          </div>
        </div>
      </div>

      <div className="card mb-4" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
        <div className="card-header bg-0 text-dark fw-bold">Inventory Alerts</div>
        <div className="card-body">
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={notifyLowStock}
              onChange={(e) => setNotifyLowStock(e.target.checked)} disabled={!canAccessStoreSettings} />
            <label className="form-check-label">Notify on low stock</label>
          </div>
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" checked={notifyOutOfStock}
              onChange={(e) => setNotifyOutOfStock(e.target.checked)} disabled={!canAccessStoreSettings} />
            <label className="form-check-label">Notify when out of stock</label>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Low stock threshold</label>
              <input type="number" min={0} className="form-control" value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)} disabled={!canAccessStoreSettings} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Notification method</label>
              <select className="form-select" value={notificationMethod}
                onChange={(e) => setNotificationMethod(e.target.value as any)} disabled={!canAccessStoreSettings}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
        <div className="card-header bg-0 text-dark fw-bold">Account Deletion</div>
        <div className="card-body">
          {deletion && deletion.scheduledFor ? (
            <div className="d-flex flex-column gap-2">
              <div>
                <strong>Scheduled for:</strong> {new Date(deletion.scheduledFor).toLocaleString()}
              </div>
              <div>
                <strong>Days remaining:</strong> {deletion.daysRemaining}
              </div>
              <button
                className="btn btn-outline-secondary"
                disabled={loadingDeletion}
                onClick={async () => {
                  setLoadingDeletion(true);
                  try {
                    const res = await apiService.cancelDeletion();
                    setDeletion(res);
                    toast.success("Deletion canceled");
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to cancel");
                  } finally {
                    setLoadingDeletion(false);
                  }
                }}
              >
                Cancel Deletion
              </button>
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              <small className="text-muted">Type DELETE to confirm scheduling account deletion in 30 days.</small>
              <input
                type="text"
                className="form-control"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                placeholder="Type DELETE"
              />
              <button
                className="btn btn-danger"
                disabled={loadingDeletion || confirmDelete !== "DELETE"}
                onClick={async () => {
                  setLoadingDeletion(true);
                  try {
                    const res = await apiService.requestDeletion();
                    setDeletion(res);
                    toast.success("Deletion scheduled in 30 days");
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to schedule");
                  } finally {
                    setLoadingDeletion(false);
                  }
                }}
              >
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Buttons ---------- */}
      <div className="text-center mb-4">
        <button className="btn btn-dark px-4 py-2 me-2" onClick={handleSaveSettings}>
          Save Settings
        </button>
        <button className="btn btn-danger px-4 py-2" onClick={onLogout}>
          Logout
        </button>
      </div>

      {/* ---------- Modal hasola sa modal uy, pwedi mani himoun og object pero ngano mag bout mankag ako ning i individual ---------- */}
      {modalOpen && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal d-block" role="dialog" aria-modal="true"
            style={{ backgroundColor: "rgba(239, 252, 255, 0.31)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 shadow-lg border-0">
                <div className="modal-body p-4 text-center">
                  <div className="mb-3">
                    {cpStep === "verify" && <LockSVG />}
                    {cpStep === "code" && <CodeSVG />}
                    {cpStep === "new" && <KeySVG />}
                  </div>
                  <h4 className="mb-2">
                    {cpStep === "verify" ? "Change Password" : cpStep === "code" ? "Verification" : "Set New Password"}
                  </h4>
                  <div className="border-top my-3"></div>

                  {cpStep === "verify" && (
                    <>
                      <p className="text-muted small">
                        Enter your email and old password to receive a verification code.
                      </p>
                      <div className="mb-2 text-start">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-control" value={cpEmail}
                          onChange={(e) => setCpEmail(e.target.value)} />
                      </div>
                      <div className="mb-3 text-start">
                        <label className="form-label">Current Password</label>
                        <input type="password" className="form-control" value={cpOldPassword}
                          onChange={(e) => setCpOldPassword(e.target.value)} />
                      </div>
                    </>
                  )}

                  {cpStep === "code" && (
                    <>
                      <p className="text-muted small">
                        Enter the verification code sent to your email.
                      </p>
                      <div className="mb-3 text-start">
                        <label className="form-label">Code</label>
                        <input type="text" className="form-control" value={cpCodeInput}
                          onChange={(e) => setCpCodeInput(e.target.value)} />
                      </div>
                    </>
                  )}

                  {cpStep === "new" && (
                    <>
                      <p className="text-muted small">
                        Enter your new password (8+ chars, one uppercase, one number, one symbol).
                      </p>
                      <div className="mb-2 text-start">
                        <label className="form-label">New Password</label>
                        <input type="password" className="form-control" value={cpNewPassword}
                          onChange={(e) => setCpNewPassword(e.target.value)} />
                      </div>
                      <div className="mb-3 text-start">
                        <label className="form-label">Confirm Password</label>
                        <input type="password" className="form-control" value={cpConfirmPassword}
                          onChange={(e) => setCpConfirmPassword(e.target.value)} />
                      </div>
                    </>
                  )}

                  {cpMessage && <p className="text-danger small">{cpMessage}</p>}
                </div>

                <div className="modal-footer border-0 justify-content-center pb-4">
                  <div className="w-100 px-4">
                    {cpStep === "verify" && (
                      <div className="d-grid gap-2">
                        <button className="btn btn-dark" onClick={handleSendCode}>Send code</button>
                        <button className="btn btn-outline-secondary" onClick={closeChangePasswordModal}>Cancel</button>
                      </div>
                    )}
                    {cpStep === "code" && (
                      <div className="d-grid gap-2">
                        <button className="btn btn-dark" onClick={handleVerifyCode}>Confirm</button>
                        <button className="btn btn-outline-secondary" onClick={() => setCpStep("verify")}>Back</button>
                      </div>
                    )}
                    {cpStep === "new" && (
                      <div className="d-grid gap-2">
                        <button className="btn btn-dark" onClick={handleChangePassword}>Change Password</button>
                        <button className="btn btn-outline-secondary" onClick={() => setCpStep("verify")}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


//export bushit
export default Settings;
