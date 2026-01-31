import { ac } from '../security/rbac.js';

function toMethod(permission) {
  if (typeof permission !== 'string' || !permission.includes(':')) return null;
  const [action, possession] = permission.split(':');
  if (!action || !possession) return null;
  return {
    methodName: `${action}${possession.charAt(0).toUpperCase()}${possession.slice(1)}`,
    action,
    possession,
  };
}

function evaluateOverrides(overrides = [], resource, action, possession = 'any') {
  const relevant = overrides.filter((ovr) => (
    ovr.resource === resource &&
    ovr.action === action &&
    (!ovr.possession || ovr.possession === possession)
  ));
  if (!relevant.length) return null;
  if (relevant.some((ovr) => ovr.effect === 'deny')) return 'deny';
  if (relevant.some((ovr) => ovr.effect === 'allow')) return 'allow';
  return null;
}

export function authorize(resource, permission) {
  return (req, res, next) => {
    try {
      const role = req.user?.role;
      if (!role) return res.status(401).json({ error: 'Unauthorized' });
      const overrides = req.user?.permissionOverrides || [];
      const descriptor = toMethod(permission);
      if (!descriptor) {
        return res.status(500).json({ error: 'Server permission misconfiguration' });
      }

      const overrideDecision = evaluateOverrides(overrides, resource, descriptor.action, descriptor.possession);
      if (overrideDecision === 'deny') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const roleQuery = ac.can(role);
      let grantedByRole = false;
      const roleMethod = roleQuery?.[descriptor.methodName];
      if (typeof roleMethod === 'function') {
        const permission = roleMethod.call(roleQuery, resource);
        grantedByRole = Boolean(permission?.granted);
      }
      if (grantedByRole) {
        return next();
      }

      if (overrideDecision === 'allow') {
        return next();
      }

      return res.status(403).json({ error: 'Forbidden' });
    } catch (e) {
      return res.status(500).json({ error: 'Authorization error' });
    }
  };
}
