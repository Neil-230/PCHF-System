import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert } from "../ui/alert";
import { Select, SelectItem } from "../ui/select";
import { Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "react-bootstrap";
import "../css/signup.css";
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
      toast.error(err.message || "Failed to send verification code");
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

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
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
    <div className="d-flex align-items-center justify-content-center p-4" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-column" style={{ minWidth: "50%" }}>
        <div className="container-fluid">
          <div className="row">
            {/* LEFT SIDE */}
            <div className="col-md-6 p-0">
              <div className="headerMes d-flex flex-column p-4 h-100 justify-content-center bg-dark">
                <div className="text-center">
                  <h3 className="fw-bold text-light">Hello my friend!</h3>
                  <p className="text-secondary text-light">
                    Create your account to get started <br />
                    Fill in your information to create a new account
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="col-md-6 p-0">
              <div className="bodyLOG d-flex flex-column justify-content-center p-5 border-0">
                <CardHeader className="d-flex flex-column text-start">
                  <CardTitle className="fw-bold fs-4 mb-3">Create account</CardTitle>
                </CardHeader>

                <CardContent>
                  <form className="FormSign">
                    {error && <Alert variant="destructive">{error}</Alert>}

                    <div className="row">
                      <div className="col">
                        <Label htmlFor="firstName" className="fw-bold">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="Enter first name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col">
                        <Label htmlFor="lastName" className="fw-bold">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Enter last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
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

                    <div>
                      <Label htmlFor="role" className="fw-bold">Role</Label>
                      <Select
                        value={role}
                        onChange={(value) => setRole(value as "admin" | "cashier")}
                      >
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </Select>
                    </div>



                    {verificationPending && (
                      <Alert className="mt-3" variant="default">
                        <div className="d-flex flex-column gap-1">
                          <strong>Check your email</strong>
                          <span>A verification code was sent to {email}. Use the link below to reopen the code prompt or resend the code.</span>
                        </div>
                      </Alert>
                    )}

                    <Button
                      type="button"
                      className="w-100 mt-3 bg-dark"
                      onClick={() => handleSendCode()}
                      disabled={isLoading || verificationPending}
                    >
                      <Check className="me-2" size={16} />
                      {verificationPending ? 'Verification Pending' : isLoading ? 'Sending...' : 'Confirm'}
                    </Button>

                    {verificationPending && !showCodeModal && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-100 mt-2"
                        onClick={() => setShowCodeModal(true)}
                      >
                        Enter Verification Code
                      </Button>
                    )}
                  </form>
                    <div className=" text-center mt-1 mb-0">
                      <button
                        type="button"
                        className="border border rounded-2 w-100 text-sm"
                        style={{
                          border: "1px solid #dadce0",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                        }}
                        onClick={handleGoogleSignup}
                      >
                        <FcGoogle size={20} className="me-2" />
                        Sign Up with Google
                      </button>
                    </div>

                  <div className="mt-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 text-dark fw-bold text-decoration-none"
                        onClick={onSwitchToLogin}
                      >
                        Sign in
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </div>
            </div>

            <div className="text-center mt-3 text-dark">
              <p>By creating an account, you agree to our terms of service</p>
            </div>
          </div>
        </div>
      </div>

      {/*Modal 1 Verification */}
      <Modal show={showCodeModal} onHide={() => setShowCodeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Email Verification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary">Enter the verification code sent to your email.</p>
          <Input
            placeholder="Enter code"
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value)}
          />
          <div className="mt-3 text-center">
            <Button
              type="button"
              variant="link"
              className="p-0"
              disabled={isLoading || resendCooldown > 0}
              onClick={() => handleSendCode(true)}
            >
              {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend code'}
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCodeModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleVerifyCode} disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Removed create password modal: password is required on the main form now */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleCreateAccount}>
            <Label htmlFor="password" className="fw-bold">Password</Label>
            <div className="position-relative w-100 mb-3">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Label htmlFor="confirmPassword" className="fw-bold">Confirm Password</Label>
            <div className="position-relative w-100">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button type="submit" className="w-100 mt-3 bg-dark" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
}
