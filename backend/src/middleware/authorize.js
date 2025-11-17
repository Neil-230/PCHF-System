import { ac } from '../security/rbac.js';

function toMethod(permission) {
  // permission format: 'create:any' | 'read:any' | 'update:any' | 'delete:any' | 'create:own' ...
  if (typeof permission !== 'string' || !permission.includes(':')) return null;
  const [action, possession] = permission.split(':');
  if (!action || !possession) return null;
  return `${action}${possession.charAt(0).toUpperCase()}${possession.slice(1)}`; // e.g., createAny
}

export function authorize(resource, permission) {
  return (req, res, next) => {
    try {
      const role = req.user?.role;
      if (!role) return res.status(401).json({ error: 'Unauthorized' });
      const method = toMethod(permission);
      if (!method || typeof ac.can(role)[method] !== 'function') {
        return res.status(500).json({ error: 'Server permission misconfiguration' });
      }
      const perm = ac.can(role)[method](resource);
      if (!perm.granted) return res.status(403).json({ error: 'Forbidden' });
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Authorization error' });
    }
  };
}
