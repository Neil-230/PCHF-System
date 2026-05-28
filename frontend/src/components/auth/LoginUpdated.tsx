import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { Eye, EyeOff, ArrowRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import "../css/auth_modern.css";
import { FcGoogle } from "react-icons/fc";
import apiService from "../../services/api";
import { executeRecaptcha } from "../../services/recaptcha";

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToSignUp: () => void;
}

declare global {
  interface Window {
    bootstrap: any;
  }
}

export function LoginUpdated({ onLogin, onSwitchToSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [resetError, setResetError] = useState('');
  const [resetIsLoading, setResetIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [initialCountdown, setInitialCountdown] = useState(0);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Require reCAPTCHA for manual login
      const recaptchaToken = await executeRecaptcha('login');
      const response = await apiService.login(email, password, recaptchaToken);

      if (response.token) {
        apiService.setToken(response.token);
        toast.success('Login successful!');
        await onLogin(email, password); // await so errors from AuthWrapper.login() are caught below
      }
    } catch (err: any) {
      const rawMessage = (err?.body?.error || err?.message || '').toLowerCase();
      let friendly = err?.message || 'Login failed. Please try again.';
      
      if (err?.status === 429 || rawMessage.includes('too many attempts')) {
        const retryAfter = err?.body?.retryAfter || 900; // fallback to 15 mins
        setCountdown(retryAfter);
        setInitialCountdown(retryAfter);
        friendly = `Security lockout active. Please wait for the timer to reset.`;
      } else if (rawMessage.includes('google sign-in')) {
        friendly = 'This email is linked to Google Sign-In. Please continue using the Google button to log in.';
      } else if (rawMessage.includes('facebook login')) {
        friendly = 'This email is linked to Facebook Login. Please continue using the Facebook option to log in.';
      }
      setError(friendly);
      toast.error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');
    const base = api.replace(/\/api\/?$/, '');
    window.location.href = `${base}/api/auth/google`;
  };


  const handleSendCode = async () => {
    if (!resetEmail) {
      setResetError('Please enter your email');
      return;
    }

    setResetIsLoading(true);
    try {
      await apiService.forgotPassword(resetEmail);
      setStep("code");
      setResetError("");
      toast.success('Verification code sent to your email');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send code';
      if (err?.status === 429) {
        const retryAfter = err?.body?.retryAfter || 3600;
        setCountdown(retryAfter);
        setInitialCountdown(retryAfter);
        setResetError(`Too many requests. Please wait for the cooldown.`);
      } else {
        setResetError(errorMsg);
      }
    } finally {
      setResetIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!resetCode) {
      setResetError('Please enter the verification code');
      return;
    }

    setResetIsLoading(true);
    try {
      await apiService.verifyResetCode(resetEmail, resetCode);
      setStep("reset");
      setResetError("");
      toast.success('Code verified');
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid code';
      setResetError(errorMsg); // Show in UI, not toast
    } finally {
      setResetIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setResetError('Please enter both passwords');
      return;
    }

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetIsLoading(true);
    try {
      await apiService.resetPassword(resetEmail, resetCode, newPassword);

      const modalEl = document.getElementById("forgotPasswordModal");
      if (window.bootstrap && modalEl) {
        let modal = window.bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new window.bootstrap.Modal(modalEl);
        modal.hide();
      }

      setTimeout(() => {
        setStep("email");
        setResetEmail("");
        setResetCode("");
        setNewPassword("");
        setConfirmPassword("");
        setResetError("");
      }, 500);

      toast.success("Password reset successfully! Please log in with your new password.");
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setResetIsLoading(false);
    }
  };

  return (
    <div className="auth-modern-container">
      <div className="auth-modern-card animate-fade-in">
        {/* Sidebar */}
        <div className="auth-modern-sidebar">
          <div className="mb-auto">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="bg-white rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <span className="text-dark fw-bold fs-5">P</span>
              </div>
              <span className="fs-5 fw-bold tracking-tight">PCH Hardware</span>
            </div>
          </div>
          
          <div className="mb-auto">
            <h2 className="display-6 fw-bold mb-3">Optimize your business operations.</h2>
            <p className="text-secondary opacity-75 fs-5">
              Access your dashboard, manage inventory, and process transactions with our unified hardware store system.
            </p>
          </div>
          
          <div className="mt-auto pt-5">
            <div className="d-flex gap-4 opacity-50 text-sm">
              <span>© 2024 PCH System</span>
              <span>Privacy Policy</span>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="auth-modern-form-area">
          <div className="mb-4">
            <h1 className="auth-modern-title">Welcome back</h1>
            <p className="auth-modern-subtitle">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit}>
            {countdown > 0 && (
              <div className="auth-countdown-container">
                <div className="auth-countdown-header">
                  <div className="auth-countdown-icon">
                    <ShieldAlert size={18} />
                  </div>
                  <h3 className="auth-countdown-title">Security Delay</h3>
                </div>
                
                <div className="auth-countdown-timer">
                  {formatTime(countdown)}
                  <span>remaining</span>
                </div>

                <div className="auth-countdown-progress-bg">
                  <div 
                    className="auth-countdown-progress-bar" 
                    style={{ width: `${(countdown / initialCountdown) * 100}%` }}
                  ></div>
                </div>
                
                <p className="text-xs text-secondary mt-1 opacity-70">
                  Multiple failed attempts detected. For your security, login is temporarily disabled.
                </p>
              </div>
            )}

            {error && countdown === 0 && (
              <Alert variant="destructive" className="mb-4 border-0 shadow-sm bg-danger bg-opacity-10 text-danger py-2">
                <AlertDescription className="small d-flex align-items-center gap-2">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="auth-modern-input-group">
              <Label htmlFor="email" className="auth-modern-label">Email Address</Label>
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
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Label htmlFor="password" className="auth-modern-label mb-0">Password</Label>
                <button
                  type="button"
                  className="btn btn-link p-0 text-xs text-decoration-none text-muted"
                  data-bs-toggle="modal"
                  data-bs-target="#forgotPasswordModal"
                  tabIndex={-1}
                  onClick={() => {
                    setStep("email");
                    setResetError('');
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="position-relative">
                <input
                  className="auth-modern-input pe-5"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2 text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-modern-button-primary mt-2" 
              disabled={isLoading || countdown > 0}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm" role="status"></span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="auth-modern-divider">
              <span>or continue with</span>
            </div>

            <button
              type="button"
              className="auth-modern-button-google"
              onClick={handleGoogleSignup}
            >
              <FcGoogle size={20} />
              Google
            </button>
          </form>

          <p className="auth-modern-footer">
            Don't have an account?{' '}
            <button
              type="button"
              className="btn btn-link p-0 auth-modern-link align-baseline fs-6"
              onClick={onSwitchToSignUp}>
              Sign up free
            </button>
          </p>
        </div>
      </div>

      {/* === FORGOT PASSWORD MODAL (Styling update) === */}
      <div className="modal fade" id="forgotPasswordModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-header border-0 pb-0 pt-4 px-4 bg-white">
              <div>
                <h5 className="modal-title fw-bold">Reset Password</h5>
                <p className="text-secondary small mb-0">We'll help you get back into your account.</p>
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body p-4">
              {countdown > 0 ? (
                <div className="auth-countdown-container mb-4">
                  <div className="auth-countdown-header">
                    <div className="auth-countdown-icon">
                      <ShieldAlert size={18} />
                    </div>
                    <h3 className="auth-countdown-title">Security Delay</h3>
                  </div>
                  
                  <div className="auth-countdown-timer">
                    {formatTime(countdown)}
                    <span>remaining</span>
                  </div>

                  <div className="auth-countdown-progress-bg">
                    <div 
                      className="auth-countdown-progress-bar" 
                      style={{ width: `${(countdown / initialCountdown) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ) : resetError && (
                <div className="alert alert-danger border-0 small py-2 mb-3">
                  {resetError}
                </div>
              )}

              {step === "email" && (
                <div className="mb-0">
                  <Label className="small fw-bold mb-2">Email Address</Label>
                  <Input
                    className="auth-modern-input"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                  />
                </div>
              )}

              {step === "code" && (
                <div className="mb-0">
                  <Label className="small fw-bold mb-2">Verification Code</Label>
                  <Input
                    className="auth-modern-input text-center fs-5 tracking-widest fw-bold"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
              )}

              {step === "reset" && (
                <div className="d-flex flex-column gap-3">
                  <div>
                    <Label className="small fw-bold mb-2">New Password</Label>
                    <Input
                      className="auth-modern-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  <div>
                    <Label className="small fw-bold mb-2">Confirm New Password</Label>
                    <Input
                      className="auth-modern-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 p-4 pt-0">
              {step === "email" && (
                <button className="auth-modern-button-primary" onClick={handleSendCode} disabled={resetIsLoading}>
                  {resetIsLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Send verification code'}
                </button>
              )}
              {step === "code" && (
                <button className="auth-modern-button-primary" onClick={handleVerifyCode} disabled={resetIsLoading}>
                  {resetIsLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Verify code'}
                </button>
              )}
              {step === "reset" && (
                <button className="auth-modern-button-primary" onClick={handleResetPassword} disabled={resetIsLoading}>
                  {resetIsLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Reset password'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

