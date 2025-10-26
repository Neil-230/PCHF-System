import User from '../models/User.js';
import PasswordReset from '../models/PasswordReset.js';

class Database {
  constructor() {
    this.users = [];
    this.pendingAdmins = [];
    this.passwordResets = [];
  }

  // User operations
  createUser(userData) {
    const user = new User(userData);
    this.users.push(user);
    return user;
  }

  getUserByEmail(email) {
    return this.users.find(u => u.email === email);
  }

  getUserById(id) {
    return this.users.find(u => u.id === id);
  }

  getUserByGoogleId(googleId) {
    return this.users.find(u => u.googleId === googleId);
  }

  getAllUsers() {
    return this.users;
  }

  updateUser(id, updates) {
    const user = this.getUserById(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      return user;
    }
    return null;
  }

  deleteUser(id) {
    const index = this.users.findIndex(u => u.id === id);
    if (index > -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }

  // Pending admin operations
  addPendingAdmin(adminData) {
    this.pendingAdmins.push(adminData);
    return adminData;
  }

  getPendingAdmins() {
    return this.pendingAdmins;
  }

  removePendingAdmin(email) {
    const index = this.pendingAdmins.findIndex(a => a.email === email);
    if (index > -1) {
      this.pendingAdmins.splice(index, 1);
      return true;
    }
    return false;
  }

  // Password reset operations
  createPasswordReset(email, code) {
    const reset = new PasswordReset({ email, code });
    this.passwordResets.push(reset);
    return reset;
  }

  getPasswordReset(email, code) {
    return this.passwordResets.find(r => r.email === email && r.code === code && !r.used && !r.isExpired());
  }

  markPasswordResetAsUsed(email, code) {
    const reset = this.getPasswordReset(email, code);
    if (reset) {
      reset.used = true;
      return true;
    }
    return false;
  }

  cleanupExpiredResets() {
    this.passwordResets = this.passwordResets.filter(r => !r.isExpired());
  }
}

export const db = new Database();
export default db;
