import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { UserModel } from "../models/user.model.js";

// ==========================================
// 1. Google Auth Strategy (Login / Signup)
// ==========================================
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/v1/auth/google/callback",
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const name = profile.displayName;
        const imageUrl = profile.photos?.[0]?.value;

        // Build query condition dynamically
        const query = [{ googleId }];
        if (email) query.push({ email });

        let user = await UserModel.findOne({ $or: query });

        if (!user) {
          user = await UserModel.create({
            name,
            email,
            googleId,
            imageUrl,
            isVerified: true,
          });
        } else if (!user.googleId) {
          user.googleId = googleId;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ==========================================
// 2. Facebook Auth Strategy (Login / Signup)
// ==========================================
passport.use(
  "facebook",
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || "http://localhost:5000/api/v1/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails", "photos"],
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const facebookId = profile.id;
        const name = profile.displayName;
        const imageUrl = profile.photos?.[0]?.value;

        const query = [{ facebookId }];
        if (email) query.push({ email });

        let user = await UserModel.findOne({ $or: query });

        if (!user) {
          user = await UserModel.create({
            name,
            email: email || `${facebookId}@facebook.com`,
            facebookId,
            imageUrl,
            isVerified: true,
          });
        } else if (!user.facebookId) {
          user.facebookId = facebookId;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ==========================================
// 3. YouTube Connection Strategy (Publishing)
// ==========================================
passport.use(
  "youtube-connect",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_YOUTUBE_CALLBACK_URL || "http://localhost:5000/api/social/connect/youtube/callback",
      passReqToCallback: true,
      proxy: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const connectionData = {
          accessToken,
          refreshToken,
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
// 4. Meta Connection Strategy (Publishing)
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