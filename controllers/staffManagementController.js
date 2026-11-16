/*
  RJMBook — Staff Management Controller
  Admin-only: create, list, edit, delete staff accounts.
*/
import bcrypt from "bcrypt";
import { User } from "../models/index.js";

// ── List all staff ────────────────────────────────────────────────────────────
export async function listStaff(req, res) {
  try {
    const staffList = await User.findAll({
      where: { role: "staff" },
      attributes: ["id", "name", "email", "role", "createdAt"],
      order: [["createdAt", "DESC"]]
    });

    res.render("admin/staff", {
      title: "Manage Staff | Naruwan Resort",
      staffList: staffList.map(s => s.toJSON())
    });
  } catch (err) {
    console.error("[listStaff]", err);
    res.status(500).send(err.message);
  }
}

// ── Create staff account ──────────────────────────────────────────────────────
export async function createStaff(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: "Email is already registered." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const staff  = await User.create({ name, email, password: hashed, role: "staff" });

    res.json({ success: true, message: `Staff account for ${staff.name} created.`, staff: { id: staff.id, name: staff.name, email: staff.email } });
  } catch (err) {
    console.error("[createStaff]", err);
    // Surface a friendly message for common DB errors
    let errorMsg = err.message;
    if (err.name === 'SequelizeUniqueConstraintError') {
      errorMsg = "Email is already registered.";
    } else if (err.name === 'SequelizeValidationError') {
      errorMsg = err.errors.map(e => e.message).join(', ');
    }
    res.status(500).json({ success: false, error: errorMsg });
  }
}

// ── Update staff account ──────────────────────────────────────────────────────
export async function updateStaff(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const staff = await User.findOne({ where: { id, role: "staff" } });
    if (!staff) {
      return res.status(404).json({ success: false, error: "Staff account not found." });
    }

    // Check email uniqueness if changed
    if (email && email !== staff.email) {
      const taken = await User.findOne({ where: { email } });
      if (taken) {
        return res.status(409).json({ success: false, error: "Email is already in use." });
      }
    }

    const updates = {};
    if (name)  updates.name  = name;
    if (email) updates.email = email;
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
      }
      updates.password = await bcrypt.hash(password, 10);
    }

    await staff.update(updates);
    res.json({ success: true, message: "Staff account updated." });
  } catch (err) {
    console.error("[updateStaff]", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ── Delete staff account ──────────────────────────────────────────────────────
export async function deleteStaff(req, res) {
  try {
    const { id } = req.params;

    const staff = await User.findOne({ where: { id, role: "staff" } });
    if (!staff) {
      return res.status(404).json({ success: false, error: "Staff account not found." });
    }

    await staff.destroy();
    res.json({ success: true, message: `Staff account for ${staff.name} deleted.` });
  } catch (err) {
    console.error("[deleteStaff]", err);
    res.status(500).json({ success: false, error: err.message });
  }
}
