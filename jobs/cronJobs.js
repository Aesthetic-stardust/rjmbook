import cron from 'node-cron';
import { Op } from 'sequelize';
import { Booking, Guest } from '../models/index.js';
import { emailService } from '../services/emailService.js';

/**
 * Immediately auto-cancels no-show bookings and auto-checks-out overdue stays.
 * Called at startup and by the midnight cron job.
 */
export async function runAutoStatusUpdate() {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  console.log(`[Cron] Running auto-status update for ${today}...`);

  try {
    // 1. Auto-cancel: pending or confirmed bookings whose checkIn date is in the past
    const [cancelledCount] = await Booking.update(
      {
        status: 'cancelled',
        cancellationReason: 'Automatically cancelled: guest did not check in by the scheduled date.'
      },
      {
        where: {
          status: { [Op.in]: ['pending', 'confirmed'] },
          checkIn: { [Op.lt]: today }
        }
      }
    );
    if (cancelledCount > 0) {
      console.log(`[Cron] Auto-cancelled ${cancelledCount} no-show booking(s).`);
    }

    // 2. Auto-complete: checked_in bookings whose checkOut date has passed
    const [completedCount] = await Booking.update(
      { status: 'checked_out' },
      {
        where: {
          status: 'checked_in',
          [Op.or]: [
            { checkOut: { [Op.lte]: today }, earlyCheckoutDate: null },
            { earlyCheckoutDate: { [Op.lte]: today } }
          ]
        }
      }
    );
    if (completedCount > 0) {
      console.log(`[Cron] Auto-checked-out ${completedCount} overdue booking(s).`);
    }
  } catch (error) {
    console.error('[Cron] Error during auto-status update:', error);
  }
}

/**
 * Initializes all cron jobs for the application.
 */
export const initCronJobs = () => {
  console.log('[Cron] Initializing scheduled jobs...');

  // ── Run immediately at startup to catch any bookings that passed their checkout
  //    date while the server was down ──
  runAutoStatusUpdate();

  // Run every day at 8:00 AM
  // Schedule format: 'minute hour dayOfMonth month dayOfWeek'
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily reminder check...');
    try {
      const today = new Date();
      // Calculate target date (2 days from now)
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 2);
      
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Find all confirmed bookings checking in exactly 2 days from now
      const upcomingBookings = await Booking.findAll({
        where: {
          status: 'confirmed',
          checkIn: targetDateStr
        },
        include: [{ model: Guest }]
      });

      console.log(`[Cron] Found ${upcomingBookings.length} bookings arriving on ${targetDateStr}`);

      for (const booking of upcomingBookings) {
        if (booking.Guest && booking.Guest.email) {
          console.log(`[Cron] Sending reminder to ${booking.Guest.email} for booking #${booking.id}`);
          await emailService.sendIncomingReminder(
            booking.Guest.email,
            booking.Guest.firstName,
            booking
          );
        }
      }
    } catch (error) {
      console.error('[Cron] Error during daily reminder check:', error);
    }
  });

  // ── Run every day at midnight ──
  // Auto-cancel confirmed bookings where check-in date has passed (no-show)
  // Auto-complete checked_in bookings where check-out date has passed
  cron.schedule('0 0 * * *', () => runAutoStatusUpdate());

  console.log('[Cron] Scheduled jobs initialized successfully.');
};
