import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Eye, EyeOff, CreditCard, LogInIcon, MailCheck } from "lucide-react";
import { AuthService, defaultPasswords } from "../../data/authData";
import { toast } from "sonner";
import "../css/login.css";
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"></link>
import { FcGoogle } from "react-icons/fc";

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
      if (!success) toast.error('Invalid email or password. Please try again.');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // const fillDemoCredentials = (role: 'admin' | 'cashier') => {
  //   if (role === 'admin') {
  //     setEmail('admin@demo.com');
  //     setPassword('admin123');
  //   } else {
  //     setEmail('cashier@demo.com');
  //     setPassword('cashier123');
  //   }
  //   setError('');
  // };

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
                  {/* <p className="text-secondary  ">Enter your credentials to access the system</p> */}
                </div>
                {/* <div>
                  <div className="mt-1">
                    <div className="d-flex justify-content-center gap-2 mb-3">
                      <Button className="w-100 bg-white border-secondary text-dark" onClick={() => fillDemoCredentials('admin')}>
                        Admin Demo
                      </Button>
                      <Button className="w-100 bg-white border-secondary text-dark" onClick={() => fillDemoCredentials('cashier')}>
                        Cashier Demo
                      </Button>
                    </div>
                  </div>
                </div> */}
              </div>
            </div>
            <div className="col-md-6 p-0">
              <div className="bodyLOG d-flex flex-column justify-content-center p-5 border border-0">
                <CardContent
                  className=""
                >
                  <form onSubmit={handleSubmit}>
                    {error && (
                      <Alert variant="destructive">
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
                      <LogInIcon className="me-2" size={16} ></LogInIcon>
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </Button>

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
              <p className="  ">Enter your credentials to access the system</p>
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
                  {/* <Label>New Password</Label> */}
                  <Input
                    className="FogPa mb-4"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  {/* <Label className="mt-3">Confirm Password</Label> */}
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
