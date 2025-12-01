export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier' | 'owner';
  createdAt: string;
  approved?: boolean;
  loginMethods?: string[];
  passwordCreatedManually?: boolean;
  googleId?: string | null;
  facebookId?: string | null;
  isVerified?: boolean;
}

export interface PendingAdmin {
  id: string;
  email: string;
  name: string;
  password: string;
  requestedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'cashier';
}