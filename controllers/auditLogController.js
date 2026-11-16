/*
  RJMBook — Audit & Session Log Controller
  Handles the admin pages for viewing audit logs and session logs.
*/
import { Op } from "sequelize";
import { AuditLog, SessionLog, User } from "../models/index.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function parsePage(query) {
  const p = parseInt(query.page, 10);
  return isNaN(p) || p < 1 ? 1 : p;
}

function buildDateWhere(from, to, field = "createdAt") {
  if (!from && !to) return {};
  const cond = {};
  if (from) cond[Op.gte] = new Date(from + "T00:00:00");
  if (to)   cond[Op.lte] = new Date(to   + "T23:59:59");
  return { [field]: cond };
}

// ─── Audit Logs ─────────────────────────────────────────────────────────────

export async function getAuditLogs(req, res) {
  try {
    const page     = parsePage(req.query);
    const offset   = (page - 1) * PAGE_SIZE;
    const { module, action, status, from, to, search } = req.query;

    // Build WHERE clause
    const where = {};
    if (module) where.module = module;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (status) where.status = status;
    Object.assign(where, buildDateWhere(from, to));
    if (search) {
      where[Op.or] = [
        { userName:    { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { targetType:  { [Op.like]: `%${search}%` } },
        { path:        { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit:  PAGE_SIZE,
      offset
    });

    const totalPages = Math.ceil(count / PAGE_SIZE);

    // Summary stats (no filters — always show overall counts)
    const [totalCount, successCount, failureCount, warningCount] = await Promise.all([
      AuditLog.count(),
      AuditLog.count({ where: { status: "success" } }),
      AuditLog.count({ where: { status: "failure" } }),
      AuditLog.count({ where: { status: "warning" } })
    ]);

    // Distinct module list for the filter dropdown
    const moduleRows = await AuditLog.findAll({
      attributes: [[AuditLog.sequelize.fn("DISTINCT", AuditLog.sequelize.col("module")), "module"]],
      raw: true
    });
    const modules = moduleRows.map(r => r.module).filter(Boolean).sort();

    // Recent unique actors
    const recentActors = await AuditLog.findAll({
      attributes: ["userName", "role"],
      group: ["userName", "role"],
      order: [[AuditLog.sequelize.fn("MAX", AuditLog.sequelize.col("createdAt")), "DESC"]],
      limit: 10,
      raw: true
    });

    res.render("admin/audit-logs", {
      title:       "Audit Logs | RJMBook",
      pageTitle:   "Audit Logs",
      pageDescription: "Track every admin and staff action in the system",
      currentPage: "audit-logs",
      logs:        rows.map(r => r.toJSON()),
      pagination: {
        page,
        totalPages,
        totalCount: count,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
      },
      stats: { totalCount, successCount, failureCount, warningCount },
      modules,
      recentActors,
      filters: { module: module || "", action: action || "", status: status || "", from: from || "", to: to || "", search: search || "" },
      sessionUserName: req.session.userName
    });
  } catch (err) {
    console.error("[getAuditLogs]", err);
    res.status(500).render("error", { message: "Failed to load audit logs", error: err.message });
  }
}

// ─── Session Logs ────────────────────────────────────────────────────────────

export async function getSessionLogs(req, res) {
  try {
    const page   = parsePage(req.query);
    const offset = (page - 1) * PAGE_SIZE;
    const { event, role, from, to, search } = req.query;

    const where = {};
    if (event) where.event = event;
    if (role)  where.role  = role;
    Object.assign(where, buildDateWhere(from, to));
    if (search) {
      where[Op.or] = [
        { userName: { [Op.like]: `%${search}%` } },
        { email:    { [Op.like]: `%${search}%` } },
        { ipAddress:{ [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await SessionLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit:  PAGE_SIZE,
      offset
    });

    const totalPages = Math.ceil(count / PAGE_SIZE);

    // Summary stats
    const [totalCount, loginCount, logoutCount, failedCount, expiredCount] = await Promise.all([
      SessionLog.count(),
      SessionLog.count({ where: { event: "login" } }),
      SessionLog.count({ where: { event: "logout" } }),
      SessionLog.count({ where: { event: "login_failed" } }),
      SessionLog.count({ where: { event: "session_expired" } })
    ]);

    // Active unique users in last 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersCount = await SessionLog.count({
      where: { event: "login", success: true, createdAt: { [Op.gte]: since24h } },
      distinct: true,
      col: "userId"
    });

    res.render("admin/session-logs", {
      title:       "Session Logs | RJMBook",
      pageTitle:   "Session Logs",
      pageDescription: "Monitor user login and logout activity",
      currentPage: "session-logs",
      logs:        rows.map(r => r.toJSON()),
      pagination: {
        page,
        totalPages,
        totalCount: count,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
      },
      stats: { totalCount, loginCount, logoutCount, failedCount, expiredCount, activeUsersCount },
      filters: { event: event || "", role: role || "", from: from || "", to: to || "", search: search || "" },
      sessionUserName: req.session.userName
    });
  } catch (err) {
    console.error("[getSessionLogs]", err);
    res.status(500).render("error", { message: "Failed to load session logs", error: err.message });
  }
}
