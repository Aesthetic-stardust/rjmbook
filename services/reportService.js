/*
  RJMBook Report Service
  Generates PDF reports for analytics, bookings, guests, revenue, and more
*/

import puppeteer from "puppeteer";
import { Booking, Room, Service, ServiceBooking, RoomType, Guest, OccupancySnapshot } from "../models/index.js";
import { Op, Sequelize, fn, col, literal } from "sequelize";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Shared PDF page CSS — clean, professional A4 layout
 */
const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    padding: 40px 44px;
    line-height: 1.6;
  }

  /* ── Header ── */
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #0f172a;
    padding-bottom: 18px;
    margin-bottom: 32px;
  }
  .report-header h1 {
    font-size: 26px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.4px;
  }
  .report-header .subtitle {
    font-size: 13px;
    color: #6b7280;
    margin-top: 4px;
  }
  .report-header .meta {
    text-align: right;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.8;
  }
  .report-header .meta strong { color: #374151; }

  /* ── Section ── */
  .section { margin: 28px 0; page-break-inside: avoid; }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }

  /* ── Stat cards ── */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
    margin-bottom: 4px;
  }
  .stats-3 { grid-template-columns: repeat(3, 1fr); }
  .stats-2 { grid-template-columns: repeat(2, 1fr); }
  .stat {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    border-top: 3px solid #0f172a;
  }
  .stat.green  { border-top-color: #059669; }
  .stat.red    { border-top-color: #dc2626; }
  .stat.amber  { border-top-color: #d97706; }
  .stat.blue   { border-top-color: #2563eb; }
  .stat.purple { border-top-color: #7c3aed; }
  .stat-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #6b7280;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 6px;
  }
  .stat-sub {
    font-size: 11px;
    color: #9ca3af;
    margin-top: 2px;
  }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th {
    background: #0f172a;
    color: #fff;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  thead th:last-child { text-align: right; }
  tbody td {
    padding: 9px 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  tbody td:last-child { text-align: right; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:last-child td { border-bottom: none; }

  /* ── Status badges ── */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .badge-confirmed   { background:#dcfce7; color:#166534; }
  .badge-pending     { background:#fef9c3; color:#854d0e; }
  .badge-checked_in  { background:#dbeafe; color:#1e40af; }
  .badge-checked_out { background:#ede9fe; color:#5b21b6; }
  .badge-cancelled   { background:#fee2e2; color:#991b1b; }
  .badge-paid        { background:#dcfce7; color:#166534; }
  .badge-unpaid      { background:#fee2e2; color:#991b1b; }
  .badge-refunded    { background:#fef9c3; color:#854d0e; }

  /* ── Mini bar ── */
  .bar-wrap { background:#e5e7eb; border-radius:4px; height:8px; width:100%; }
  .bar-fill  { background:#0f172a; border-radius:4px; height:8px; }

  /* ── Two-column layout ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  /* ── Footer ── */
  .report-footer {
    margin-top: 48px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #9ca3af;
  }
`;

export class ReportService {
  constructor() {
    this.reportsDir = path.join(__dirname, "../reports");
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(amount) || 0);
  }

  formatDate(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric", month: "long", day: "numeric"
    });
  }

  formatDateShort(date) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric"
    });
  }

  /** Wrap HTML body in full document with shared CSS */
  wrapHtml(title, accentColor, body) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${BASE_CSS}
    .stat { border-top-color: ${accentColor}; }
  </style>
</head>
<body>${body}</body>
</html>`;
  }

  /* ─────────────────────────────────────────────
     BOOKING REPORT
  ───────────────────────────────────────────── */
  async generateBookingReport(startDate = null, endDate = null) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end   = endDate   ? new Date(endDate)   : new Date();

      const bookings = await Booking.findAll({
        where: { checkIn: { [Op.between]: [start, end] } },
        include: [
          { model: Guest, attributes: ["firstName", "lastName", "email", "phone"], required: false },
          {
            model: Room, attributes: ["roomNumber"], required: false,
            include: [{ model: RoomType, attributes: ["name", "category"], required: false }]
          }
        ],
        order: [["checkIn", "DESC"]],
        limit: 500,
        raw: false,
        subQuery: false
      });

      // ── Aggregates ──
      const total          = bookings.length;
      const confirmed      = bookings.filter(b => b.status === "confirmed").length;
      const checkedIn      = bookings.filter(b => b.status === "checked_in").length;
      const checkedOut     = bookings.filter(b => b.status === "checked_out").length;
      const cancelled      = bookings.filter(b => b.status === "cancelled").length;
      const pending        = bookings.filter(b => b.status === "pending").length;
      const paid           = bookings.filter(b => b.paymentStatus === "paid").length;
      const unpaid         = bookings.filter(b => b.paymentStatus === "unpaid").length;
      const refunded       = bookings.filter(b => b.paymentStatus === "refunded").length;
      const totalRevenue   = bookings
        .filter(b => ["confirmed","checked_in","checked_out"].includes(b.status))
        .reduce((s, b) => s + (parseFloat(b.totalAmount) || 0), 0);

      // ── Room-type breakdown ──
      const roomTypeMap = {};
      bookings.forEach(b => {
        const key = b.Room?.RoomType?.name || "Unassigned";
        if (!roomTypeMap[key]) roomTypeMap[key] = { count: 0, revenue: 0 };
        roomTypeMap[key].count++;
        roomTypeMap[key].revenue += parseFloat(b.totalAmount) || 0;
      });
      const roomTypeRows = Object.entries(roomTypeMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, d]) => `
          <tr>
            <td>${name}</td>
            <td>${d.count}</td>
            <td>${((d.count / total) * 100).toFixed(1)}%</td>
            <td>${this.formatCurrency(d.revenue)}</td>
          </tr>`).join("");

      // ── Cancellation reasons ──
      const cancelReasons = bookings
        .filter(b => b.status === "cancelled" && b.cancellationReason)
        .slice(0, 10)
        .map(b => `<tr>
            <td>${b.Guest ? `${b.Guest.firstName} ${b.Guest.lastName}` : "N/A"}</td>
            <td>${this.formatDateShort(b.checkIn)}</td>
            <td>${b.cancellationReason || "—"}</td>
          </tr>`).join("");

      // ── Main booking rows ──
      const bookingRows = bookings.slice(0, 100).map((b, i) => `
        <tr>
          <td style="color:#6b7280;font-size:11px;">${b.id}</td>
          <td>${b.Guest ? `${b.Guest.firstName} ${b.Guest.lastName}` : "Walk-in"}</td>
          <td>${b.Guest?.email || "—"}</td>
          <td>${b.Room?.roomNumber || "N/A"}</td>
          <td>${b.Room?.RoomType?.name || "N/A"}</td>
          <td>${this.formatDateShort(b.checkIn)}</td>
          <td>${this.formatDateShort(b.checkOut)}</td>
          <td>${b.adults + (b.children || 0)} pax</td>
          <td style="text-align:right;">${this.formatCurrency(b.totalAmount)}</td>
          <td style="text-align:center;"><span class="badge badge-${b.status}">${b.status.replace("_"," ")}</span></td>
          <td style="text-align:center;"><span class="badge badge-${b.paymentStatus}">${b.paymentStatus}</span></td>
        </tr>`).join("");

      const body = `
        <div class="report-header">
          <div>
            <h1>Booking Report</h1>
            <div class="subtitle">All reservations from ${this.formatDateShort(start)} to ${this.formatDateShort(end)}</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${this.formatDate(new Date())}</div>
            <div><strong>Total Records:</strong> ${total}</div>
            <div><strong>RJMBook Resort</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Booking Summary</div>
          <div class="stats">
            <div class="stat"><div class="stat-label">Total Bookings</div><div class="stat-value">${total}</div></div>
            <div class="stat green"><div class="stat-label">Confirmed</div><div class="stat-value">${confirmed + checkedIn + checkedOut}</div><div class="stat-sub">confirmed + active + checked out</div></div>
            <div class="stat red"><div class="stat-label">Cancelled</div><div class="stat-value">${cancelled}</div><div class="stat-sub">${total > 0 ? ((cancelled/total)*100).toFixed(1) : 0}% cancellation rate</div></div>
            <div class="stat amber"><div class="stat-label">Pending</div><div class="stat-value">${pending}</div><div class="stat-sub">awaiting confirmation</div></div>
          </div>
        </div>

        <div class="two-col">
          <div class="section">
            <div class="section-title">Payment Status</div>
            <div class="stats stats-3" style="margin-top:0;">
              <div class="stat green"><div class="stat-label">Paid</div><div class="stat-value">${paid}</div></div>
              <div class="stat red"><div class="stat-label">Unpaid</div><div class="stat-value">${unpaid}</div></div>
              <div class="stat amber"><div class="stat-label">Refunded</div><div class="stat-value">${refunded}</div></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Revenue from Active Bookings</div>
            <div class="stats stats-2" style="margin-top:0;">
              <div class="stat blue"><div class="stat-label">Total Revenue</div><div class="stat-value" style="font-size:16px;">${this.formatCurrency(totalRevenue)}</div></div>
              <div class="stat purple"><div class="stat-label">Avg per Booking</div><div class="stat-value" style="font-size:16px;">${this.formatCurrency(total > 0 ? totalRevenue / total : 0)}</div></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Bookings by Room / Cottage Type</div>
          <table>
            <thead>
              <tr><th>Room / Cottage Type</th><th>Bookings</th><th>Share</th><th>Revenue</th></tr>
            </thead>
            <tbody>${roomTypeRows}</tbody>
          </table>
        </div>

        ${cancelled > 0 && cancelReasons ? `
        <div class="section">
          <div class="section-title">Cancellation Log (latest ${Math.min(cancelled,10)})</div>
          <table>
            <thead><tr><th>Guest</th><th>Check-in Date</th><th>Reason</th></tr></thead>
            <tbody>${cancelReasons}</tbody>
          </table>
        </div>` : ""}

        <div class="section">
          <div class="section-title">Booking Details (latest 100)</div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Guest</th><th>Email</th><th>Room</th><th>Type</th>
                <th>Check-in</th><th>Check-out</th><th>Guests</th><th>Amount</th>
                <th style="text-align:center;">Status</th><th style="text-align:center;">Payment</th>
              </tr>
            </thead>
            <tbody>${bookingRows}</tbody>
          </table>
        </div>

        <div class="report-footer">
          <span>RJMBook Resort Management System — Confidential</span>
          <span>Period: ${this.formatDateShort(start)} – ${this.formatDateShort(end)}</span>
        </div>`;

      return this.htmlToPdf(this.wrapHtml("Booking Report", "#2563eb", body), "booking-report");
    } catch (error) {
      console.error("Booking report generation error:", error);
      return { success: false, error: error.message };
    }
  }

  /* ─────────────────────────────────────────────
     REVENUE REPORT
  ───────────────────────────────────────────── */
  async generateRevenueReport(startDate = null, endDate = null) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end   = endDate   ? new Date(endDate)   : new Date();

      const bookings = await Booking.findAll({
        where: {
          status: { [Op.in]: ["confirmed", "checked_in", "checked_out"] },
          checkIn: { [Op.between]: [start, end] }
        },
        include: [
          {
            model: Room, attributes: ["roomNumber"], required: false,
            include: [{ model: RoomType, attributes: ["name", "category", "basePricePerNight"], required: false }]
          }
        ],
        raw: false
      });

      const allBookings = await Booking.findAll({
        where: { checkIn: { [Op.between]: [start, end] } },
        raw: true
      });

      const totalRevenue   = bookings.reduce((s, b) => s + (parseFloat(b.totalAmount) || 0), 0);
      const paidRevenue    = bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + (parseFloat(b.totalAmount) || 0), 0);
      const unpaidRevenue  = bookings.filter(b => b.paymentStatus === "unpaid").reduce((s, b) => s + (parseFloat(b.totalAmount) || 0), 0);
      const avgBooking     = bookings.length > 0 ? totalRevenue / bookings.length : 0;
      const totalCancelled = allBookings.filter(b => b.status === "cancelled").length;

      // ── Daily revenue (sorted by date) ──
      const dailyMap = {};
      bookings.forEach(b => {
        const d = new Date(b.checkIn).toISOString().split("T")[0];
        if (!dailyMap[d]) dailyMap[d] = { revenue: 0, count: 0 };
        dailyMap[d].revenue += parseFloat(b.totalAmount) || 0;
        dailyMap[d].count++;
      });
      const dailySorted = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));
      const maxDay = Math.max(...dailySorted.map(([, v]) => v.revenue), 1);

      const dailyRows = dailySorted.map(([date, v]) => `
        <tr>
          <td>${this.formatDateShort(date)}</td>
          <td>${v.count}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="bar-wrap" style="flex:1;"><div class="bar-fill" style="width:${((v.revenue/maxDay)*100).toFixed(1)}%;"></div></div>
              <span style="min-width:90px;text-align:right;">${this.formatCurrency(v.revenue)}</span>
            </div>
          </td>
        </tr>`).join("");

      // ── Revenue by room type ──
      const typeMap = {};
      bookings.forEach(b => {
        const key = b.Room?.RoomType?.name || "Unassigned";
        const cat = b.Room?.RoomType?.category || "—";
        if (!typeMap[key]) typeMap[key] = { category: cat, count: 0, revenue: 0 };
        typeMap[key].count++;
        typeMap[key].revenue += parseFloat(b.totalAmount) || 0;
      });
      const typeRows = Object.entries(typeMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([name, d]) => `
          <tr>
            <td>${name}</td>
            <td style="text-transform:capitalize;">${d.category}</td>
            <td>${d.count}</td>
            <td>${this.formatCurrency(d.revenue)}</td>
            <td>${totalRevenue > 0 ? ((d.revenue/totalRevenue)*100).toFixed(1) : 0}%</td>
          </tr>`).join("");

      const body = `
        <div class="report-header">
          <div>
            <h1>Revenue Report</h1>
            <div class="subtitle">Financial summary from ${this.formatDateShort(start)} to ${this.formatDateShort(end)}</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${this.formatDate(new Date())}</div>
            <div><strong>Active Bookings:</strong> ${bookings.length}</div>
            <div><strong>RJMBook Resort</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Revenue Overview</div>
          <div class="stats">
            <div class="stat green"><div class="stat-label">Total Revenue</div><div class="stat-value" style="font-size:18px;">${this.formatCurrency(totalRevenue)}</div><div class="stat-sub">confirmed + active bookings</div></div>
            <div class="stat blue"><div class="stat-label">Collected (Paid)</div><div class="stat-value" style="font-size:18px;">${this.formatCurrency(paidRevenue)}</div><div class="stat-sub">${bookings.length > 0 ? ((paidRevenue/totalRevenue)*100).toFixed(1) : 0}% of total</div></div>
            <div class="stat red"><div class="stat-label">Outstanding</div><div class="stat-value" style="font-size:18px;">${this.formatCurrency(unpaidRevenue)}</div><div class="stat-sub">payment pending</div></div>
            <div class="stat amber"><div class="stat-label">Avg Booking Value</div><div class="stat-value" style="font-size:18px;">${this.formatCurrency(avgBooking)}</div><div class="stat-sub">per reservation</div></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Revenue by Room / Cottage Type</div>
          <table>
            <thead>
              <tr><th>Type</th><th>Category</th><th>Bookings</th><th>Revenue</th><th>Share</th></tr>
            </thead>
            <tbody>${typeRows}</tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Daily Revenue Breakdown</div>
          <table>
            <thead>
              <tr><th>Date</th><th>Bookings</th><th>Revenue</th></tr>
            </thead>
            <tbody>${dailyRows || "<tr><td colspan='3' style='text-align:center;color:#9ca3af;padding:20px;'>No revenue data for this period</td></tr>"}</tbody>
          </table>
        </div>

        <div class="report-footer">
          <span>RJMBook Resort Management System — Confidential</span>
          <span>Period: ${this.formatDateShort(start)} – ${this.formatDateShort(end)}</span>
        </div>`;

      return this.htmlToPdf(this.wrapHtml("Revenue Report", "#059669", body), "revenue-report");
    } catch (error) {
      console.error("Revenue report generation error:", error);
      return { success: false, error: error.message };
    }
  }

  /* ─────────────────────────────────────────────
     OCCUPANCY REPORT
  ───────────────────────────────────────────── */
  async generateOccupancyReport(startDate = null, endDate = null) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end   = endDate   ? new Date(endDate)   : new Date();

      const [snapshots, totalRooms, roomTypes] = await Promise.all([
        OccupancySnapshot.findAll({
          where: { date: { [Op.between]: [start, end] } },
          order: [["date", "ASC"]]
        }),
        Room.count(),
        RoomType.findAll({ attributes: ["name", "category"], raw: true })
      ]);

      // ── Aggregate stats from snapshots ──
      const rates = snapshots.map(s => parseFloat(s.occupancyRate) || 0);
      const avgOccupancy  = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      const peakRate      = rates.length > 0 ? Math.max(...rates) : 0;
      const lowestRate    = rates.length > 0 ? Math.min(...rates) : 0;
      const peakSnap      = snapshots.find(s => parseFloat(s.occupancyRate) === peakRate);
      const lowestSnap    = snapshots.find(s => parseFloat(s.occupancyRate) === lowestRate);
      const daysAbove50   = rates.filter(r => r >= 50).length;

      // ── Active bookings in range for room breakdown ──
      const activeBookings = await Booking.findAll({
        where: {
          status: { [Op.in]: ["confirmed", "checked_in", "checked_out"] },
          checkIn: { [Op.between]: [start, end] }
        },
        include: [{
          model: Room, attributes: ["roomNumber"], required: false,
          include: [{ model: RoomType, attributes: ["name", "category"], required: false }]
        }],
        raw: false
      });

      // ── Per room-type occupancy ──
      const typeBookings = {};
      activeBookings.forEach(b => {
        const key = b.Room?.RoomType?.name || "Unassigned";
        const cat = b.Room?.RoomType?.category || "—";
        if (!typeBookings[key]) typeBookings[key] = { category: cat, count: 0 };
        typeBookings[key].count++;
      });
      const typeRows = Object.entries(typeBookings)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, d]) => `
          <tr>
            <td>${name}</td>
            <td style="text-transform:capitalize;">${d.category}</td>
            <td>${d.count}</td>
            <td>${activeBookings.length > 0 ? ((d.count/activeBookings.length)*100).toFixed(1) : 0}%</td>
          </tr>`).join("");

      // ── Daily snapshot rows ──
      const maxOccupied = Math.max(...snapshots.map(s => s.occupiedRooms || 0), 1);
      const snapshotRows = snapshots.map(s => {
        const rate = parseFloat(s.occupancyRate) || 0;
        const occupied = s.occupiedRooms || 0;
        const barColor = rate >= 80 ? "#dc2626" : rate >= 50 ? "#d97706" : "#059669";
        return `
          <tr>
            <td>${this.formatDateShort(s.date)}</td>
            <td style="text-align:center;">${occupied}</td>
            <td style="text-align:center;">${(s.totalRooms || totalRooms) - occupied}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="bar-wrap" style="flex:1;"><div class="bar-fill" style="width:${rate.toFixed(1)}%;background:${barColor};"></div></div>
                <span style="min-width:44px;text-align:right;font-weight:600;">${rate.toFixed(1)}%</span>
              </div>
            </td>
          </tr>`;
      }).join("");

      const body = `
        <div class="report-header">
          <div>
            <h1>Occupancy Report</h1>
            <div class="subtitle">Room utilization from ${this.formatDateShort(start)} to ${this.formatDateShort(end)}</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${this.formatDate(new Date())}</div>
            <div><strong>Total Rooms:</strong> ${totalRooms}</div>
            <div><strong>RJMBook Resort</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Occupancy Overview</div>
          <div class="stats">
            <div class="stat blue"><div class="stat-label">Avg Occupancy Rate</div><div class="stat-value">${avgOccupancy.toFixed(1)}%</div><div class="stat-sub">over ${snapshots.length} recorded days</div></div>
            <div class="stat green"><div class="stat-label">Peak Rate</div><div class="stat-value">${peakRate.toFixed(1)}%</div><div class="stat-sub">${peakSnap ? this.formatDateShort(peakSnap.date) : "—"}</div></div>
            <div class="stat amber"><div class="stat-label">Lowest Rate</div><div class="stat-value">${lowestRate.toFixed(1)}%</div><div class="stat-sub">${lowestSnap ? this.formatDateShort(lowestSnap.date) : "—"}</div></div>
            <div class="stat purple"><div class="stat-label">Days ≥ 50% Full</div><div class="stat-value">${daysAbove50}</div><div class="stat-sub">of ${snapshots.length} days tracked</div></div>
          </div>
        </div>

        ${typeRows ? `
        <div class="section">
          <div class="section-title">Bookings by Room / Cottage Type</div>
          <table>
            <thead><tr><th>Type</th><th>Category</th><th>Bookings</th><th>Share</th></tr></thead>
            <tbody>${typeRows}</tbody>
          </table>
        </div>` : ""}

        <div class="section">
          <div class="section-title">Daily Occupancy Snapshot</div>
          ${snapshots.length === 0
            ? `<p style="color:#9ca3af;padding:16px 0;">No occupancy snapshots recorded for this period.</p>`
            : `<table>
                <thead>
                  <tr><th>Date</th><th style="text-align:center;">Occupied</th><th style="text-align:center;">Available</th><th>Occupancy Rate</th></tr>
                </thead>
                <tbody>${snapshotRows}</tbody>
              </table>`}
        </div>

        <div class="report-footer">
          <span>RJMBook Resort Management System — Confidential</span>
          <span>Period: ${this.formatDateShort(start)} – ${this.formatDateShort(end)}</span>
        </div>`;

      return this.htmlToPdf(this.wrapHtml("Occupancy Report", "#dc2626", body), "occupancy-report");
    } catch (error) {
      console.error("Occupancy report generation error:", error);
      return { success: false, error: error.message };
    }
  }

  /* ─────────────────────────────────────────────
     GUEST REPORT
  ───────────────────────────────────────────── */
  async generateGuestReport(startDate = null, endDate = null) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const end   = endDate   ? new Date(endDate)   : new Date();

      const guests = await Guest.findAll({
        include: [{
          model: Booking,
          where: { checkIn: { [Op.between]: [start, end] } },
          required: false
        }],
        order: [["createdAt", "DESC"]],
        limit: 500,
        raw: false,
        subQuery: false
      });

      const totalGuests     = guests.length;
      const withBookings    = guests.filter(g => g.Bookings && g.Bookings.length > 0).length;
      const withoutBookings = totalGuests - withBookings;
      const totalBookings   = guests.reduce((s, g) => s + (g.Bookings?.length || 0), 0);
      const avgBookings     = withBookings > 0 ? (totalBookings / withBookings).toFixed(1) : "0.0";

      // ── Repeat guests (2+ bookings) ──
      const repeatGuests = guests.filter(g => (g.Bookings?.length || 0) >= 2).length;

      // ── Revenue per guest ──
      const guestRevenue = guests.map(g => ({
        name: `${g.firstName} ${g.lastName}`,
        email: g.email || "—",
        phone: g.phone || "—",
        bookings: g.Bookings?.length || 0,
        revenue: (g.Bookings || []).reduce((s, b) => s + (parseFloat(b.totalAmount) || 0), 0),
        lastStay: g.Bookings && g.Bookings.length > 0
          ? g.Bookings.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))[0].checkIn
          : null,
        since: g.createdAt
      }));

      // Top spenders
      const topSpenders = [...guestRevenue]
        .filter(g => g.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const topSpenderRows = topSpenders.map((g, i) => `
        <tr>
          <td style="color:#6b7280;font-size:11px;">${i + 1}</td>
          <td><strong>${g.name}</strong></td>
          <td>${g.email}</td>
          <td style="text-align:center;">${g.bookings}</td>
          <td>${g.lastStay ? this.formatDateShort(g.lastStay) : "—"}</td>
          <td>${this.formatCurrency(g.revenue)}</td>
        </tr>`).join("");

      // Full directory
      const guestRows = guestRevenue.slice(0, 100).map(g => `
        <tr>
          <td>${g.name}</td>
          <td>${g.email}</td>
          <td>${g.phone}</td>
          <td style="text-align:center;">${g.bookings}</td>
          <td>${g.lastStay ? this.formatDateShort(g.lastStay) : "No bookings"}</td>
          <td>${this.formatDate(g.since)}</td>
          <td>${this.formatCurrency(g.revenue)}</td>
        </tr>`).join("");

      const body = `
        <div class="report-header">
          <div>
            <h1>Guest Report</h1>
            <div class="subtitle">Guest directory and booking history from ${this.formatDateShort(start)} to ${this.formatDateShort(end)}</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${this.formatDate(new Date())}</div>
            <div><strong>Total Guests:</strong> ${totalGuests}</div>
            <div><strong>RJMBook Resort</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Guest Overview</div>
          <div class="stats">
            <div class="stat blue"><div class="stat-label">Total Guests</div><div class="stat-value">${totalGuests}</div></div>
            <div class="stat green"><div class="stat-label">Guests with Bookings</div><div class="stat-value">${withBookings}</div><div class="stat-sub">in selected period</div></div>
            <div class="stat amber"><div class="stat-label">No Bookings</div><div class="stat-value">${withoutBookings}</div><div class="stat-sub">registered only</div></div>
            <div class="stat purple"><div class="stat-label">Repeat Guests</div><div class="stat-value">${repeatGuests}</div><div class="stat-sub">2 or more stays</div></div>
          </div>
          <div class="stats stats-2" style="margin-top:14px;">
            <div class="stat"><div class="stat-label">Total Bookings</div><div class="stat-value">${totalBookings}</div></div>
            <div class="stat"><div class="stat-label">Avg Stays per Guest</div><div class="stat-value">${avgBookings}</div><div class="stat-sub">among guests with bookings</div></div>
          </div>
        </div>

        ${topSpenders.length > 0 ? `
        <div class="section">
          <div class="section-title">Top Guests by Revenue</div>
          <table>
            <thead>
              <tr><th>#</th><th>Guest</th><th>Email</th><th style="text-align:center;">Bookings</th><th>Last Stay</th><th>Total Spent</th></tr>
            </thead>
            <tbody>${topSpenderRows}</tbody>
          </table>
        </div>` : ""}

        <div class="section">
          <div class="section-title">Guest Directory (latest 100)</div>
          <table>
            <thead>
              <tr>
                <th>Full Name</th><th>Email</th><th>Phone</th>
                <th style="text-align:center;">Bookings</th><th>Last Stay</th>
                <th>Member Since</th><th>Total Spent</th>
              </tr>
            </thead>
            <tbody>${guestRows}</tbody>
          </table>
        </div>

        <div class="report-footer">
          <span>RJMBook Resort Management System — Confidential</span>
          <span>Period: ${this.formatDateShort(start)} – ${this.formatDateShort(end)}</span>
        </div>`;

      return this.htmlToPdf(this.wrapHtml("Guest Report", "#7c3aed", body), "guest-report");
    } catch (error) {
      console.error("Guest report generation error:", error);
      return { success: false, error: error.message };
    }
  }

  /* ─────────────────────────────────────────────
     HTML → PDF (Puppeteer)
  ───────────────────────────────────────────── */
  async htmlToPdf(html, filename) {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-extensions",
          "--no-zygote"
        ]
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1240, height: 877 });
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise(r => setTimeout(r, 400));

      const filepath = path.join(this.reportsDir, `${filename}-${Date.now()}.pdf`);

      await page.pdf({
        path: filepath,
        format: "A4",
        margin: { top: "10px", bottom: "10px", left: "10px", right: "10px" },
        printBackground: true,
        timeout: 30000
      });

      await browser.close();

      return {
        success: true,
        filepath,
        filename: path.basename(filepath),
        url: `/reports/${path.basename(filepath)}`
      };
    } catch (error) {
      console.error("PDF generation error:", error);
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
      return { success: false, error: error.message };
    }
  }
}

export const reportService = new ReportService();
