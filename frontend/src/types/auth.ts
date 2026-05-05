export type UserRole = 'admin' | 'cashier' | 'owner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissionOverrides?: PermissionOverride[];
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
  role?: Exclude<UserRole, 'owner'>;
}

export interface PermissionOverride {
  id?: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  possession?: 'any' | 'own';
  effect: 'allow' | 'deny';
}

export interface PermissionActionDescriptor {
  action: 'create' | 'read' | 'update' | 'delete';
  possession?: 'any' | 'own';
  label: string;
  defaultRoles: UserRole[];
}

export interface PermissionGroupDescriptor {
  id: string;
  label: string;
  resource: string;
  description: string;
  actions: PermissionActionDescriptor[];
}