import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert } from "../ui/alert";
import { Select, SelectItem } from "../ui/select";
import { Eye, EyeOff, CreditCard } from "lucide-react";
import { toast } from "sonner";
// import { Toaster } from "sonner";

interface SignUpProps {
  onSignUp: (name: string, email: string, password: string, role: 'admin' | 'cashier') => boolean;
  onSwitchToLogin: () => void;
}

export function SignUp({ onSignUp, onSwitchToLogin }: SignUpProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      const success = onSignUp(name, email, password, role);
      if (!success) {
        toast.error("An account with this email already exists");
      }else{
        toast.success("Account successfully created!");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className=" d-flex align-items-center justify-content-center p-4" style={{minHeight:"100vh"}}>
      <div className="d-flex flex-column" style={{minWidth:"32%"}}>
        <div className="text-center d-flex flex-column justify-content-center">
          <div className="d-flex items-center justify-content-center gap-2">
            <div className="">
              <CreditCard size={35} />
            </div>
            <h3 className="fw-bold">Cashier System</h3>
          </div>
          <p className=" text-secondary">Create your account to get started</p>
        </div>

        <Card>
          <CardHeader className="d-flex flex-column text-start ">
            <CardTitle className="fw-bold fs-4">Create account</CardTitle>
            <CardDescription className="text-secondary">
              Fill in your information to create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert variant="destructive">{error}</Alert>}

              <div className="">
                <Label htmlFor="name" className="fw-bold">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="">
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

              <div className="space-y-2">
                <Label htmlFor="role" className="fw-bold">Role</Label>
                <Select
                  value={role}
                  onChange={(value) => setRole(value as 'admin' | 'cashier')}
                >
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </Select>
              </div>

              <div className="">
                <Label htmlFor="password" className="fw-bold">Password</Label>
                <div className="position-relative w-100">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="fw-bold">Confirm Password</Label>
                <div className="position-relative w-100">
                  <input
                    className="form-control pe-5 "
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-sm bg-transparent border-0 position-absolute top-50 end-0 translate-middle-y me-2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-100 mt-2 bg-dark border-secondary" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="mt-3 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button 
                  type="button" 
                  variant="link" 
                  className="p-0 text-dark fw-bold text-decoration-none "  
                  onClick={onSwitchToLogin}>
                  Sign in
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-3">
          <p>By creating an account, you agree to our terms of service</p>
        </div>
      </div>
      {/* <Toaster richColors position="top-right" style={{zIndex:99, backgroundColor:"wheat"}} /> */}
    </div>
  );
}
