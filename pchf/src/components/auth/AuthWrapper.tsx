import { useState } from "react";
import { Login } from "./Login";
import { SignUp } from "./SignUp";
import type { User } from "../../types/auth";
import { AuthService } from "../../data/authData";

interface AuthWrapperProps {
  onAuthSuccess: (user: User) => void;
}

export function AuthWrapper({ onAuthSuccess }: AuthWrapperProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleLogin = (email: string, password: string): boolean => {
    const user = AuthService.login(email, password);
    if (user) {
      onAuthSuccess(user);
      return true;
    }
    return false;
  };

  const handleSignUp = (
    name: string,
    email: string,
    password: string,
    role: "admin" | "cashier"
  ): boolean => {
    const user = AuthService.signUp(name, email, password, role);
    if (user) {
      onAuthSuccess(user);
      return true;
    }
    return false;
  };

  return isLoginMode ? (
    <Login
      onLogin={handleLogin}
      onSwitchToSignUp={() => setIsLoginMode(false)}
    />
  ) : (
    <SignUp
      onSignUp={handleSignUp}
      onSwitchToLogin={() => setIsLoginMode(true)}
    />
  );
}
