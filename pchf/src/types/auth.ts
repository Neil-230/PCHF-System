export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'cashier';
  createdAt: string;
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