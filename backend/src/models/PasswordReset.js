import { v4 as uuidv4 } from 'uuid';

class PasswordReset {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.token = data.token;
    this.code = data.code;
    this.expiresAt = data.expiresAt || new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    this.createdAt = data.createdAt || new Date().toISOString();
    this.used = data.used || false;
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }
}

export default PasswordReset;
