import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert } from "../ui/alert";
import { Select, SelectItem } from "../ui/select";
import { Eye, EyeOff, CreditCard, MailCheck, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "react-bootstrap"; // ✅ assuming you have bootstrap or react-bootstrap
import "../css/signup.css"

interface SignUpProps {
  onSignUp: (name: string, email: string, password: string, role: "admin" | "cashier") => boolean;
  onSwitchToLogin: () => void;
}

export function SignUp({ onSignUp, onSwitchToLogin }: SignUpProps) {
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

  // Modal states
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Verification
  const [enteredCode, setEnteredCode] = useState("");
  const demoCode = "123456"; // static for demo

  const handleSendCode = () => {
    if (!firstName || !lastName || !email) {
      toast.error("Please fill out all required fields first.");
      return;
    }
    toast.info(`Demo verification code sent! Code: ${demoCode}`);
    setShowCodeModal(true);
  };

  const handleVerifyCode = () => {
    if (enteredCode === demoCode) {
      toast.success("Email verified successfully!");
      setShowCodeModal(false);
      setShowPasswordModal(true);
    } else {
      toast.error("Invalid code. Please try again.");
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const name = `${firstName} ${lastName}`;
      const success = onSignUp(name, email, password, role);
      if (!success) {
        toast.error("An account with this email already exists");
      } else {
        toast.success("Account successfully created!");
        setShowPasswordModal(false);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center p-4" style={{ minHeight: "100vh" }}>
      <div className="d-flex flex-column" style={{ minWidth: "50%" }}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6 p-0">
              <div className="headerMes d-flex flex-column p-4 h-100 border border-0 justify-content-center bg-dark">
                <div className="text-center d-flex flex-column justify-content-center">
                  <div className="d-flex items-center justify-content-center gap-2">
                    <h3 className="fw-bold text-light">Hello my friend!</h3>
                  </div>
                  <p className="text-secondary text-light">Create your account to get started <br/>Fill in your information to create a new account</p>
                </div>
              </div>
            </div>
            <div className="col-md-6 p-0">
              <div className="bodyLOG d-flex flex-column justify-content-center p-5 border border-0">
                <CardHeader className="d-flex flex-column text-start">
                  <CardTitle className="fw-bold fs-4 mb-3">Create account</CardTitle>
                </CardHeader>

                <CardContent>
                  <form className="FormSign space-y-4">
                    {error && <Alert variant="destructive">{error}</Alert>}

                    <div className="row">
                      <div className="col">
                        <Label htmlFor="firstName" className="fw-bold">First Name</Label>
                        <Input
                          className="EmailINT"
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
                          className="EmailINT"
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
                        className="EmailINT"
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="fw-bold">Role</Label>
                      <Select
                        value={role}
                        onChange={(value) => setRole(value as "admin" | "cashier")}
                      >
                        <SelectItem value="cashier">Cashier</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </Select>
                    </div>

                    <Button type="button" className="w-100 mt-3 bg-dark" onClick={handleSendCode}>
                      <MailCheck className="me-2" size={16} /> Confirm
                    </Button>
                  </form>

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

      {/* ✅ Modal 1: Enter verification code */}
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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCodeModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleVerifyCode}>Verify</Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ Modal 2: Create password */}
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
