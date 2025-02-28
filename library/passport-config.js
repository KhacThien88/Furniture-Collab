const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../app/users/models/userModel');
require('dotenv').config({ path: '.env.google' });
module.exports = (passport) => {
  // local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // Tìm người dùng bằng email
          const user = await User.findOne({ email });
          if (!user) {
            return done(null, false, { message: 'Email không tồn tại' });
          }

          if (user.isBanned) {
            return done(null, false, {
              message:
                'Tài khoản đã bị khóa do một số lỗi gì đó. Vui lòng liên hệ admin để mở khóa.',
            });
          }

          // So sánh mật khẩu
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Mật khẩu không đúng' });
          }

          // Xác thực thành công
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // google oauth
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.NODE_ENV === 'production'
            ? `${process.env.DOMAIN_HOST}/auth/google/callback`
            : `${process.env.DOMAIN}/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if the user already exists
          const existingUser = await User.findOne({ googleId: profile.id });

          if (existingUser) {
            return done(null, existingUser); // User exists, proceed to login
          }

          // Create a new user if not exists
          const newUser = await User.create({
            googleId: profile.id,
            email: profile.emails?.[0]?.value || null,
            username: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value || null,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            isActive: true, // Auto-activate Google accounts
          });

          return done(null, newUser);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
