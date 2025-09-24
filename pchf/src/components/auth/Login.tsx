import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { Eye, EyeOff, CreditCard, Weight } from "lucide-react";

interface LoginProps {
  onLogin: (email: string, password: string) => boolean;
  onSwitchToSignUp: () => void;
}

export function Login({ onLogin, onSwitchToSignUp }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = onLogin(email, password);
      if (!success) {
        setError('Invalid email or password. Please try again.');
      }
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

  return (
    <div className=" d-flex align-items-center justify-content-center p-4" style={{minHeight:"100vh"}} >
      <div className="d-flex flex-column" style={{minWidth:"32%"}}>
        <div className="text-center d-flex flex-column justify-content-center">
          <div className="d-flex items-center justify-content-center gap-2">
            <div className="">
              <CreditCard size={35}/>
            </div>
            <h3 className="fw-bold">Cashier System</h3>
          </div>
          <p className=" text-secondary">Sign in to access your dashboard</p>
        </div>

        <Card>
          <CardHeader className="d-flex flex-column text-start ">
            <CardTitle className="fw-bold fs-4">Welcome back</CardTitle>
            <CardDescription className="text-secondary">
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* USERNAME */}
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

              {/* PASSWORD */}
              <div>
                <Label htmlFor="password" className="fw-bold">Password</Label>
                <div className="relative d-flex">
                  <div className="position-relative w-100">
                    <input
                      className="form-control pe-5 " // add padding so text doesn't overlap the button
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
                </div>
              </div>

              <Button type="submit" className="w-100 mt-2 bg-dark border-secondary" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="d-flex align-items-center my-4">
                <div className="flex-grow-1 border-top"></div>
                <span className="mx-3 text-secondary">DEMO ACCOUNT</span>
                <div className="flex-grow-1 border-top"></div>
              </div>

              <div className="d-flex justify-content-center md-col-2 gap-2 mb-3">
                <Button type="button" className="w-100 bg-dark border-secondary" onClick={() => fillDemoCredentials('admin')}>
                  Admin Demo
                </Button>
                <Button type="button" className="w-100 bg-dark border-secondary" onClick={() => fillDemoCredentials('cashier')}>
                  Cashier Demo
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button 
                  type="button" 
                  variant="link" 
                  className="p-0 text-dark fw-bold text-decoration-none " 
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
    </div>
  );
}
