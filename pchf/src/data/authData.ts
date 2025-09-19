import type { User } from '../types/auth';

// Default demo users for testing
export const defaultUsers: User[] = [
  {
    id: '1',
    email: 'admin@demo.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'cashier@demo.com',
    name: 'Cashier User',
    role: 'cashier',
    createdAt: new Date().toISOString(),
  },
];

// Default passwords for demo users (in real app, these would be hashed)
export const defaultPasswords: Record<string, string> = {
  'admin@demo.com': 'admin123',
  'cashier@demo.com': 'cashier123',
};

export class AuthService {
  private static USERS_KEY = 'cashier_system_users';
  private static CURRENT_USER_KEY = 'cashier_system_current_user';

  static initializeUsers() {
    const existingUsers = localStorage.getItem(this.USERS_KEY);
    if (!existingUsers) {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
    }
  }

  static getUsers(): User[] {
    const users = localStorage.getItem(this.USERS_KEY);
    return users ? JSON.parse(users) : defaultUsers;
  }

  static saveUsers(users: User[]) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  static getCurrentUser(): User | null {
    const user = localStorage.getItem(this.CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  static setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }

  static login(email: string, password: string): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.email === email);
    
    if (user) {
      // Check against default passwords or stored passwords
      const isValidPassword = defaultPasswords[email] === password;
      
      if (isValidPassword) {
        this.setCurrentUser(user);
        return user;
      }
    }
    
    return null;
  }

  static signUp(name: string, email: string, password: string, role: 'admin' | 'cashier' = 'cashier'): User | null {
    const users = this.getUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return null; // User already exists
    }

    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setCurrentUser(newUser);
    
    // In a real app, you'd hash and store the password securely
    // For demo purposes, we'll just store it in memory
    defaultPasswords[email] = password;
    
    return newUser;
  }

  static logout() {
    this.setCurrentUser(null);
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}