import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Facebook from 'passport-facebook';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../database/mongodb.js';
const FacebookStrategy = Facebook.Strategy;

// Only setup Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await User.findOne({ googleId: profile.id });
          if (user) {
            return done(null, user);
          }
          // No auto-create: pass profile back so frontend can complete signup with role
          const minimalProfile = {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
          };
          return done(null, false, { profile: minimalProfile });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth credentials not configured. Google login will be disabled.');
}

if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'displayName', 'emails', 'photos'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await User.findOne({ facebookId: profile.id });
          if (user) {
            return done(null, user);
          }
          const minimalProfile = {
            facebookId: profile.id,
            name: profile.displayName,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
          };
          return done(null, false, { profile: minimalProfile });
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('Facebook OAuth credentials not configured. Facebook login will be disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findOne({ id });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
