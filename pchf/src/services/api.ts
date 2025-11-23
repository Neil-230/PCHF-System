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
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;

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

  private async ensureCsrfToken() {
    if (this.csrfToken) return this.csrfToken;
    if (this.csrfPromise) return this.csrfPromise;

    this.csrfPromise = fetch(`${API_BASE_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => 'Unable to fetch CSRF token');
          throw new Error(errText || 'Unable to fetch CSRF token');
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.csrfToken) {
          throw new Error('Invalid CSRF token response');
        }
        this.csrfToken = data.csrfToken;
        return this.csrfToken;
      })
      .finally(() => {
        this.csrfPromise = null;
      });

    return this.csrfPromise;
  }

  private resetCsrfToken() {
    this.csrfToken = null;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers as HeadersInit);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

     const method = (options.method || 'GET').toUpperCase();
     const needsCsrf = !endpoint.startsWith('/auth') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
     if (needsCsrf) {
       const token = await this.ensureCsrfToken();
       headers.set('X-CSRF-Token', token);
     }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      let message = 'API request failed';
      let raw: any = null;
      try {
        raw = await response.json();
        message = raw?.error || message;
      } catch {
        try {
          const text = await response.text();
          raw = text || null;
          if (text) message = text;
        } catch {}
      }

      if (response.status === 403 && raw && typeof raw === 'object' && raw.error?.toLowerCase?.().includes('csrf')) {
        this.resetCsrfToken();
      }

      const err: any = new Error(message);
      err.status = response.status;
      err.body = raw;
      throw err;
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

  async facebookSignupWithRole(facebookId: string, name: string, email: string, role: string): Promise<AuthResponse> {
    return this.request('/auth/facebook-signup-role', {
      method: 'POST',
      body: JSON.stringify({ facebookId, name, email, role }),
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
  async getTransactions(params: { limit?: number; q?: string; dateFrom?: string; dateTo?: string; paymentMethod?: string; status?: string } = {}): Promise<{ transactions: any[] }> {
    const query = new URLSearchParams();
    if (params.limit != null) query.set('limit', String(params.limit));
    if (params.q) query.set('q', params.q);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return this.request(`/transactions${qs ? `?${qs}` : ''}`);
  }

  async createTransaction(payload: any): Promise<{ transaction: any }> {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteTransactions(params: { dateFrom?: string; dateTo?: string } = {}): Promise<{ message: string; deletedCount: number }>{
    const query = new URLSearchParams();
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    return this.request(`/transactions${qs ? `?${qs}` : ''}`, {
      method: 'DELETE',
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
  async getSystemSettings(): Promise<{ id: string; signupsOpen: boolean; updatedAt: string; storeName?: string; storeAddress?: string; phone?: string; email?: string; taxRate?: number; currency?: string; footerMessage?: string; notifyLowStock?: boolean; notifyOutOfStock?: boolean; lowStockThreshold?: number; notificationMethod?: 'email' | 'sms' | 'both' }> {
    return this.request('/settings');
  }

  async setSignupsOpen(signupsOpen: boolean): Promise<{ id: string; signupsOpen: boolean; updatedAt: string }> {
    return this.request('/settings/signups-open', {
      method: 'POST',
      body: JSON.stringify({ signupsOpen })
    });
  }

  async updateStoreSettings(settings: { storeName?: string; storeAddress?: string; phone?: string; email?: string; taxRate?: number; currency?: string; footerMessage?: string }): Promise<{ id: string; signupsOpen: boolean; updatedAt: string; storeName: string; storeAddress: string; phone: string; email: string; taxRate: number; currency: string; footerMessage: string }>{
    return this.request('/settings/store', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async updateNotificationSettings(settings: { notifyLowStock?: boolean; notifyOutOfStock?: boolean; lowStockThreshold?: number; notificationMethod?: 'email' | 'sms' | 'both' }): Promise<{ notifyLowStock: boolean; notifyOutOfStock: boolean; lowStockThreshold: number; notificationMethod: 'email' | 'sms' | 'both' }>{
    return this.request('/settings/notifications', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // ============ BACKUP (GOOGLE DRIVE) ============
  async getDriveStatus(): Promise<{ connected: boolean; backupEnabled: boolean; backupLastRun: string | null; backupLastError: string; driveFolderId: string | null }> {
    return this.request('/settings/drive/status');
  }

  async getDriveAuthUrl(): Promise<{ url: string }> {
    return this.request('/settings/drive/auth-url');
  }

  async setBackupEnabled(enabled: boolean): Promise<{ backupEnabled: boolean }> {
    return this.request('/settings/backup-enabled', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  async ensureDriveFolder(name?: string): Promise<{ driveFolderId: string }> {
    return this.request('/settings/drive/ensure-folder', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async runDriveBackup(): Promise<{ message: string; file: { id: string; name: string } }> {
    return this.request('/settings/drive/backup', { method: 'POST' });
  }
}

export const apiService = new ApiService();
export default apiService;
