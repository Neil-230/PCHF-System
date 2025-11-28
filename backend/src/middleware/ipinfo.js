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
    if (parts.length) {
      const firstPublic = parts.find((candidate) => !isPrivateIp(candidate));
      return firstPublic || parts[0];
    }
  }
  const direct = stripIpv6Prefix(req.headers['x-real-ip'] || req.ip || req.connection?.remoteAddress || '');
  return direct;
};

export async function ipinfoEnricher(req, _res, next) {
  try {
    const token = process.env.IPINFO_TOKEN;
    const clientIp = getClientIp(req);
    if (!clientIp) {
      return next();
    }

    const clientIsPrivate = isPrivateIp(clientIp);
    const lookupIp = clientIsPrivate ? '' : clientIp;
    const now = Date.now();
    const cacheKey = lookupIp || 'self';
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      const resolved = {
        ...cached.data,
        ip: clientIsPrivate ? cached.data.publicIp : clientIp,
        clientIp,
      };
      req.ipinfo = resolved;
      return next();
    }

    const resp = await axios.get(`https://ipinfo.io/${lookupIp ? encodeURIComponent(lookupIp) : ''}`, { params: token ? { token } : undefined });
    if (resp && resp.status === 200) {
      const d = resp.data || {};
      const geoData = {
        publicIp: d.ip || lookupIp || clientIp,
        city: d.city,
        region: d.region,
        country: d.country,
        loc: d.loc,
        org: d.org,
        timezone: d.timezone,
        privacy: d.privacy,
      };
      cache.set(cacheKey, { data: geoData, ts: now });
      req.ipinfo = {
        ...geoData,
        ip: clientIsPrivate ? geoData.publicIp : clientIp,
        clientIp,
      };
    }

    return next();
  } catch {
    // swallow errors to avoid blocking requests
    return next();
  }
}
