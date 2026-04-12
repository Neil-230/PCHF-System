import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CardHeader, CardTitle } from "../ui/card";
import { Alert } from "../ui/alert";
import { Select, SelectItem } from "../ui/select";
import { Eye, EyeOff, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "react-bootstrap";
import "../css/auth_modern.css";
import { FcGoogle } from "react-icons/fc";
import apiService from "../../services/api";

interface SignUpProps {
  onSwitchToLogin: () => void;
}

export function SignUpUpdated({ onSwitchToLogin }: SignUpProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "cashier">("cashier");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Modal states
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Verification
  const [enteredCode, setEnteredCode] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async (isResend = false) => {
    if (!firstName || !lastName || !email) {
      toast.error("Please fill out all required fields first.");
      return;
    }

    if (verificationPending && !isResend) {
      toast.info("Verification already sent. Please check your email or resend the code.");
      setShowCodeModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const tempPassword = Math.random().toString(36).slice(-8) + "Aa!";
      await apiService.signup(`${firstName} ${lastName}`, email, tempPassword, role);
      toast.success(isResend ? "Verification code resent." : "Verification code sent to your email!");
      setVerificationPending(true);
      setShowCodeModal(true);
      setResendCooldown(45);
    } catch (err: any) {
      if (err?.status === 429) {
        const retryAfter = err?.body?.retryAfter || 3600;
        setResendCooldown(retryAfter);
        toast.error(`Rate limit exceeded. Please wait ${retryAfter}s.`);
      } else {
        toast.error(err.message || "Failed to send verification code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!enteredCode) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await apiService.verifyEmail(email, enteredCode);
      toast.success("Email verified successfully!");
      setShowCodeModal(false);
      setShowPasswordModal(true);
      setVerificationPending(false);
      setResendCooldown(0);
    } catch (err: any) {
      toast.error(err.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      // After email is verified, set the real password using the same code
      await apiService.resetPassword(email, enteredCode, password);

      toast.success(
        role === "admin"
          ? "Admin account created — pending owner approval!"
          : "Account successfully created!"
      );
      setShowPasswordModal(false);
      resetForm();
      onSwitchToLogin();
    } catch (err: any) {
      toast.error(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');
    const base = api.replace(/\/api\/?$/, '');
    window.location.href = `${base}/api/auth/google`;
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setEnteredCode("");
    setRole("cashier");
    setVerificationPending(false);
    setShowCodeModal(false);
    setShowPasswordModal(false);
    setResendCooldown(0);
  };

  return (
    <div className="auth-modern-container">
      <div className="auth-modern-card animate-fade-in">
        {/* Sidebar */}
        <div className="auth-modern-sidebar">
          <div className="mb-auto">
            <button 
              onClick={onSwitchToLogin}
              className="btn btn-link p-0 text-white text-decoration-none d-flex align-items-center gap-2 opacity-75 hover-opacity-100 transition-all mb-5"
            >
              <ArrowLeft size={16} />
              Back to login
            </button>
          </div>
          
          <div className="mb-auto">
            <h2 className="display-6 fw-bold mb-3">Join our growing ecosystem.</h2>
            <p className="text-secondary opacity-75 fs-5">
              Create an account to start managing your store's operations, inventory, and sales performance.
            </p>
            
            <div className="mt-5 d-flex flex-column gap-3">
              {[
                "Real-time inventory tracking",
                "Advanced sales analytics",
                "Role-based access control"
              ].map((feature, i) => (
                <div key={i} className="d-flex align-items-center gap-3">
                  <div className="bg-white bg-opacity-20 rounded-circle p-1">
                    <Check size={14} />
                  </div>
                  <span className="small">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-auto">
            <p className="text-secondary opacity-50 small mb-0">
              Trusted by 500+ local hardware merchants.
            </p>
          </div>
        </div>

        {/* Form Area */}
        <div className="auth-modern-form-area overflow-auto" style={{ maxHeight: '100vh' }}>
          <div className="mb-4">
            <h1 className="auth-modern-title">Create account</h1>
            <p className="auth-modern-subtitle">Join The PCH Store</p>
          </div>

          <form className="FormSign">
            {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Label htmlFor="firstName" className="auth-modern-label">First Name</Label>
                <Input
                  className="auth-modern-input"
                  id="firstName"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <Label htmlFor="lastName" className="auth-modern-label">Last Name</Label>
                <Input
                  className="auth-modern-input"
                  id="lastName"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-modern-input-group">
              <Label htmlFor="email" className="auth-modern-label">Email</Label>
              <Input
                className="auth-modern-input"
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-modern-input-group">
              <Label htmlFor="role" className="auth-modern-label">Your Role</Label>
              <Select
                className="auth-modern-input"
                value={role}
                onChange={(value) => setRole(value as "admin" | "cashier")}
              >
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="admin">Store Admin</SelectItem>
              </Select>
            </div>

            <button
              type="button"
              className="auth-modern-button-primary mt-4"
              onClick={() => handleSendCode()}
              disabled={isLoading || verificationPending || resendCooldown > 0}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <>
                  {resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Create account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="auth-modern-divider">
              <span>or sign up with</span>
            </div>

            <button
              type="button"
              className="auth-modern-button-google"
              onClick={handleGoogleSignup}
            >
              <FcGoogle size={20} />
              Continue with Google
            </button>

            {verificationPending && (
              <div className="mt-4 p-3 rounded-3 bg-light border text-center animate-fade-in">
                <p className="small text-secondary mb-3">We've sent a code to <strong>{email}</strong></p>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm rounded-pill px-4"
                  onClick={() => setShowCodeModal(true)}
                >
                  Enter Code
                </button>
              </div>
            )}
          </form>

          <p className="auth-modern-footer">
            Already have an account?{" "}
            <button
              type="button"
              className="btn btn-link p-0 auth-modern-link align-baseline fs-6"
              onClick={onSwitchToLogin}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>

      {/* Verification Modal */}
      <Modal show={showCodeModal} onHide={() => setShowCodeModal(false)} centered className="auth-modern-modal">
        <div className="modal-content border-0 shadow-lg rounded-4 p-4">
          <div className="text-center mb-4">
            <div className="bg-light rounded-circle d-inline-flex p-3 mb-3">
              <Check className="text-success" size={24} />
            </div>
            <h5 className="fw-bold">Verify your email</h5>
            <p className="text-secondary small">Enter the 6-digit code we sent to your inbox.</p>
          </div>
          
          <div className="mb-4">
            <Input
              className="auth-modern-input text-center fs-4 tracking-widest fw-bold py-3"
              placeholder="000000"
              maxLength={6}
              value={enteredCode}
              onChange={(e) => setEnteredCode(e.target.value)}
            />
          </div>

          <div className="d-flex flex-column gap-2">
            <button 
              className="auth-modern-button-primary" 
              onClick={handleVerifyCode} 
              disabled={isLoading}
            >
              {isLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Verify Code'}
            </button>
            <button
              className="btn btn-link text-decoration-none text-muted small"
              disabled={isLoading || resendCooldown > 0}
              onClick={() => handleSendCode(true)}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Creation Modal */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <div className="modal-content border-0 shadow-lg rounded-4 p-4">
          <div className="mb-4">
            <h5 className="fw-bold">Set your password</h5>
            <p className="text-secondary small">Choose a strong password to secure your account.</p>
          </div>

          <form onSubmit={handleCreateAccount} className="d-flex flex-column gap-3">
            <div>
              <Label className="small fw-bold mb-2">Password</Label>
              <div className="position-relative">
                <Input
                  className="auth-modern-input pe-5"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <Label className="small fw-bold mb-2">Confirm Password</Label>
              <div className="position-relative">
                <Input
                  className="auth-modern-input pe-5"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-modern-button-primary mt-2" disabled={isLoading}>
              {isLoading ? <span className="spinner-border spinner-border-sm"></span> : "Complete Registration"}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}

