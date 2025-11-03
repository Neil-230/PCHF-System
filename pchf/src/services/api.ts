const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface AuthResponse {
  message: string;
  token?: string;
  user?: any;
  requiresRoleSelection?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'cashier';
  isVerified: boolean;
  createdAt: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers as HeadersInit);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let message = 'API request failed';
      try {
        const error = await response.json();
        message = error?.error || message;
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch {}
      }
      throw new Error(message);
    }

    return response.json();
  }

  // ============ AUTH ENDPOINTS ============

  async signup(name: string, email: string, password: string, role: string): Promise<AuthResponse> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
  }

  async verifyEmail(email: string, code: string): Promise<AuthResponse> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async login(email: string, password: string, recaptchaToken: string): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, recaptchaToken }),
    });
  }

  async googleSignupWithRole(googleId: string, name: string, email: string, role: string): Promise<AuthResponse> {
    return this.request('/auth/google-signup-role', {
      method: 'POST',
      body: JSON.stringify({ googleId, name, email, role }),
    });
  }

  async forgotPassword(email: string): Promise<AuthResponse> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetCode(email: string, code: string): Promise<AuthResponse> {
    return this.request('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<AuthResponse> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // ============ USER ENDPOINTS ============

  async getAllUsers(): Promise<{ users: User[] }> {
    return this.request('/users');
  }

  async getUserById(id: string): Promise<{ user: User }> {
    return this.request(`/users/${id}`);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<{ user: User }> {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getPendingAdmins(): Promise<{ pending: any[] }> {
    return this.request('/users/admin/pending');
  }

  async approveAdmin(email: string): Promise<{ user: User }> {
    return this.request(`/users/admin/approve/${email}`, {
      method: 'POST',
    });
  }

  async declineAdmin(email: string): Promise<{ message: string }> {
    return this.request(`/users/admin/decline/${email}`, {
      method: 'POST',
    });
  }

  // ============ PRODUCT ENDPOINTS ============
  async getProducts(params: { q?: string; category?: string } = {}): Promise<{ products: any[] }> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    const qs = query.toString();
    return this.request(`/products${qs ? `?${qs}` : ''}`);
  }

  async createProduct(product: { name: string; sku: string; category?: string; price: number; stock?: number; description?: string }): Promise<{ product: any; message: string }>{
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, updates: Partial<{ name: string; sku: string; category: string; price: number; stock: number; description: string }>): Promise<{ product: any; message: string }>{
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProduct(id: string): Promise<{ message: string }>{
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // ============ TRANSACTIONS ENDPOINTS ============
  async getTransactions(limit = 50): Promise<{ transactions: any[] }> {
    const qs = `?limit=${encodeURIComponent(String(limit))}`;
    return this.request(`/transactions${qs}`);
  }

  async createTransaction(payload: any): Promise<{ transaction: any }> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ============ DASHBOARD ENDPOINTS ============
  async getDashboardMetrics(): Promise<any> {
    return this.request('/dashboard/metrics');
  }

  // ============ ACCOUNT DELETION (SELF) ============
  async getDeletionStatus(): Promise<{ scheduledFor: string | null; daysRemaining: number | null }> {
    return this.request('/users/me/deletion-status');
  }

  async requestDeletion(): Promise<{ scheduledFor: string; daysRemaining: number }> {
    return this.request('/users/me/deletion-request', { method: 'POST' });
  }

  async cancelDeletion(): Promise<{ scheduledFor: null; daysRemaining: null }> {
    return this.request('/users/me/deletion-cancel', { method: 'POST' });
  }

  // ============ SYSTEM SETTINGS ============
  async getSystemSettings(): Promise<{ id: string; signupsOpen: boolean; updatedAt: string }> {
    return this.request('/settings');
  }

  async setSignupsOpen(signupsOpen: boolean): Promise<{ id: string; signupsOpen: boolean; updatedAt: string }> {
    return this.request('/settings/signups-open', {
      method: 'POST',
      body: JSON.stringify({ signupsOpen })
    });
  }
}

export const apiService = new ApiService();
export default apiService;
