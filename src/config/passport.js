import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";

// ==========================================
// 1. YouTube Connection Strategy
// ==========================================


passport.use(
  "youtube-connect",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_YOUTUBE_CALLBACK_URL || "http://localhost:5000/api/social/connect/youtube/callback",
      passReqToCallback: true, // Passes req so we can access logged-in user (req.user)
      proxy: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const connectionData = {
          accessToken,
          refreshToken, // Essential for background posting
          profile,
        };
        return done(null, connectionData);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ==========================================
// 2. Meta (Facebook & Instagram) Strategy
// ==========================================
passport.use(
  "meta-connect",
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.META_CALLBACK_URL || "http://localhost:5000/api/social/connect/meta/callback",
      profileFields: ["id", "displayName", "photos"],
      passReqToCallback: true,
      proxy: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const connectionData = {
          accessToken,
          profile,
        };
        return done(null, connectionData);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);