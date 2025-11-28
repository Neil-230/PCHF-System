import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Eye, EyeOff, CreditCard, LogInIcon, MailCheck } from "lucide-react";
import { toast } from "sonner";
import "../css/login.css";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import apiService from "../../services/api";
import { executeRecaptcha } from "../../services/recaptcha";
import { useNavigate } from "react-router-dom";

interface LoginProps {
  onLogin: (email: string, password: string) => boolean;
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
  const navigate = useNavigate();

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
        onLogin(email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Login failed. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');
    const base = api.replace(/\/api\/?$/, '');
    window.location.href = `${base}/api/auth/google`;
  };

  const handleFacebookSignup = () => {
    const api = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api');
    const base = api.replace(/\/api\/?$/, '');
    window.location.href = `${base}/api/auth/facebook`;
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
      setResetError(err.message || 'Failed to send code');
      toast.error(err.message || 'Failed to send code');
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
      setResetError(err.message || 'Invalid code');
      toast.error(err.message || 'Invalid code');
    } finally {
      setResetIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setResetError('Please enter both passwords');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters');
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
    <div className="d-flex align-items-center justify-content-center p-4" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-column" style={{ minWidth: "50%" }}>
        <div className="container-fluid">
          <div className="row entireLogin">
            <div className="col-md-6 p-0">
              <div className="headerMes d-flex flex-column p-5 h-100 justify-content-center border border-0 bg-dark">
                <div className="text-center">
                  <div className="">
                    <h3 className="text-secondary">Welcome back!</h3>
                  </div>
                  <h1 className="text-light">PCH - Hardware Store</h1>
                </div>
              </div>
            </div>
            <div className="col-md-6 p-0">
              <div className="bodyLOG d-flex flex-column justify-content-center p-5 border border-0">
                <CardContent className="">
                  <form onSubmit={handleSubmit}>
                    {error && (
                      <Alert variant="destructive" style={{display:"none"}}>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="mb-3">
                      <Label htmlFor="email" className="fw-bold">Email</Label>
                      <Input
                        className="EmailINT"
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-2">
                      <Label htmlFor="password" className="fw-bold">Password</Label>
                      <div className="position-relative">
                        <input
                          className="PassINT form-control pe-5"
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <Eye /> : <EyeOff />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-100 mt-3 bg-dark border-secondary" disabled={isLoading}>
                      <LogInIcon className="me-2" size={16}></LogInIcon>
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>

                    {/* <div className="text-center mt-2">
                      <button
                        type="button"
                        className="border border-0 rounded-2 w-100 text-sm text-light"
                        style={{
                          backgroundColor: "#1877F2",
                          cursor: "pointer",
                        }}
                        onClick={handleFacebookSignup}
                      >
                        <FaFacebook size={20} className="me-2" />
                        Continue with Facebook
                      </button>
                    </div> */}
                    <div className="text-center mt-2">
                      <button
                        type="button"
                        className="border border rounded-2 w-100 text-sm"
                        style={{
                          border: "1px solid #dadce0",
                          backgroundColor: "#fff",
                          color: "#1f1f1f",
                          cursor: "pointer",
                        }}
                        onClick={handleGoogleSignup}
                      >
                        <FcGoogle size={20} className="me-2" />
                        Sign in with Google
                      </button>
                    </div>

                    <div className="text-center mt-3">
                      <button
                        type="button"
                        className="btn btn-link p-0 text-dark fw-bold text-decoration-none"
                        data-bs-toggle="modal"
                        data-bs-target="#forgotPasswordModal"
                        onClick={() => {
                          setStep("email");
                          setResetEmail('');
                          setResetCode('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setResetError('');
                        }}
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </form>

                  <div className="mt-2 text-center mt-3">
                    <p className="text-sm text-muted-foreground mb-0">
                      Don't have an account?{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 text-dark fw-bold text-decoration-none"
                        onClick={onSwitchToSignUp}>
                        Sign up
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </div>
            </div>
            <div className="text-center mt-3 text">
              <p className="">Enter your credentials to access the system</p>
            </div>
          </div>
        </div>
      </div>

      {/* === FORGOT PASSWORD MODAL === */}
      <div className="modal fade" id="forgotPasswordModal" tabIndex={-1} aria-hidden="true" style={{backgroundColor: "rgba(239, 252, 255, 0.31)"}}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3" style={{backgroundColor: "rgba(255, 255, 255, 1)"}}>
            <div className="modal-header border border-0" >
              <h5 className="modal-title">Forgot Password</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body ">
              {resetError && <div className="alert alert-danger">{resetError}</div>}

              {step === "email" && (
                <>
                  <Input
                    className="FogPa"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </>
              )}

              {step === "code" && (
                <>
                  <Input
                    className="FogPa"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                  />
                </>
              )}

              {step === "reset" && (
                <>
                  <Input
                    className="FogPa mb-4"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Input
                    className="FogPa"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </>
              )}
            </div>

            <div className="modal-footer border border-0">
              {step === "email" && (
                <Button className="bg-dark border-0 w-100" onClick={handleSendCode} disabled={resetIsLoading}>
                  {resetIsLoading ? 'Sending...' : 'Send Code'}
                </Button>
              )}
              {step === "code" && (
                <Button className="bg-dark border-0 w-100" onClick={handleVerifyCode} disabled={resetIsLoading}>
                  {resetIsLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              )}
              {step === "reset" && (
                <Button className="bg-dark border-0 w-100" onClick={handleResetPassword} disabled={resetIsLoading}>
                  {resetIsLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
