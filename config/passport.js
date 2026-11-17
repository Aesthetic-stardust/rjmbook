import dotenv from "dotenv";
dotenv.config();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/index.js";

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email    = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const name     = profile.displayName || profile.name?.givenName || "Guest";

          if (!email) {
            return done(null, false, { message: "No email associated with this Google account." });
          }

          // 1. Already linked by googleId → just return the user
          let user = await User.findOne({ where: { googleId } });
          if (user) return done(null, user);

          // 2. Email exists but no googleId yet → link the account
          user = await User.findOne({ where: { email } });
          if (user) {
            await user.update({ googleId });
            return done(null, user);
          }

          // 3. Brand-new user → create a guest account (role: "user", no password)
          user = await User.create({ name, email, googleId, role: "user" });
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.log("⚠️ Google OAuth credentials not set in .env — Google login is disabled.");
}

// Store only the user id in the session
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
