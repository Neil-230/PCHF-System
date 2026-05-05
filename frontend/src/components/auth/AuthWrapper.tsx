import type { ReactNode } from "react";
import { useState } from "react";
import { LoginUpdated } from "./LoginUpdated";
import { SignUpUpdated } from "./SignUpUpdated";
import type { User } from "../../types/auth";

interface AuthWrapperProps {
  children?: ReactNode;
  onAuthSuccess?: (user: User) => void;
}

export function AuthWrapper({ onAuthSuccess }: AuthWrapperProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Called by LoginUpdated after the auth token is set.
  // Fetches the full user object and forwards it to App via onAuthSuccess.
  const login = async (_email: string, _password: string): Promise<void> => {
    const { default: apiService } = await import("../../services/api");
    try {
      const { user } = await apiService.getCurrentUser();
      onAuthSuccess?.(user);
    } catch (err) {
      throw err; // Re-throw so LoginUpdated's catch shows the error
    }
  };

  return isLoginMode ? (
    <LoginUpdated onLogin={login} onSwitchToSignUp={() => setIsLoginMode(false)} />
  ) : (
    // SignUpUpdated manages its own signup flow internally — only needs the back-to-login callback
    <SignUpUpdated onSwitchToLogin={() => setIsLoginMode(true)} />
  );
}


