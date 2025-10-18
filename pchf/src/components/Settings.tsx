// Settings.tsx
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { AuthService, defaultPasswords } from "../data/authData";


/* ---------- Types (local) ---------- */
interface StoreSettings {
  storeName: string;
  storeAddress: string;
  phone: string;
  email: string;
  taxRate: string;
  currency: string;
  footerMessage: string;
}

interface ReceiptSettings {
  includeLogo: boolean;
  showDiscounts: boolean;
  showTax: boolean;
  showChange: boolean;
  // customMessage: string;
}

interface NotificationSettings {
  lowStock: boolean;
  newSale: boolean;
  dailySummary: boolean;
  sound: boolean;
}

interface SecuritySettings {
  requirePin: boolean;
  autoLogout: boolean;
  sessionTimeout: string;
  dataBackup: boolean;
}

interface SettingsProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void; // add this
}

/* ---------- Inline SVG icons for modal header (simple) ---------- */
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
export const Settings: React.FC<SettingsProps> = ({ onLogout, onTabChange }) => {
  // existing settings state (kept as you provided)
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

  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(() => {
    const saved = localStorage.getItem("receiptSettings");
    return saved
      ? JSON.parse(saved)
      : {
          includeLogo: true,
          showDiscounts: true,
          showTax: true,
          showChange: true,
          // customMessage: "Thank you for shopping with us!",
        };
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem("notificationSettings");
    return saved
      ? JSON.parse(saved)
      : {
          lowStock: true,
          newSale: true,
          dailySummary: false,
          sound: true,
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

  const handleSaveSettings = () => {
    localStorage.setItem("storeSettings", JSON.stringify(storeSettings));
    localStorage.setItem("receiptSettings", JSON.stringify(receiptSettings));
    localStorage.setItem("notificationSettings", JSON.stringify(notificationSettings));
    localStorage.setItem("securitySettings", JSON.stringify(securitySettings));
    toast.success("Settings saved successfully");

    setTimeout(() => {
    onTabChange("dashboard"); // switch to dashboard tab
    }, 1200);
  };

  /* ---------------- Change Password modal state ---------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [cpStep, setCpStep] = useState<"verify" | "code" | "new">("verify");

  // step: verify
  const [cpEmail, setCpEmail] = useState("");
  const [cpOldPassword, setCpOldPassword] = useState("");

  // step: code
  const [cpCodeInput, setCpCodeInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  // step: new password
  const [cpNewPassword, setCpNewPassword] = useState("");
  const [cpConfirmPassword, setCpConfirmPassword] = useState("");

  const [cpMessage, setCpMessage] = useState<string | null>(null);

  useEffect(() => {
    // ensure AuthService users initialized (demo)
    AuthService.initializeUsers();
  }, []);

  // open modal and reset state
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

  // Step 1: verify email + old password
  const handleSendCode = () => {
    setCpMessage(null);

    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      setCpMessage("No current user is logged in.");
      return;
    }

    if (!cpEmail.trim()) {
      setCpMessage("Please enter your email.");
      return;
    }

    if (cpEmail.trim() !== currentUser.email) {
      setCpMessage("Email does not match the current user.");
      return;
    }

    if (!cpOldPassword) {
      setCpMessage("Please enter your current/old password to verify.");
      return;
    }

    // validate old password using AuthService.login
    const valid = AuthService.login(cpEmail.trim(), cpOldPassword);
    if (!valid) {
      setCpMessage("Old password is incorrect.");
      return;
    }

    // generate 6-digit code and move to code step
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    // In a real app you'd send via email; here we show hint for demo
    setCpMessage(`Verification code sent to ${cpEmail} (demo code: ${code})`);
    setCpStep("code");
  };

  // Step 2: verify code
  const handleVerifyCode = () => {
    setCpMessage(null);
    if (!cpCodeInput.trim()) {
      setCpMessage("Please enter the verification code.");
      return;
    }
    if (cpCodeInput.trim() !== generatedCode) {
      setCpMessage("Verification code is incorrect.");
      return;
    }
    setCpStep("new");
    setCpMessage(null);
  };

  // simple password policy check
  const isStrongPassword = (pw: string) => {
    if (pw.length < 8) return false;
    if (!/[A-Z]/.test(pw)) return false;
    if (!/[0-9]/.test(pw)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) return false;
    return true;
  };

  // Step 3: change password
  const handleChangePassword = () => {
    setCpMessage(null);
    if (!cpNewPassword || !cpConfirmPassword) {
      setCpMessage("Please fill both password fields.");
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setCpMessage("Passwords do not match.");
      return;
    }
    if (!isStrongPassword(cpNewPassword)) {
      setCpMessage("Password must be at least 8 characters with an uppercase letter, a number and a symbol.");
      return;
    }

    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      setCpMessage("No current user.");
      return;
    }

    // Update demo password storage: defaultPasswords is exported from authData.ts
    // This mutates the demo password record (acceptable for demo). In real app, call backend.
    (defaultPasswords as Record<string, string>)[currentUser.email] = cpNewPassword;

    // success feedback
    toast.success("Password changed successfully (demo).");
    setCpMessage(null);
    // close modal after short delay
    setTimeout(() => {
      closeChangePasswordModal();
    }, 800);
  };

  /* ---------------- render ---------------- */
  return (
    <div className="container py-2">
      <h2 className="fw-bold mb-4 text-center">System Settings</h2>

      {/* Store info card (kept) */}
      <div className="card mb-4" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
        <div className="card-header bg-0 text-dark fw-bold">Store Information</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Store Name</label>
            <input type="text" className="form-control" value={storeSettings.storeName}
              onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} value={storeSettings.storeAddress}
              onChange={(e) => setStoreSettings({ ...storeSettings, storeAddress: e.target.value })}></textarea>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Phone</label>
              <input type="text" className="form-control" value={storeSettings.phone}
                onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={storeSettings.email}
                onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })} />
            </div>
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Tax Rate (%)</label>
              <input type="number" className="form-control" value={storeSettings.taxRate}
                onChange={(e) => setStoreSettings({ ...storeSettings, taxRate: e.target.value })} />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Currency</label>
              <select className="form-select" value={storeSettings.currency}
                onChange={(e) => setStoreSettings({ ...storeSettings, currency: e.target.value })}>
                <option value="PHP">PHP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Receipt Footer Message</label>
            <textarea className="form-control" rows={2} value={storeSettings.footerMessage}
              onChange={(e) => setStoreSettings({ ...storeSettings, footerMessage: e.target.value })}></textarea>
            <small className="text-muted">This message will appear at the bottom of each printed receipt.</small>
          </div>
        </div>
      </div>

      {/* Receipt Settings (kept) */}
      <div
        className="card mb-4"
        style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}
      >
        <div className="card-header bg-0 text-dark fw-bold">Receipt Settings</div>
        <div className="card-body">
          {(Object.entries(receiptSettings) as [keyof ReceiptSettings, boolean | string][])
            .filter(([key, value]) => typeof value === "boolean") // ✅ show only boolean settings
            .map(([key, value]) => (
              <div key={key} className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) =>
                    setReceiptSettings({
                      ...receiptSettings,
                      [key]: e.target.checked,
                    })
                  }
                />
                <label className="form-check-label text-capitalize">
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
              </div>
            ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card mb-4" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
        <div className="card-header bg-0 text-dark fw-bold">Notification Settings</div>
        <div className="card-body">
          {(Object.entries(notificationSettings) as [keyof NotificationSettings, boolean][]).map(([key, value]) => (
            <div key={key} className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" checked={value as boolean}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })} />
              <label className="form-check-label text-capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="card mb-4" style={{ borderRadius: "12px", boxShadow: "2px 4px 8px rgba(0,0,0,0.15)" }}>
        <div className="card-header bg-0 text-dark fw-bold">Security Settings</div>
        <div className="card-body">
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={securitySettings.requirePin}
              onChange={(e) => setSecuritySettings({ ...securitySettings, requirePin: e.target.checked })} />
            <label className="form-check-label">Require PIN at Login</label>
          </div>
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={securitySettings.autoLogout}
              onChange={(e) => setSecuritySettings({ ...securitySettings, autoLogout: e.target.checked })} />
            <label className="form-check-label">Auto Logout on Inactivity</label>
          </div>
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
          <div className="form-check form-switch mb-2">
            <input className="form-check-input" type="checkbox" checked={securitySettings.dataBackup}
              onChange={(e) => setSecuritySettings({ ...securitySettings, dataBackup: e.target.checked })} />
            <label className="form-check-label">Automatic Data Backup</label>
          </div>

          <hr className="my-4" style={{ borderTop: "2px solid #000" }} />
          <label className="mb-3 text-dark fw-bold">Change your account password</label>
          <div>
            <button className="btn btn-dark" onClick={openChangePasswordModal}>Change password</button>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="text-center">
        <button className="btn btn-dark px-4 py-2 me-2" onClick={handleSaveSettings}>Save Settings</button>
        <button className="btn btn-danger px-4 py-2" onClick={onLogout}>Logout</button>
      </div>

      {/* ---------------- Change Password Modal (controlled) ---------------- */}
      {modalOpen && (
        <>
          {/* backdrop */}
          <div className="modal-backdrop fade show"></div>

          <div className="modal d-block" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content rounded-4 shadow-lg border-0">
                <div className="modal-body p-4 text-center">
                  <div className="mb-3">
                    {/* icon per step */}
                    {cpStep === "verify" && <LockSVG />}
                    {cpStep === "code" && <CodeSVG />}
                    {cpStep === "new" && <KeySVG />}
                  </div>

                  <h4 className="mb-2">
                    {cpStep === "verify" ? "Change password" : cpStep === "code" ? "Verification" : "Set New Password"}
                  </h4>

                  <div className="border-top my-3"></div>

                  {/* Step content */}
                  {cpStep === "verify" && (
                    <>
                      <p className="text-muted small">A verification code will be sent to your email to confirm your identity. Enter your email and current password.</p>

                      <div className="mb-2 text-start">
                        <label className="form-label">Enter Email</label>
                        <input type="email" className="form-control" value={cpEmail} onChange={(e) => setCpEmail(e.target.value)} />
                      </div>

                      <div className="mb-3 text-start">
                        <label className="form-label">Current Password</label>
                        <input type="password" className="form-control" value={cpOldPassword} onChange={(e) => setCpOldPassword(e.target.value)} />
                      </div>
                    </>
                  )}

                  {cpStep === "code" && (
                    <>
                      <p className="text-muted small">We sent a verification code to your email. Enter it below.</p>
                      <div className="mb-3 text-start">
                        <label className="form-label">Enter Code</label>
                        <input type="text" className="form-control" value={cpCodeInput} onChange={(e) => setCpCodeInput(e.target.value)} />
                      </div>
                    </>
                  )}

                  {cpStep === "new" && (
                    <>
                      <p className="text-muted small">Enter your new password. Must be 8+ chars, include a capital letter, number, and symbol.</p>
                      <div className="mb-2 text-start">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-control" value={cpNewPassword} onChange={(e) => setCpNewPassword(e.target.value)} />
                      </div>
                      <div className="mb-3 text-start">
                        <label className="form-label">Confirm Password</label>
                        <input type="password" className="form-control" value={cpConfirmPassword} onChange={(e) => setCpConfirmPassword(e.target.value)} />
                      </div>
                    </>
                  )}

                  {cpMessage && <p className="text-danger small">{cpMessage}</p>}
                </div>

                <div className="modal-footer border-0 justify-content-center pb-4">
                  <div className="w-100 px-4">
                    {cpStep === "verify" && (
                      <>
                        <div className="d-grid gap-2">
                          <button className="btn btn-dark" onClick={handleSendCode}>Send code</button>
                          <button className="btn btn-outline-secondary" onClick={closeChangePasswordModal}>Cancel</button>
                        </div>
                      </>
                    )}

                    {cpStep === "code" && (
                      <div className="d-grid gap-2">
                        <button className="btn btn-dark" onClick={handleVerifyCode}>Confirm</button>
                        <button className="btn btn-outline-secondary" onClick={() => { setCpStep("verify"); setCpMessage(null); }}>Back</button>
                      </div>
                    )}

                    {cpStep === "new" && (
                      <div className="d-grid gap-2">
                        <button className="btn btn-dark" onClick={handleChangePassword}>Change Password</button>
                        <button className="btn btn-outline-secondary" onClick={() => { setCpStep("verify"); setCpMessage(null); }}>Cancel</button>
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

export default Settings;
