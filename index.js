/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import session from "express-session";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { sequelize } from "./models/db.js";
import { Notification, Booking, Guest } from "./models/index.js";
import connectSessionSequelize from "connect-session-sequelize";
import { initCronJobs } from "./jobs/cronJobs.js";
import passport from "./config/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Nginx) for secure cookies and protocol detection
app.set("trust proxy", 1);

// ── Persistent session store (survives server restarts) ──
const SequelizeStore = connectSessionSequelize(session.Store);
const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: "Sessions",
  checkExpirationInterval: 15 * 60 * 1000, // clean up expired sessions every 15 min
  expiration: 8 * 60 * 60 * 1000           // 8 hours
});

// Initialize database connection
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("✅ Connected to narubook database and synced schema!");
    // Create the Sessions table if it doesn't exist
    await sessionStore.sync();
    console.log("✅ Session store synced!");
    
    // Start background jobs
    initCronJobs();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Security headers (helmet) ──
app.use(helmet({
  contentSecurityPolicy: false,     // disabled — app uses inline scripts/handlers throughout
  crossOriginEmbedderPolicy: false  // allow images to load normally
}));

// ── Rate limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip static assets — they shouldn't count toward the limit
    return /\.(js|css|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|map)$/i.test(req.path)
      || req.path.includes('/images')
      || req.path.startsWith('/reports');
  }
});

app.use(generalLimiter);

app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.static(path.join(process.cwd(), "imgs")));
app.use("/reports", express.static(path.join(process.cwd(), "reports")));

app.use(session({
  secret: process.env.SESSION_SECRET || "xianfire-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,                              // prevent JS access to cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',                             // 'lax' allows OAuth redirects (strict blocks them)
    maxAge: 8 * 60 * 60 * 1000                  // 8 hours
  }
}));

// ── Passport (Google OAuth) ──
app.use(passport.initialize());

// Middleware to pass session data and current page to all views
app.use(async (req, res, next) => {
  res.locals.sessionUserId = req.session.userId || null;
  res.locals.sessionUserName = req.session.userName || null;
  res.locals.sessionRole = req.session.role || null;
  res.locals.hasBookingUpdates = false;

  // Derive currentPage from the request path for active nav highlighting
  const p = req.path;
  if (p === '/')                          res.locals.currentPage = 'home';
  else if (p.startsWith('/rooms'))        res.locals.currentPage = 'rooms';
  else if (p.startsWith('/cottages'))     res.locals.currentPage = 'cottages';
  else if (p.startsWith('/bookings'))     res.locals.currentPage = 'bookings';
  else if (p.startsWith('/admin') && p === '/admin') res.locals.currentPage = 'admin';
  else if (p.startsWith('/dashboard'))    res.locals.currentPage = 'analytics';
  else if (p.startsWith('/admin/rooms'))  res.locals.currentPage = 'admin-rooms';
  else if (p.startsWith('/admin/cottages')) res.locals.currentPage = 'admin-cottages';
  else if (p.startsWith('/admin/reservations')) res.locals.currentPage = 'admin-reservations';
  else if (p.startsWith('/admin/audit-logs'))   res.locals.currentPage = 'audit-logs';
  else if (p.startsWith('/admin/session-logs')) res.locals.currentPage = 'session-logs';
  else if (p.startsWith('/guests'))       res.locals.currentPage = 'guests';
  else if (p.startsWith('/account'))      res.locals.currentPage = 'account';
  else                                    res.locals.currentPage = '';

  // Check for unread booking notifications for the logged-in guest
  if (req.session.userId && req.session.role !== 'admin' && req.session.role !== 'staff') {
    try {
      const unreadCount = await Notification.count({
        where: { isRead: false },
        include: [{
          model: Booking,
          required: true,
          include: [{
            model: Guest,
            required: true,
            where: { userId: req.session.userId }
          }]
        }]
      });
      res.locals.hasBookingUpdates = unreadCount > 0;
    } catch (err) {
      // Non-critical — silently ignore so the page still loads
      res.locals.hasBookingUpdates = false;
    }
  }

  next();
});

// Register Handlebars helpers
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

hbs.registerHelper('or', function(a, b) {
  return a || b;
});

hbs.registerHelper('add', function(a, b) {
  return a + b;
});

hbs.registerHelper('divide', function(a, b) {
  return b !== 0 ? (a / b).toFixed(2) : 0;
});

hbs.registerHelper('multiply', function(a, b) {
  return a * b;
});

hbs.registerHelper('gt', function(a, b) {
  return a > b;
});

hbs.registerHelper('subtract', function(a, b) {
  return (parseFloat(a) - parseFloat(b)).toFixed(2);
});

hbs.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

hbs.registerHelper('json', function(obj) {
  return JSON.stringify(obj);
});

hbs.registerHelper('stars', function(rating) {
  const r = parseInt(rating) || 0;
  return '★'.repeat(Math.min(r, 5)) + '☆'.repeat(Math.max(5 - r, 0));
});

app.engine("xian", async (filePath, options, callback) => {
  try {
    const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, 'views');

    // Read the template fresh each time (no caching)
    const templateStr = fs.readFileSync(filePath, 'utf8');
    const compiled = hbs.handlebars.compile(templateStr);
    const html = compiled(options);

    hbs.partialsDir = originalPartialsDir;
    callback(null, html);
  } catch (err) {
    callback(err);
  }
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");
// Cache compiled templates in production for performance; disable in dev so edits are picked up without a restart
if (process.env.NODE_ENV === "production") {
  app.enable("view cache");
} else {
  app.disable("view cache");
}
const partialsDir = path.join(__dirname, "views/partials");
fs.readdir(partialsDir, (err, files) => {
  if (err) {
    console.error("❌ Could not read partials directory:", err);
    return;
  }

   files
    .filter(file => file.endsWith('.xian'))
    .forEach(file => {
      const partialName = file.replace('.xian', ''); 
      const fullPath = path.join(partialsDir, file);

      fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
          return;
        }
        hbs.registerPartial(partialName, content);
        
      });
    });
});

app.use("/", router);

export default app;

if (!process.env.ELECTRON) {
  // Global error handlers
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Initialize database and start server
  await initializeDatabase();
  app.listen(PORT, () => console.log(`🔥 XianFire running at http://localhost:${PORT}`));
}
