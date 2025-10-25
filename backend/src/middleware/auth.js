import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const verifyRecaptcha = async (req, res, next) => {
  const recaptchaToken = req.body.recaptchaToken;

  if (!recaptchaToken) {
    return res.status(400).json({ error: 'reCAPTCHA token is required' });
  }

  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret && process.env.NODE_ENV === 'development') {
      // In dev, if secret not set, skip to avoid blocking local testing
      console.warn('reCAPTCHA secret missing in development; skipping verification.');
      return next();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secret}&response=${recaptchaToken}`,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!data.success || (typeof data.score === 'number' && data.score < 0.5)) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed', details: data });
    }

    next();
  } catch (err) {
    console.error('reCAPTCHA error:', err);
    if (err && err.name === 'AbortError') {
      return res.status(500).json({ error: 'reCAPTCHA verification timeout' });
    }
    return res.status(500).json({ error: 'reCAPTCHA verification error' });
  }
};
