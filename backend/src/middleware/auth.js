import jwt from 'jsonwebtoken';
import { User } from '../database/mongodb.js';

export const verifyToken = async (req, res, next) => {
  // Check Authorization header first, fallback to httpOnly cookie if present
  let token = req.headers.authorization?.split(' ')[1];
  
  // If no Authorization header, check for token in httpOnly cookie
  if (!token && req.cookies?.authToken) {
    token = req.cookies.authToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbUser = await User.findOne({ id: decoded.id, isArchived: false });
    if (!dbUser) {
      return res.status(401).json({ error: 'Account not found or archived' });
    }
    req.authUser = dbUser;
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      permissionOverrides: dbUser.permissionOverrides || [],
    };
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
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });

    const data = await response.json();

    if (!data.success || data.score < 0.5) {
      return res.status(400).json({ error: 'reCAPTCHA verification failed' });
    }

    next();
  } catch (err) {
    console.error('reCAPTCHA error:', err);
    return res.status(500).json({ error: 'reCAPTCHA verification error' });
  }
};
