// controllers/userController.js
const passport = require("passport");
const userService = require("../services/userService"); // Import user service
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const apiShoppingCartController = require("../../api/shoppingCart/apiShoppingCartController");
const Redis = require("ioredis");
// const redis = new Redis(); //localenv
// const redis = new Redis({ host: "redisdb" });
const redis = new Redis("redis://54.255.49.4:6379");
// Hàm kiểm tra độ phức tạp mật khẩu

const isValidPassword = (password) => {
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
};
exports.signup = async (req, res) => {
  const { username, email, password, passwordConfirm } = req.body;

  try {
    if (password !== passwordConfirm) {
      return res.render("auth/signup", {
        error: "Mật khẩu xác nhận không trùng khớp",
      });
    }

    const userExists = await userService.findUserByEmail(email);
    if (userExists) {
      return res.render("auth/signup", { error: "Email đã được sử dụng" });
    }

    // Kiểm tra độ phức tạp mật khẩu bằng hàm phụ
    if (!isValidPassword(password)) {
      return res.render("auth/signup", {
        error:
          "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
      });
    }

    // Tạo activation token
    const activationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(activationToken)
      .digest("hex");

    // Lưu thông tin người dùng vào Redis
    const userData = JSON.stringify({
      username,
      email,
      password,
    });

    await redis.setex(hashedToken, 600, userData); // Lưu trong 10 phút

    // Gửi email kích hoạt
    await userService.sendActivationEmail(email, activationToken, req);

    res.render("auth/signup", {
      message:
        "Email kích hoạt đã được gửi! Vui lòng đăng nhập email của bạn để kích thoạt tài khoản",
    });
  } catch (err) {
    console.error(err);
    res.render("auth/signup", { error: "Có lỗi xảy ra, vui lòng thử lại!" });
  }
};

// Xử lý đăng nhập
exports.login = (req, res, next) => {
  const oldSessionId = req.sessionID; // Lưu sessionId cũ
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Error during authentication:", err);
      return res.redirect("/login");
    }
    if (!user) {
      console.error("Authentication failed:", info.message);
      return res.render("auth/login", { error: info.message }); // Truyền lỗi vào view
    }

    req.logIn(user, async (err) => {
      if (err) {
        console.error("Error logging in:", err);
        return res.redirect("/login");
      }
      res.redirect("/");
      console.log("hiiii");
      await apiShoppingCartController.syncCartAfterLogin(
        req,
        res,
        oldSessionId
      );
    });
  })(req, res, next);
};

// Xử lý đăng xuất
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.redirect("/");
    }
    res.redirect("/login");
  });
};

exports.activateAccount = async (req, res) => {
  const { token } = req.params;

  try {
    // Hash lại token từ URL
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm thông tin người dùng trong Redis bằng token
    const userData = await redis.get(hashedToken);

    if (!userData) {
      return res.status(400).json({
        success: false,
        error: "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn!",
      });
    }

    // Parse dữ liệu người dùng từ Redis
    const user = JSON.parse(userData);

    // Lưu người dùng vào database
    const savedUser = await userService.createUser({
      username: user.username,
      email: user.email,
      password: user.password, // Đã được hash trước khi lưu vào Redis
    });

    // Xóa token khỏi Redis sau khi kích hoạt thành công
    await redis.del(hashedToken);

    return res.status(200).json({
      success: true,
      message: "Tài khoản của bạn đã được kích hoạt thành công!",
      user: {
        username: savedUser.username,
        email: savedUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Có lỗi xảy ra, vui lòng thử lại!",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.render("auth/forgot-password", {
        error: "Email không tồn tại!",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Lưu token vào Redis với TTL (10 phút)
    const userData = JSON.stringify({ userId: user.id, email: user.email });
    await redis.setex(`resetToken:${hashedToken}`, 600, userData); // 600 giây = 10 phút

    // Send email with reset link
    await userService.sendPasswordResetEmail(email, resetToken, req);

    res.render("auth/forgot-password", {
      message: "Email đặt lại mật khẩu đã được gửi!",
    });
  } catch (err) {
    console.error(err);
    res.render("auth/forgot-password", {
      error: "Đã xảy ra lỗi. Vui lòng thử lại!",
    });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Kiểm tra token trong Redis
    const userData = await redis.get(`resetToken:${hashedToken}`);
    if (!userData) {
      return res.render("auth/reset-password", {
        error: "Liên kết không hợp lệ hoặc đã hết hạn!",
      });
    }

    const { userId } = JSON.parse(userData);

    if (password !== passwordConfirm) {
      return res.render("auth/reset-password", {
        token,
        error: "Mật khẩu không khớp!",
      });
    }

    // Tìm người dùng và cập nhật mật khẩu
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.render("auth/reset-password", {
        error: "Người dùng không tồn tại!",
      });
    }

    user.password = password;
    await user.save();

    // Xóa token khỏi Redis
    await redis.del(`resetToken:${hashedToken}`);

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.render("auth/reset-password", {
      token,
      error: "Đã xảy ra lỗi. Vui lòng thử lại!",
    });
  }
};

// Edit profile
exports.editProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      username,
      firstName,
      lastName,
      phoneNumber,
      address,
      city,
      province,
    } = req.body;

    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).render("auth/profile", {
        editProfile_message: "User not found",
        success: false,
        user: req.body,
      });
    }

    let avatarUrl = null;
    if (req.file) {
      try {
        avatarUrl = await userService.uploadAvatar(userId, req.file); // Wait for avatar upload
      } catch (err) {
        return res.status(400).render("auth/profile", {
          editProfile_message: err.message,
          success: false,
          user: req.body,
        });
      }
    }

    const updatedUser = await userService.updateUser(userId, {
      username,
      firstName,
      lastName,
      phoneNumber,
      address,
      city,
      province,
      ...(avatarUrl && { avatarUrl }), // Add avatar URL if it's set
    });

    res.status(200).render("auth/profile", {
      editProfile_message: "Profile updated successfully",
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).render("auth/profile", {
      editProfile_message: "Error updating profile",
      success: false,
      error: error.message,
      user: req.body,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // Kiểm tra mật khẩu mới và xác nhận mật khẩu
    if (newPassword !== confirmNewPassword) {
      return res.status(400).render("auth/profile", {
        changePassword_message: "New password and confirmation do not match",
        success: false,
      });
    }

    // Kiểm tra độ phức tạp mật khẩu bằng hàm phụ
    if (!isValidPassword(newPassword)) {
      return res.status(400).render("auth/profile", {
        changePassword_message:
          "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
        success: false,
      });
    }

    // Tìm người dùng
    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).render("auth/profile", {
        changePassword_message: "User not found",
        success: false,
      });
    }

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).render("auth/profile", {
        changePassword_message: "Current password is incorrect",
        success: false,
      });
    }

    // Cập nhật mật khẩu mới (được mã hóa ở userSchema)
    user.password = newPassword;
    await user.save();

    res.status(200).render("auth/profile", {
      changePassword_message: "Password changed successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).render("auth/profile", {
      changePassword_message: "Error changing password",
      success: false,
      error: error.message,
    });
  }
};
