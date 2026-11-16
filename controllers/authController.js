import bcrypt from "bcrypt";
import { User } from "../models/index.js";

// Simple Login Page
export async function simpleLoginPage(req, res) {
  res.render("auth/simple-login", { title: "Sign In - RJMBook" });
}

// Unified Login Handler
export async function simpleLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session with user's actual role from database
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;
    req.session.role = user.role;

    // Redirect based on role
    const redirect = user.role === "admin" ? "/admin" : user.role === "staff" ? "/staff" : "/";
    res.json({ success: true, message: "Login successful!", redirect });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

// Main Login Choice Page (deprecated but kept for reference)
export async function loginPage(req, res) {
  res.render("auth/login", { title: "RJMBook - Choose Login Portal" });
}

// Admin Login Page (deprecated)
export async function adminLoginPage(req, res) {
  res.render("auth/admin-login", { title: "Admin Login" });
}

// User Login Page (deprecated)
export async function userLoginPage(req, res) {
  res.render("auth/user-login", { title: "User Login" });
}

// Admin Login Handler (deprecated)
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is an admin
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin credentials required." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session for admin
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;
    req.session.role = user.role;

    res.json({ success: true, redirect: "/admin" });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

// User Login Handler (deprecated)
export async function userLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user has guest role
    if (user.role !== "user") {
      return res.status(403).json({ error: "Access denied. Guest account required." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session for user
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userName = user.name;
    req.session.role = user.role;

    res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.error("User login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

// Register Page
export async function registerPage(req, res) {
  res.render("auth/register", { title: "Create Account" });
}

// Register Handler
export async function register(req, res) {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    if (!name || !email || !password || !passwordConfirm) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with "user" role
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user"
    });

    res.json({ success: true, message: "Account created! Please login.", redirect: "/login" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
}

// Google OAuth Callback Handler
// Called by Passport after Google verifies the user.
// Populates the express-session keys that the rest of the app depends on.
export async function googleCallback(req, res) {
  try {
    const user = req.user; // set by passport.authenticate('google')

    if (!user) {
      console.error("Google OAuth callback: req.user is undefined");
      return res.redirect("/login?error=google_failed");
    }

    // Regenerate session to prevent session fixation, then write our session keys
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate error:", err);
        return res.redirect("/login?error=oauth_failed");
      }

      req.session.userId    = user.id;
      req.session.userEmail = user.email;
      req.session.userName  = user.name;
      req.session.role      = user.role;

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error after Google login:", saveErr);
          return res.redirect("/login?error=oauth_failed");
        }
        const redirect = user.role === "admin" ? "/admin" : user.role === "staff" ? "/staff" : "/";
        res.redirect(redirect);
      });
    });
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect("/login?error=oauth_failed");
  }
}

// Logout Handler
export async function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      // Check if it's an AJAX request
      const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
      if (isAjax) {
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      return res.redirect("/");
    }
    
    // Check if it's an AJAX request
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    if (isAjax) {
      res.json({ success: true, redirect: "/" });
    } else {
      // Direct navigation, redirect immediately
      res.redirect("/");
    }
  });
}
