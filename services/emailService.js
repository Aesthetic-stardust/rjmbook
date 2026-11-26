import emailjs from '@emailjs/nodejs';

/**
 * Sends an email using EmailJS.
 * Requires EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY, and EMAILJS_SERVICE_ID in .env
 *
 * @param {string} templateId - The EmailJS Template ID
 * @param {object} templateParams - Key-value pairs matching your EmailJS template variables
 */
const sendEmail = async (templateId, templateParams) => {
  try {
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;
    const serviceId = process.env.EMAILJS_SERVICE_ID;

    // Check if configuration exists
    if (!publicKey || publicKey === 'your_public_key' || !serviceId || serviceId === 'your_service_id') {
      console.warn('[EmailJS] Skipping email: EmailJS is not configured in .env');
      return false;
    }

    const response = await emailjs.send(
      serviceId,
      templateId,
      templateParams,
      {
        publicKey,
        privateKey,
      }
    );
    
    console.log(`[EmailJS] Successfully sent email to ${templateParams.guest_email || 'unknown'} (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send email:', error);
    return false;
  }
};

/**
 * Template IDs - these should ideally be in .env but can be hardcoded if you prefer
 * We will use a generic EMAILJS_TEMPLATE_ID for all for now, relying on template variables
 * to change the message context.
 */
const getTemplateId = () => process.env.EMAILJS_TEMPLATE_ID;

export const emailService = {
  /**
   * Sent when a booking is initially created
   */
  async sendBookingCreated(guestEmail, guestName, bookingDetails, roomName) {
    const params = {
      guest_email: guestEmail,
      guest_name: guestName,
      subject: 'Booking Request Received - RJM Beach Resort',
      room_name: roomName || (bookingDetails.Room?.RoomType?.name) || 'a Room/Cottage',
      adults: bookingDetails.adults,
      children: bookingDetails.children,
      total_amount: bookingDetails.totalAmount,
      check_in: new Date(bookingDetails.checkIn).toLocaleDateString(),
      check_out: new Date(bookingDetails.checkOut).toLocaleDateString(),
      status: 'Pending / Created',
      message_body: `We have received your booking request for RJM Beach Resort. If you haven't completed the payment yet, please ensure it's finalized so we can confirm your stay.`,
    };
    return await sendEmail(getTemplateId(), params);
  },

  /**
   * Sent when Maya confirms the payment
   */
  async sendPaymentSuccess(guestEmail, guestName, bookingDetails, roomName) {
    const params = {
      guest_email: guestEmail,
      guest_name: guestName,
      subject: 'Payment Successful! Booking Confirmed - RJM Beach Resort',
      room_name: roomName || (bookingDetails.Room?.RoomType?.name) || 'a Room/Cottage',
      adults: bookingDetails.adults,
      children: bookingDetails.children,
      total_amount: bookingDetails.totalAmount,
      check_in: new Date(bookingDetails.checkIn).toLocaleDateString(),
      check_out: new Date(bookingDetails.checkOut).toLocaleDateString(),
      status: 'Confirmed',
      message_body: `Great news! Your payment has been successfully processed. Your booking is now fully CONFIRMED. We look forward to welcoming you to RJM Beach Resort!`,
    };
    return await sendEmail(getTemplateId(), params);
  },

  /**
   * Sent when a booking is cancelled
   */
  async sendBookingCancelled(guestEmail, guestName, bookingDetails, reason, roomName) {
    const params = {
      guest_email: guestEmail,
      guest_name: guestName,
      subject: 'Booking Cancelled - RJM Beach Resort',
      room_name: roomName || (bookingDetails.Room?.RoomType?.name) || 'a Room/Cottage',
      adults: bookingDetails.adults,
      children: bookingDetails.children,
      total_amount: bookingDetails.totalAmount,
      check_in: new Date(bookingDetails.checkIn).toLocaleDateString(),
      check_out: new Date(bookingDetails.checkOut).toLocaleDateString(),
      status: 'Cancelled',
      message_body: `Your booking has been cancelled.\nReason: ${reason || 'Not specified'}.\nIf you have any questions or would like to rebook, please contact us.`,
    };
    return await sendEmail(getTemplateId(), params);
  },

  /**
   * Sent as an automated reminder a few days before check-in
   */
  async sendIncomingReminder(guestEmail, guestName, bookingDetails, roomName) {
    const params = {
      guest_email: guestEmail,
      guest_name: guestName,
      subject: 'Upcoming Stay Reminder - RJM Beach Resort',
      room_name: roomName || (bookingDetails.Room?.RoomType?.name) || 'a Room/Cottage',
      adults: bookingDetails.adults,
      children: bookingDetails.children,
      total_amount: bookingDetails.totalAmount,
      check_in: new Date(bookingDetails.checkIn).toLocaleDateString(),
      check_out: new Date(bookingDetails.checkOut).toLocaleDateString(),
      status: 'Confirmed (Upcoming)',
      message_body: `This is a friendly reminder that your stay at RJM Beach Resort is coming up soon! We are excited to host you starting on ${new Date(bookingDetails.checkIn).toLocaleDateString()}. Safe travels!`,
    };
    return await sendEmail(getTemplateId(), params);
  }
};
