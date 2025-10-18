
import type { User, PendingAdmin } from "../types/auth";
export const defaultPasswords: Record<string, string> = {};

class AuthServiceClass {
  private users: User[] = [];

  // Pending admin signups waiting for owner approval
  private pendingAdmins: PendingAdmin[] = [];

  // In-memory "current user" for this demo session
  private currentUser: User | null = null;

  // --- Initialization (no-op for persistenceless demo, kept for compatibility) ---
  initializeUsers() {
    // intentionally left blank — we start with an empty in-memory user list
    // kept for compatibility with existing App.tsx that calls this method
  }

  // --- Getters / Setters (compatibility with previous code) ---
  getUsers(): User[] {
    // return shallow copy to avoid accidental external mutation
    return [...this.users];
  }

  saveUsers(users: User[]) {
    // update in-memory users (kept for compatibility)
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

  // --- Helper: check if an owner exists in current in-memory users ---
  private hasOwner(): boolean {
    return this.users.some((u) => u.role === "owner");
  }

  // --- SIGNUP ---
  /**
   * signUp
   * - name, email, password
   * - role: 'admin' | 'cashier'
   *
   * Return:
   *  - User object if account was created immediately (cashier OR admin when no owner exists)
   *  - null if admin signup was queued for approval (pendingAdmins)
   *  - null if email already exists (duplicate)
   */
  signUp(
    name: string,
    email: string,
    password: string,
    role: "admin" | "cashier" = "cashier"
  ): User | null {
    // Prevent duplicate emails (both users and pending admins)
    const emailExists =
      this.users.some((u) => u.email === email) ||
      this.pendingAdmins.some((p) => p.email === email);
    if (emailExists) {
      // existing account or pending request: return null to indicate failure/duplicate
      return null;
    }

    // If the new account is an admin...
    if (role === "admin") {
      // If there is no owner yet, this first admin becomes the owner immediately
      if (!this.hasOwner()) {
        const newUser: User = {
          id: Date.now().toString(),
          name,
          email,
          role: "owner", // promoted to owner
          createdAt: new Date().toISOString(),
        };
        this.users.push(newUser);
        // store password in demo map for forgot-password flows
        defaultPasswords[email] = password;
        return { ...newUser };
      }

      // If an owner already exists, add this admin to pendingAdmins for approval
      const pending: PendingAdmin = {
        id: Date.now().toString(),
        name,
        email,
        // store password temporarily in pending so we can create account on approval
        password,
        requestedAt: new Date().toISOString(),
      };
      this.pendingAdmins.push(pending);
      // keep password available for demo password-reset (won't be accessible as user yet)
      defaultPasswords[email] = password;
      // return null to indicate "pending approval"
      return null;
    }

    // If role is 'cashier' — create immediately
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
  /**
   * login(email, password)
   * - Returns the User object if credentials match
   * - For safety in the demo: also promote a logging-in admin to owner if no owner exists (edge case)
   */
  login(email: string, password: string): User | null {
    // find by email
    const userIndex = this.users.findIndex((u) => u.email === email);
    if (userIndex === -1) {
      return null;
    }

    // verify password (demo only)
    const stored = defaultPasswords[email];
    if (!stored || stored !== password) {
      return null;
    }

    // copy user object to avoid external mutation
    const user = { ...this.users[userIndex] };

    // Edge-case safety: if there is no owner in users (shouldn't happen normally),
    // but an admin logs in — promote them temporarily to owner for the session.
    if (!this.hasOwner() && user.role === "admin") {
      // update both in-memory user and returned user
      user.role = "owner";
      this.users[userIndex].role = "owner";
    }

    // set session (in-memory)
    this.setCurrentUser(user);
    return { ...user };
  }

  // --- Pending admin utilities used by Dashboard ---
  getPendingAdmins(): PendingAdmin[] {
    // Return copy to avoid mutation outside
    return this.pendingAdmins.map((p) => ({ ...p }));
  }

  /**
   * approveAdmin(adminId)
   * - Only the owner should call this from the UI (Dashboard checks role)
   * - On approve: create a new User with role 'admin' and remove from pending list
   * - Returns true on success, false if pending not found
   */
  approveAdmin(adminId: string): boolean {
    const idx = this.pendingAdmins.findIndex((p) => p.id === adminId);
    if (idx === -1) return false;

    const pending = this.pendingAdmins[idx];

    // Create the admin user
    const adminUser: User = {
      id: Date.now().toString(),
      name: pending.name,
      email: pending.email,
      role: "admin",
      createdAt: new Date().toISOString(),
    };

    // Add to users and remove from pending list
    this.users.push(adminUser);
    this.pendingAdmins.splice(idx, 1);

    // ensure password remains in defaultPasswords (we stored it at signup)
    // (no action required here because defaultPasswords already has it)

    return true;
  }

  /**
   * declineAdmin(adminId)
   * - Remove the pending admin request
   * - Returns true if removed, false if not found
   */
  declineAdmin(adminId: string): boolean {
    const idx = this.pendingAdmins.findIndex((p) => p.id === adminId);
    if (idx === -1) return false;

    // Remove pending entry
    const removed = this.pendingAdmins.splice(idx, 1)[0];

    // Optionally remove stored password for that email, but for demo keep it.
    // If you want to remove password on decline, uncomment:
    // delete defaultPasswords[removed.email];

    return true;
  }

  // --- Optional debugging helpers ---
  getAllUsers(): User[] {
    return this.getUsers();
  }

  resetDemo() {
    this.users = [];
    this.pendingAdmins = [];
    this.currentUser = null;
    // keep defaultPasswords cleared to avoid confusion
    for (const k of Object.keys(defaultPasswords)) {
      delete defaultPasswords[k];
    }
  }
}

export const AuthService = new AuthServiceClass();
export default AuthService;
