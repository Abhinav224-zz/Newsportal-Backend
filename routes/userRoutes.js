const express = require("express");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

router.get("/me", auth, async (req, res) => {
  res.json(req.user);
});

router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to change password", error: error.message });
  }
});

module.exports = router;
