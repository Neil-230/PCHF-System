import crypto from 'crypto';

const DEFAULT_TTL_MS = Math.max(Number(process.env.IDEMPOTENCY_TTL_MS) || 5000, 1000);
const CLEANUP_INTERVAL_MS = Math.min(Math.max(Number(process.env.IDEMPOTENCY_CLEANUP_MS) || 60000, 5000), 5 * 60 * 1000);

const submissionCache = new Map();
let cleanupScheduled = false;

const scheduleCleanup = () => {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of submissionCache.entries()) {
      if (entry.expiresAt <= now) {
        submissionCache.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
};

const stableStringify = (value) => {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'number' || type === 'boolean') return JSON.stringify(value);
  if (type === 'string') return JSON.stringify(value);
  if (type === 'bigint') return JSON.stringify(value.toString());
  if (type === 'undefined') return '"__undefined"';
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (value && typeof value.toJSON === 'function') {
    return stableStringify(value.toJSON());
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
};

const buildFingerprint = (req) => {
  const headerKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  const method = req.method?.toUpperCase() || 'GET';
  const url = req.originalUrl || req.url || '';
  if (headerKey) {
    return `${method}:${url}:${headerKey}`;
  }

  const bodyPayload = req.body && Object.keys(req.body).length ? stableStringify(req.body) : '';
  const token = req.headers['authorization'] || '';
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
  const raw = `${method}:${url}:${token}:${ip}:${bodyPayload}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
};

export const idempotencyGuard = (req, res, next) => {
  scheduleCleanup();

  const method = req.method?.toUpperCase() || 'GET';
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  // Allow explicit opt-out for specific routes if needed
  if (req.headers['x-disable-idempotency'] === 'true') {
    return next();
  }

  const url = req.originalUrl || req.url || '';
  if (url.startsWith('/api/auth')) {
    return next();
  }

  let fingerprint;
  try {
    fingerprint = buildFingerprint(req);
  } catch (err) {
    return next(err);
  }

  const now = Date.now();
  const existing = submissionCache.get(fingerprint);
  if (existing && existing.expiresAt > now) {
    return res.status(409).json({
      error: 'Duplicate submission detected. Please wait a moment before retrying.',
      idempotency: 'conflict',
    });
  }

  submissionCache.set(fingerprint, { expiresAt: now + DEFAULT_TTL_MS, statusCode: null });

  res.on('finish', () => {
    const entry = submissionCache.get(fingerprint);
    if (!entry) return;
    entry.statusCode = res.statusCode;
    if (res.statusCode >= 400) {
      submissionCache.delete(fingerprint);
    }
  });

  res.on('close', () => {
    const entry = submissionCache.get(fingerprint);
    if (!entry) return;
    if (res.writableEnded && res.statusCode < 400) {
      entry.expiresAt = Date.now() + DEFAULT_TTL_MS;
    } else {
      submissionCache.delete(fingerprint);
    }
  });

  return next();
};
