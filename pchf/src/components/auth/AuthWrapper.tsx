import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { Login } from "./Login";
import { SignUp } from "./SignUp";
import type { User } from "../../types/auth";
import { AuthService } from "../../data/authData";

interface AuthWrapperProps {
  children?: ReactNode; // allow wrapping the whole app
  onAuthSuccess?: (user: User) => void;
}

// 1. Create AuthContext
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  signUp: (
    name: string,
    email: string,
    password: string,
    role: "admin" | "cashier"
  ) => boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// 2. Provide context
export function AuthWrapper({ children, onAuthSuccess }: AuthWrapperProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    const foundUser = AuthService.login(email, password);
    if (foundUser) {
      setUser(foundUser);
      onAuthSuccess?.(foundUser);
      return true;
    }
    return false;
  };

  const signUp = (
    name: string,
    email: string,
    password: string,
    role: "admin" | "cashier"
  ): boolean => {
    const newUser = AuthService.signUp(name, email, password, role);
    if (newUser) {
      setIsLoginMode(true); // switch to login
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsLoginMode(true);
  };

  // If no user logged in → show login/signup
  if (!user) {
    return isLoginMode ? (
      <Login onLogin={login} onSwitchToSignUp={() => setIsLoginMode(false)} />
    ) : (
      <SignUp onSignUp={signUp} onSwitchToLogin={() => setIsLoginMode(true)} />
    );
  }

  // If logged in → provide context to children (the app)
  return (
    <AuthContext.Provider value={{ user, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Helper hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthWrapper");
  return context;
};
