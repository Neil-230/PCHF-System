import axios from 'axios';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map(); // ip -> { data, ts }

const stripIpv6Prefix = (ip) => (ip && ip.startsWith('::ffff:') ? ip.slice(7) : ip);

const isPrivateIp = (ip) => {
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('172.')) {
    const second = Number(ip.split('.')[1]);
    if (!Number.isNaN(second) && second >= 16 && second <= 31) return true;
  }
  return false;
};

const getClientIp = (req) => {
  const xff = (req.headers['x-forwarded-for'] || '').toString();
  if (xff) {
    const parts = xff.split(',').map((s) => stripIpv6Prefix(s.trim())).filter(Boolean);
    if (parts.length) return parts[0];
  }
  return stripIpv6Prefix(req.ip || req.connection?.remoteAddress || '');
};

export async function ipinfoEnricher(req, _res, next) {
  try {
    const token = process.env.IPINFO_TOKEN;
    if (!token) {
      return next();
    }

    const ip = getClientIp(req);
    if (!ip || isPrivateIp(ip)) {
      return next();
    }

    const now = Date.now();
    const cached = cache.get(ip);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      req.ipinfo = cached.data;
      return next();
    }

    const resp = await axios.get(`https://ipinfo.io/${encodeURIComponent(ip)}`, { params: { token } });
    if (resp && resp.status === 200) {
      const d = resp.data || {};
      const normalized = {
        ip: d.ip,
        city: d.city,
        region: d.region,
        country: d.country,
        loc: d.loc, // "lat,lon"
        org: d.org, // ASN + name
        timezone: d.timezone,
        privacy: d.privacy, // may be undefined on free tier
      };
      cache.set(ip, { data: normalized, ts: now });
      req.ipinfo = normalized;
    }

    return next();
  } catch {
    // swallow errors to avoid blocking requests
    return next();
  }
}
