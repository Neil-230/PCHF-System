import type { User, PendingAdmin } from "../types/auth";
export const defaultPasswords: Record<string, string> = {};

class AuthServiceClass {
  private users: User[] = [];
  private pendingAdmins: PendingAdmin[] = [];
  private currentUser: User | null = null;

  initializeUsers() {}

  getUsers(): User[] {
    return [...this.users];
  }

  saveUsers(users: User[]) {
    this.users = [...users];
  }

  getCurrentUser(): User | null {
    return this.currentUser ? { ...this.currentUser } : null;
  }

  setCurrentUser(user: User | null) {
    this.currentUser = user ? { ...user } : null;
  }

  logout() {
    this.setCurrentUser(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  private hasOwner(): boolean {
    return this.users.some((u) => u.role === "owner");
  }

  // --- SIGNUP ---
  signUp(
    name: string,
    email: string,
    password: string,
    role: "admin" | "cashier" = "cashier"
  ): User | null {
    const emailExists =
      this.users.some((u) => u.email === email) ||
      this.pendingAdmins.some((p) => p.email === email);
    if (emailExists) return null;

    if (role === "admin") {
      if (!this.hasOwner()) {
        const newUser: User = {
          id: Date.now().toString(),
          name,
          email,
          role: "owner",
          createdAt: new Date().toISOString(),
        };
        this.users.push(newUser);
        defaultPasswords[email] = password;
        return { ...newUser };
      }

      const pending: PendingAdmin = {
        id: Date.now().toString(),
        name,
        email,
        password,
        requestedAt: new Date().toISOString(),
      };
      this.pendingAdmins.push(pending);
      defaultPasswords[email] = password;
      return null;
    }

    const newCashier: User = {
      id: Date.now().toString(),
      name,
      email,
      role: "cashier",
      createdAt: new Date().toISOString(),
    };
    this.users.push(newCashier);
    defaultPasswords[email] = password;
    return { ...newCashier };
  }

  // --- LOGIN ---
  login(email: string, password: string): User | null {
    const userIndex = this.users.findIndex((u) => u.email === email);
    if (userIndex === -1) return null;

    const stored = defaultPasswords[email];
    if (!stored || stored !== password) return null;

    const user = { ...this.users[userIndex] };

    if (!this.hasOwner() && user.role === "admin") {
      user.role = "owner";
      this.users[userIndex].role = "owner";
    }

    this.setCurrentUser(user);
    return { ...user };
  }

  getPendingAdmins(): PendingAdmin[] {
    return this.pendingAdmins.map((p) => ({ ...p }));
  }

  approveAdmin(adminId: string): boolean {
    const idx = this.pendingAdmins.findIndex((p) => p.id === adminId);
    if (idx === -1) return false;

    const pending = this.pendingAdmins[idx];

    const adminUser: User = {
      id: Date.now().toString(),
      name: pending.name,
      email: pending.email,
      role: "admin",
      createdAt: new Date().toISOString(),
    };

    this.users.push(adminUser);
    this.pendingAdmins.splice(idx, 1);
    return true;
  }

  declineAdmin(adminId: string): boolean {
    const idx = this.pendingAdmins.findIndex((p) => p.id === adminId);
    if (idx === -1) return false;
    this.pendingAdmins.splice(idx, 1);
    return true;
  }

  getAllUsers(): User[] {
    return this.getUsers();
  }

  resetDemo() {
    this.users = [];
    this.pendingAdmins = [];
    this.currentUser = null;
    for (const k of Object.keys(defaultPasswords)) {
      delete defaultPasswords[k];
    }
  }

  // --- 🔐 SETTINGS ACCESS CONTROL ---
  /**
   * Returns a list of settings the current user is allowed to access.
   */
  getAllowedSettings(): string[] {
    if (!this.currentUser) return [];

    switch (this.currentUser.role) {
      case "cashier":
        return ["Security"]; // only Security allowed
      case "admin":
        return ["Security", "User Management", "System", "Appearance"];
      case "owner":
        return ["Security", "User Management", "System", "Appearance", "Backup", "Permissions"];
      default:
        return [];
    }
  }

  /**
   * Check if current user can access a specific setting
   */
  canAccessSetting(settingName: string): boolean {
    const allowed = this.getAllowedSettings();
    return allowed.includes(settingName);
  }
}

export const AuthService = new AuthServiceClass();
export default AuthService;
