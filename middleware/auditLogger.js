/*
  RJMBook — Audit Logger Middleware
  ─────────────────────────────────────────────────────────────────────────────
  Usage (per-route):
    import { auditLog } from "../middleware/auditLogger.js";
    router.post("/staff", isAdmin, auditLog("STAFF_CREATED", "staff"), createStaff);

  Usage (programmatic, inside a controller):
    import { writeAuditLog } from "../middleware/auditLogger.js";
    await writeAuditLog(req, { action: "BOOKING_CONFIRMED", module: "bookings",
      description: `Booking #${id} confirmed`, targetType: "Booking", targetId: id });

  The module also exports recordSessionEvent() for use in the auth controller.
*/

import { AuditLog, SessionLog } from "../models/index.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
}

function getUserAgent(req) {
  return req.headers["user-agent"]?.slice(0, 512) || null;
}

// ─── programmatic write (called from controllers) ───────────────────────────

/**
 * Write a single audit log entry.
 * @param {import("express").Request} req
 * @param {{ action: string, module: string, description?: string,
 *            targetType?: string, targetId?: number,
 *            changes?: { before?: object, after?: object },
 *            status?: "success"|"failure"|"warning" }} opts
 */
export async function writeAuditLog(req, opts) {
  try {
    await AuditLog.create({
      userId:      req.session?.userId   ?? null,
      userName:    req.session?.userName ?? null,
      role:        req.session?.role     ?? null,
      action:      opts.action,
      module:      opts.module,
      description: opts.description     ?? null,
      targetType:  opts.targetType       ?? null,
      targetId:    opts.targetId         ?? null,
      changes:     opts.changes          ?? null,
      ipAddress:   getIp(req),
      userAgent:   getUserAgent(req),
      method:      req.method,
      path:        req.originalUrl?.slice(0, 512) ?? null,
      status:      opts.status           ?? "success"
    });
  } catch (err) {
    // Logging must never crash the main request
    console.error("[AuditLog] Failed to write log:", err.message);
  }
}

// ─── express middleware factory (wraps route handlers) ──────────────────────

/**
 * Returns an Express middleware that writes an audit entry when the
 * request completes successfully (2xx response).
 *
 * @param {string} action  e.g. "ROOM_UPDATED"
 * @param {string} module  e.g. "rooms"
 * @param {object} [extraOpts]  optional description / targetType overrides
 */
export function auditLog(action, module, extraOpts = {}) {
  return function auditLogMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);
    const originalRender = res.render.bind(res);

    function capture() {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        writeAuditLog(req, { action, module, ...extraOpts });
      }
    }

    res.json = function (body) {
      capture();
      return originalJson(body);
    };

    res.render = function (...args) {
      capture();
      return originalRender(...args);
    };

    next();
  };
}

// ─── session event recorder ──────────────────────────────────────────────────

/**
 * Record a session event (login, logout, login_failed, etc.).
 * Call this from authController after login/logout outcomes.
 *
 * @param {import("express").Request} req
 * @param {{ event: string, userId?: number, userName?: string,
 *            role?: string, email?: string,
 *            success?: boolean, failureReason?: string,
 *            duration?: number, loggedInAt?: Date }} opts
 */
export async function recordSessionEvent(req, opts) {
  try {
    await SessionLog.create({
      userId:        opts.userId        ?? req.session?.userId   ?? null,
      userName:      opts.userName      ?? req.session?.userName ?? null,
      role:          opts.role          ?? req.session?.role     ?? null,
      email:         opts.email         ?? null,
      event:         opts.event,
      ipAddress:     getIp(req),
      userAgent:     getUserAgent(req),
      sessionId:     req.session?.id    ?? null,
      duration:      opts.duration      ?? null,
      loggedInAt:    opts.loggedInAt    ?? null,
      success:       opts.success       ?? true,
      failureReason: opts.failureReason ?? null
    });
  } catch (err) {
    console.error("[SessionLog] Failed to write log:", err.message);
  }
}
