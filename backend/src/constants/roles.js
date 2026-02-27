// Role constants - centralized definition to avoid hardcoding role names
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  CASHIER: 'cashier',
};

export const isValidRole = (role) => Object.values(ROLES).includes(role);

export const hasPermission = (userRole, requiredRole) => {
  // Owner has all permissions, Admin has everything except owner-specific, Cashier has limited
  const hierarchy = [ROLES.OWNER, ROLES.ADMIN, ROLES.CASHIER];
  const userLevel = hierarchy.indexOf(userRole);
  const requiredLevel = hierarchy.indexOf(requiredRole);
  return userLevel <= requiredLevel;
};
