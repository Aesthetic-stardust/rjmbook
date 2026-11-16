/*
  RJMBook — Account Controller
  Handles profile editing and password changes for all roles (user, staff, admin).
*/
import bcrypt from "bcrypt";
import { User, Guest } from "../models/index.js";

// ── GET /account ─────────────────────────────────────────────────────────────
export async function accountPage(req, res) {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.redirect("/login");

    res.render("account/settings", {
      title: "Account Settings | RJMBook",
      currentPage: "account",
      pageTitle: "Account Settings",
      pageDescription: "Manage your profile and password",
      accountName: user.name,
      accountEmail: user.email,
      accountRole: user.role,
    });
  } catch (err) {
    console.error("[accountPage]", err);
    res.status(500).send(err.message);
  }
}

// ── POST /account/profile ─────────────────────────────────────────────────────
export async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required." });
    }

    const trimmedName  = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    // If email changed, make sure it isn't taken by another account
    if (trimmedEmail !== user.email) {
      const existing = await User.findOne({ where: { email: trimmedEmail } });
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: "That email is already in use by another account." });
      }
    }

    const oldEmail = user.email;
    await user.update({ name: trimmedName, email: trimmedEmail });

    // Keep the linked Guest record in sync (if one exists)
    if (trimmedEmail !== oldEmail) {
      await Guest.update({ email: trimmedEmail }, { where: { userId: user.id } });
    }

    // Refresh session so the sidebar/nav reflects the new name immediately
    req.session.userName  = trimmedName;
    req.session.userEmail = trimmedEmail;

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("[updateProfile]", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
}

// ── POST /account/password ────────────────────────────────────────────────────
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match." });
    }

    const user = await User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // Prevent reusing the same password
    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ error: "New password must be different from your current password." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashed });

    res.json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    console.error("[changePassword]", err);
    res.status(500).json({ error: "Failed to change password." });
  }
}
