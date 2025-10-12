import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Eye, EyeOff, CreditCard } from "lucide-react";
import { AuthService, defaultPasswords } from "../../data/authData";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (email: string, password: string) => boolean;
  onSwitchToSignUp: () => void;
}

declare global {
  interface Window {
    bootstrap: any;
  }
}

export function Login({ onLogin, onSwitchToSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<"email" | "code" | "reset">("email");
  const [resetError, setResetError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = onLogin(email, password);
      if (!success) setError('Invalid email or password. Please try again.');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (role: 'admin' | 'cashier') => {
    if (role === 'admin') {
      setEmail('admin@demo.com');
      setPassword('admin123');
    } else {
      setEmail('cashier@demo.com');
      setPassword('cashier123');
    }
    setError('');
  };

  const handleSendCode = () => {
    const users = AuthService.getUsers();
    const found = users.find(u => u.email === resetEmail);

    if (!found) {
      setResetError("No account found with this email.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setStep("code");
    setResetError("");

    alert(`Your sample verification code: ${code}`);
  };

  const handleVerifyCode = () => {
    if (resetCode === generatedCode) {
      setStep("reset");
      setResetError("");
    } else {
      toast.error("Invalid Verification code");
    }
  };

  const handleResetPassword = () => {
    console.log("Reset password clicked");

    if (newPassword.trim().length < 6) {
      toast.warning("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Demo only: Save the password
    defaultPasswords[resetEmail] = newPassword;
    
    // Close modal safely
    const modalEl = document.getElementById("forgotPasswordModal");
    if (window.bootstrap && modalEl) {
      let modal = window.bootstrap.Modal.getInstance(modalEl);
      if (!modal) modal = new window.bootstrap.Modal(modalEl);
      modal.hide();
    }
      

    // Reset state after modal close
    setTimeout(() => {
      setStep("email");
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetError("");
    }, 500);

    toast.success("Password reset successfully! Please log in with your new password.");
  };

  return (
    <div className="d-flex align-items-center justify-content-center p-4" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-column" style={{ minWidth: "32%" }}>
        <div className="text-center d-flex flex-column justify-content-center mb-3">
          <div className="d-flex items-center justify-content-center gap-2">
            <CreditCard size={35} />
            <h3 className="fw-bold">Cashier System</h3>
          </div>
          <p className="text-secondary">Sign in to access your dashboard</p>
        </div>

        <Card>
          <CardHeader className="text-start">
            <CardTitle className="fw-bold fs-4">Welcome back</CardTitle>
            <CardDescription className="text-secondary">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="mb-3">
                <Label htmlFor="email" className="fw-bold">Email</Label>
                <Input
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
                    className="form-control pe-5"
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
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                <div className="text-end mt-1">
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
              </div>

              <Button type="submit" className="w-100 mt-3 bg-dark border-secondary" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-4">
              <div className="d-flex align-items-center my-3">
                <div className="flex-grow-1 border-top"></div>
                <span className="mx-3 text-secondary">DEMO ACCOUNT</span>
                <div className="flex-grow-1 border-top"></div>
              </div>
              <div className="d-flex justify-content-center gap-2 mb-3">
                <Button className="w-100 bg-dark border-secondary" onClick={() => fillDemoCredentials('admin')}>
                  Admin Demo
                </Button>
                <Button className="w-100 bg-dark border-secondary" onClick={() => fillDemoCredentials('cashier')}>
                  Cashier Demo
                </Button>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
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
        </Card>

        <div className="text-center mt-3">
          <p>Demo credentials are provided for testing purposes</p>
        </div>
      </div>

      {/* === FORGOT PASSWORD MODAL === */}
      <div className="modal fade" id="forgotPasswordModal" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header">
              <h5 className="modal-title">Forgot Password</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {resetError && <div className="alert alert-danger">{resetError}</div>}

              {step === "email" && (
                <>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </>
              )}

              {step === "code" && (
                <>
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                  />
                </>
              )}

              {step === "reset" && (
                <>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Label className="mt-3">Confirm Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </>
              )}
            </div>

            <div className="modal-footer">
              {step === "email" && (
                <Button className="bg-dark border-0 w-100" onClick={handleSendCode}>Send Code</Button>
              )}
              {step === "code" && (
                <Button className="bg-dark border-0 w-100" onClick={handleVerifyCode}>Verify Code</Button>
              )}
              {step === "reset" && (
                <Button className="bg-dark border-0 w-100" onClick={handleResetPassword}>Reset Password</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
