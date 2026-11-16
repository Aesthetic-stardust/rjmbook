/*
  RJMBook — ML-Powered Resort Booking | Naruwan Resort
*/
import { Booking, Room, RoomType, Guest, Notification, PaymentSetting } from "../models/index.js";
import { Op } from "sequelize";
import { recordOccupancySnapshot } from "../services/ml/occupancyForecast.js";
import { emailService } from "../services/emailService.js";

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function bookingForm(req, res) {
  try {
    // Fetch ALL room types (both rooms and cottages) including unavailable ones
    // Guests should see all options, with availability checked on date selection
    const allRoomTypes = await RoomType.findAll({
      where: {
        category: { [Op.in]: ['room', 'cottage'] }
      },
      order: [['category', 'ASC'], ['name', 'ASC']],
      raw: true
    });

    // Separate rooms and cottages for easier template rendering
    const rooms = allRoomTypes.filter(rt => rt.category === 'room');
    const cottages = allRoomTypes.filter(rt => rt.category === 'cottage');

    // Get user's name from session
    const userName = req.session.userName || "";
    const userEmail = req.session.userEmail || "";
    const nameParts = userName.split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    res.render("bookings/form", {
      title: "Book Your Stay | Naruwan Resort",
      rooms,
      cottages,
      firstName,
      lastName,
      email: userEmail
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

export async function checkAvailability(req, res) {
  try {
    const checkIn = parseDate(req.query.checkIn);
    const checkOut = parseDate(req.query.checkOut);
    const roomTypeId = req.query.roomTypeId ? parseInt(req.query.roomTypeId, 10) : null;
    const category = req.query.category || null; // 'room' or 'cottage'
    if (!checkIn || !checkOut || checkOut < checkIn) {
      return res.json({ available: [], error: "Invalid dates" });
    }
    const bookedRoomIds = await Booking.findAll({
      where: {
        status: { [Op.notIn]: ["cancelled"] },
        // True interval overlap: existing booking overlaps requested range when
        // existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn.
        // Using lte/gte so same-day cottage bookings (checkIn === checkOut) are also caught.
        checkIn: { [Op.lte]: checkOut },
        checkOut: { [Op.gte]: checkIn }
      },
      attributes: ["roomId"]
    }).then((rows) => rows.map((r) => r.roomId));

    // Get booked room type IDs to check for linked rooms
    const bookedRoomTypes = await Room.findAll({
      where: { id: { [Op.in]: bookedRoomIds.filter(Boolean) } },
      attributes: ["roomTypeId"]
    }).then((rows) => rows.map((r) => r.roomTypeId));

    // Find all linked room types that are booked
    const linkedRoomTypeIds = await RoomType.findAll({
      where: { linkedRoomId: { [Op.in]: bookedRoomTypes } },
      attributes: ["id"]
    }).then((rows) => rows.map((r) => r.id));

    // Check for Lanyo combo conflicts - if any of the Lanyo rooms (1, 2, or combo) are booked
    // then all three become unavailable (they're mutually exclusive)
    const lanyoRoomNames = ["Lanyo 1", "Lanyo 2", "Lanyo 1 + Lanyo 2"];
    const bookedLanyoRoomNames = await Room.findAll({
      where: { id: { [Op.in]: bookedRoomIds.filter(Boolean) } },
      include: [{ model: RoomType, attributes: ["name"] }],
      attributes: ["id"],
      raw: true,
      subQuery: false
    }).then((rows) => rows.map((r) => r["RoomType.name"]).filter(name => lanyoRoomNames.includes(name)));

    // If any Lanyo room is booked, all Lanyo rooms become unavailable
    let unavailableLanyoRoomTypeIds = [];
    if (bookedLanyoRoomNames.length > 0) {
      const lanyoRoomTypes = await RoomType.findAll({
        where: { name: { [Op.in]: lanyoRoomNames } },
        attributes: ["id"]
      }).then((rows) => rows.map((r) => r.id));
      unavailableLanyoRoomTypeIds = lanyoRoomTypes;
    }

    // Add linked room type IDs to the unavailable list
    const unavailableRoomTypeIds = [...bookedRoomTypes, ...linkedRoomTypeIds, ...unavailableLanyoRoomTypeIds];

    const where = { isAvailable: true };
    if (roomTypeId) where.roomTypeId = roomTypeId;

    // Build RoomType filter — always restrict by category
    const roomTypeWhere = { isAvailable: true };

    // If a specific roomTypeId is provided, determine its category and filter by that
    if (roomTypeId) {
      const selectedRoomType = await RoomType.findByPk(roomTypeId);
      if (selectedRoomType) {
        roomTypeWhere.category = selectedRoomType.category;
      }
    } else if (category) {
      // If no specific roomTypeId but category is provided, use the category
      roomTypeWhere.category = category;
    } else {
      // Default to 'room' category if no category specified (prevents cottages from appearing in room searches)
      roomTypeWhere.category = 'room';
    }

    const available = await Room.findAll({
      where: { ...where, id: { [Op.notIn]: bookedRoomIds.filter(Boolean) } },
      include: [{
        model: RoomType,
        where: roomTypeWhere,
        required: true,
        attributes: ["id", "name", "basePricePerNight", "dayPrice", "nightPrice", "maxGuests", "category", "linkedRoomId", "poolFeesIncluded", "roomNotes"]
      }]
    });

    // Filter out rooms with unavailable linked types or Lanyo conflicts
    const filteredAvailable = available.filter(
      room => !unavailableRoomTypeIds.includes(room.RoomType?.id)
    );

    res.json({ available: filteredAvailable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createBooking(req, res) {
  try {
    const { guestId, roomId, checkIn, checkOut, adults, children, specialRequests, firstName, lastName, email, phone, rateType } = req.body;
    const cIn = parseDate(checkIn);
    const cOut = parseDate(checkOut);
    if (!cIn || !cOut || cOut < cIn || !roomId) {
      return res.status(400).json({ error: "Invalid check-in, check-out, or room" });
    }

    const userId = req.session.userId;
    const userEmail = req.session.userEmail;
    const userName = req.session.userName;

    let resolvedGuestId = guestId ? parseInt(guestId, 10) : null;

    // If no guestId provided, create/use guest
    if (!resolvedGuestId) {
      // Check if this is a walk-in booking (staff/admin creating on behalf of guest)
      // Walk-in bookings have firstName, lastName from form input
      const isWalkIn = firstName && lastName && email && (req.session.role === 'admin' || req.session.role === 'staff');

      if (isWalkIn) {
        // Walk-in booking: create new guest with form data
        const existingGuest = await Guest.findOne({ where: { email } });

        if (existingGuest) {
          // Use existing guest record
          resolvedGuestId = existingGuest.id;
        } else {
          // Create new guest record (no userId since it's a walk-in)
          const newGuest = await Guest.create({
            firstName: firstName || "Guest",
            lastName: lastName || "",
            email: email || null,
            phone: phone || null,
            userId: null
          });
          resolvedGuestId = newGuest.id;
        }
      } else {
        // Regular guest booking: use logged-in user's information
        let guest = await Guest.findOne({ where: { email: userEmail } });

        if (guest) {
          if (!guest.userId) {
            guest.userId = userId;
            await guest.save();
          }
        } else {
          guest = await Guest.create({
            firstName: userName?.split(' ')[0] || firstName || "Guest",
            lastName: userName?.split(' ').slice(1).join(' ') || lastName || "",
            email: userEmail,
            phone: phone || null,
            userId: userId
          });
        }
        resolvedGuestId = guest.id;
      }
    }

    const room = await Room.findByPk(roomId, { include: [RoomType] });
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Check for Lanyo room conflicts (linked rooms)
    if (room.RoomType?.linkedRoomId) {
      const linkedRoomType = await RoomType.findByPk(room.RoomType.linkedRoomId);
      if (linkedRoomType) {
        // Find rooms of the linked type
        const linkedRooms = await Room.findAll({
          where: { roomTypeId: linkedRoomType.id }
        });

        // Check if any linked rooms are booked during this period
        for (const linkedRoom of linkedRooms) {
          const conflictingBooking = await Booking.findOne({
            where: {
              roomId: linkedRoom.id,
              status: { [Op.notIn]: ["cancelled"] },
              [Op.or]: [
                { checkIn: { [Op.between]: [cIn, cOut] } },
                { checkOut: { [Op.between]: [cIn, cOut] } }
              ]
            }
          });

          if (conflictingBooking) {
            return res.status(409).json({
              error: `Cannot book ${room.RoomType.name}. The linked room (${linkedRoomType.name}) is already booked for these dates.`
            });
          }
        }
      }
    }

    // Calculate total for number of days (24-hour periods)
    const days = Math.ceil((new Date(cOut) - new Date(cIn)) / (24 * 60 * 60 * 1000));

    // Calculate total amount based on room type and rate selection
    let totalAmount = 0;
    let rateApplied = "standard";

    if (room.RoomType?.category === 'cottage') {
      // Flat 24-hour rate — no day/night split
      totalAmount = parseFloat(room.RoomType?.basePricePerNight || 0);
      rateApplied = "flat";
    } else {
      // For rooms, use standard rate (daily rate * number of days)
      totalAmount = days * parseFloat(room.RoomType?.basePricePerNight || 0);
      rateApplied = "standard";
    }

    // Entrance fee logic for standard rooms: first 2 guests are free, extras are charged
    const FREE_GUESTS = 2;
    const ENTRANCE_FEE_PER_EXTRA_ADULT = 100; // ₱100 per extra adult (day rate)
    const ENTRANCE_FEE_PER_EXTRA_CHILD = 100;  // ₱100 per extra child
    let extraEntranceFeeTotal = 0;
    let extraAdults = 0;
    let extraChildren = 0;

    const totalGuests = (parseInt(adults, 10) || 1) + (parseInt(children, 10) || 0);

    if (room.RoomType?.category !== 'cottage' && room.RoomType?.poolFeesIncluded !== false) {
      const adultCount = parseInt(adults, 10) || 1;
      const childrenCount = parseInt(children, 10) || 0;
      // First FREE_GUESTS guests (adults first) are included
      const freeAdults = Math.min(adultCount, FREE_GUESTS);
      const freeRemaining = Math.max(0, FREE_GUESTS - freeAdults);
      extraAdults = Math.max(0, adultCount - freeAdults);
      extraChildren = Math.max(0, childrenCount - freeRemaining);
      extraEntranceFeeTotal = (extraAdults * ENTRANCE_FEE_PER_EXTRA_ADULT) + (extraChildren * ENTRANCE_FEE_PER_EXTRA_CHILD);
      totalAmount += extraEntranceFeeTotal;
    }

    // Generate room notes based on room type
    let roomNotes = "";

    if (room.RoomType?.category === 'cottage') {
      roomNotes = "⚠️ COTTAGE PRICING: Booking does NOT include entrance fee.\n";
      roomNotes += `• Flat 24-hour rate: ₱${room.RoomType?.basePricePerNight}\n`;
      roomNotes += "• Entrance fees must be arranged separately.";
    } else if (room.RoomType?.poolFeesIncluded === false) {
      roomNotes = "⚠️ Pool fees NOT INCLUDED - must be arranged separately.";
    } else {
      roomNotes = `✓ Entrance fee: first ${FREE_GUESTS} guests are FREE.\n`;
      if (extraEntranceFeeTotal > 0) {
        if (extraAdults > 0) roomNotes += `• +${extraAdults} extra adult(s) × ₱${ENTRANCE_FEE_PER_EXTRA_ADULT} = ₱${extraAdults * ENTRANCE_FEE_PER_EXTRA_ADULT}\n`;
        if (extraChildren > 0) roomNotes += `• +${extraChildren} extra child(ren) × ₱${ENTRANCE_FEE_PER_EXTRA_CHILD} = ₱${extraChildren * ENTRANCE_FEE_PER_EXTRA_CHILD}\n`;
        roomNotes += `• Extra entrance fees: ₱${extraEntranceFeeTotal} included in total.`;
      } else {
        roomNotes += `• All ${totalGuests} guest(s) covered — no extra entrance fees.`;
      }
    }

    // Add Lanyo-specific notes
    if (room.RoomType?.linkedRoomId) {
      const linkedRoomType = await RoomType.findByPk(room.RoomType.linkedRoomId);
      roomNotes += `\n• Linked with ${linkedRoomType?.name} - cannot be booked simultaneously by other guests.`;
    }

    // ── Payment policy ──────────────────────────────────────────────────────
    // Walk-in / admin bookings: no online payment, mark as unpaid and skip Maya.
    // Online guest bookings: read the global PaymentSetting to determine how
    // much (0%, 50%, or 100%) the customer must pay via Maya right now.
    const isAdminOrStaff = req.session.role === 'admin' || req.session.role === 'staff';

    let downPct = null;
    let downAmount = null;
    let initialPaymentStatus = 'unpaid';

    if (!isAdminOrStaff) {
      // Read global setting (fallback to 100% if row is missing)
      const [setting] = await PaymentSetting.findOrCreate({
        where: { id: 1 },
        defaults: { downPaymentPercent: 100 }
      });
      downPct = setting.downPaymentPercent;           // 0 | 50 | 100
      downAmount = parseFloat(((totalAmount * downPct) / 100).toFixed(2));
      if (downPct === 100) initialPaymentStatus = 'paid'; // will be confirmed by webhook
    }

    const booking = await Booking.create({
      guestId: resolvedGuestId,
      roomId,
      checkIn: cIn,
      checkOut: cOut,
      adults: parseInt(adults, 10) || 1,
      children: parseInt(children, 10) || 0,
      totalAmount,
      status: "pending",
      specialRequests: specialRequests || null,
      roomNotes: roomNotes,
      rateType: null,
      downPaymentPercent: downPct,
      downPaymentAmount: downAmount,
      paymentStatus: initialPaymentStatus
    });
    await recordOccupancySnapshot(cIn);

    // --- MAYA INTEGRATION ---
    // Only triggered for online guest bookings where the policy requires payment.
    let checkoutUrl = null;
    console.log('[MAYA DEBUG] MAYA_PUBLIC_KEY:', process.env.MAYA_PUBLIC_KEY ? 'SET (' + process.env.MAYA_PUBLIC_KEY.substring(0, 10) + '...)' : 'NOT SET');
    console.log('[MAYA DEBUG] User role:', req.session.role, '| downPct:', downPct);

    if (process.env.MAYA_PUBLIC_KEY && !isAdminOrStaff && downPct > 0) {
      try {
        const chargeAmount = downAmount; // amount the customer pays now
        const mayaApiUrl = process.env.MAYA_API_URL || 'https://pg-sandbox.paymaya.com/checkout/v1/checkouts';
        const encodedAuth = Buffer.from(process.env.MAYA_PUBLIC_KEY + ':').toString('base64');

        const itemLabel = downPct === 100
          ? `${room.RoomType?.name} — Full Payment`
          : `${room.RoomType?.name} — 50% Down Payment`;

        const mayaPayload = {
          totalAmount: {
            value: parseFloat(chargeAmount).toFixed(2),
            currency: 'PHP'
          },
          buyer: {
            firstName: firstName || 'Guest',
            lastName: lastName || '',
            contact: {
              phone: phone || '',
              email: email || ''
            }
          },
          items: [
            {
              name: itemLabel,
              quantity: 1,
              amount: { value: parseFloat(chargeAmount).toFixed(2) },
              totalAmount: { value: parseFloat(chargeAmount).toFixed(2) }
            }
          ],
          requestReferenceNumber: booking.id.toString(),
          redirectUrl: {
            success: `${req.protocol}://${req.get('host')}/bookings/${booking.id}?payment=success`,
            failure: `${req.protocol}://${req.get('host')}/bookings/${booking.id}?payment=failed`,
            cancel: `${req.protocol}://${req.get('host')}/bookings/${booking.id}?payment=cancelled`
          }
        };

        console.log('[MAYA DEBUG] Sending request to:', mayaApiUrl, '| charge:', chargeAmount);
        const response = await fetch(mayaApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${encodedAuth}`
          },
          body: JSON.stringify(mayaPayload)
        });

        console.log('[MAYA DEBUG] Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('[MAYA DEBUG] SUCCESS! Checkout URL:', data.redirectUrl);
          checkoutUrl = data.redirectUrl;
          booking.paymentUrl = checkoutUrl;
          booking.transactionId = data.checkoutId;
          await booking.save();
        } else {
          const errorText = await response.text();
          console.error("[MAYA DEBUG] API Error:", response.status, errorText);
        }
      } catch (mayaErr) {
        console.error("[MAYA DEBUG] Failed to create Maya checkout:", mayaErr);
      }
    }
    // ------------------------

    // Send email notification for booking creation
    const recipientEmail = email || userEmail;
    if (recipientEmail && recipientEmail.trim() !== '') {
      await emailService.sendBookingCreated(recipientEmail, firstName || userName || 'Guest', booking, room?.RoomType?.name);
    }

    res.json({ success: true, bookingId: booking.id, checkoutUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

export async function showBooking(req, res) {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ]
    });
    if (!booking) return res.status(404).send("Booking not found");

    // Render different views based on user role
    let view;
    if (req.session.role === 'admin') {
      view = 'bookings/admin-show';
    } else if (req.session.role === 'staff') {
      view = 'bookings/staff-show';
    } else {
      view = 'bookings/guest-show';
    }

    // Calculate cancellation eligibility for guests (not for admin/staff)
    let canCancel = false;

    if (req.session.role !== 'admin' && req.session.role !== 'staff' && (booking.status === 'pending' || booking.status === 'confirmed')) {
      canCancel = true;
    }

    const bookingData = booking.toJSON();

    // Compute balance due for display (avoids needing a subtract Handlebars helper)
    if (bookingData.downPaymentPercent !== null && bookingData.downPaymentPercent !== undefined) {
      const total = parseFloat(bookingData.totalAmount || 0);
      const paid = parseFloat(bookingData.downPaymentAmount || 0);
      bookingData.balanceDue = (total - paid).toFixed(2);
    }

    res.render(view, {
      title: "Booking Details | Naruwan Resort",
      booking: bookingData,
      canCancel
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
}

export async function listBookings(req, res) {
  try {
    const bookings = await Booking.findAll({
      order: [["checkIn", "DESC"]],
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ]
    });
    res.render("bookings/list", { title: "Reservations | Naruwan Resort", bookings: bookings.map(b => b.toJSON()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateBooking(req, res) {
  try {
    const { id } = req.params;
    const { status, cancellationReason, earlyCheckoutDate } = req.body;
    const role = req.session.role;
    const userId = req.session.userId;

    const booking = await Booking.findByPk(id, {
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    // Ownership check: guests can only update their own bookings
    if (role !== 'admin' && role !== 'staff') {
      const guestBelongsToUser = await Guest.findOne({
        where: { id: booking.guestId, userId }
      });
      if (!guestBelongsToUser) {
        return res.status(403).json({ success: false, error: "Access denied" });
      }
      // Guests can only cancel their own pending/confirmed bookings
      const allowedGuestStatuses = ['cancelled'];
      if (!allowedGuestStatuses.includes(status)) {
        return res.status(403).json({ success: false, error: "Guests can only cancel bookings" });
      }

      // Require cancellation reason for guests
      if (!cancellationReason || cancellationReason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: "Please provide a reason for cancellation."
        });
      }
    }

    // Prevent confirming a pending booking whose check-in date has already passed
    if (status === 'confirmed' && booking.status === 'pending') {
      const today = new Date().toISOString().slice(0, 10);
      const bookingCheckIn = new Date(booking.checkIn).toISOString().slice(0, 10);
      if (bookingCheckIn < today) {
        return res.status(400).json({
          success: false,
          error: `Cannot confirm this booking — the check-in date (${bookingCheckIn}) has already passed.`
        });
      }
    }

    // Prevent check-in before the actual check-in date
    if (status === 'checked_in') {
      const today = new Date().toISOString().slice(0, 10);
      const bookingCheckIn = new Date(booking.checkIn).toISOString().slice(0, 10);
      if (today < bookingCheckIn) {
        return res.status(400).json({
          success: false,
          error: `Cannot check in before the check-in date (${bookingCheckIn}).`
        });
      }
    }

    booking.status = status;
    if (cancellationReason) booking.cancellationReason = cancellationReason;
    if (earlyCheckoutDate) booking.earlyCheckoutDate = earlyCheckoutDate;

    await booking.save();

    const statusMessages = {
      pending: `Your booking (ID: ${booking.id}) is pending approval`,
      confirmed: `Your booking (ID: ${booking.id}) has been confirmed!`,
      checked_in: `You have checked in for booking (ID: ${booking.id})`,
      checked_out: earlyCheckoutDate ? `You have checked out early from booking (ID: ${booking.id}) on ${earlyCheckoutDate}` : `You have checked out from booking (ID: ${booking.id})`,
      cancelled: `Your booking (ID: ${booking.id}) has been cancelled. Reason: ${cancellationReason || 'No reason provided'}`
    };

    await Notification.create({
      bookingId: booking.id,
      type: status,
      message: statusMessages[status]
    });

    // Send email if cancelled
    if (status === 'cancelled' && booking.Guest && booking.Guest.email) {
      await emailService.sendBookingCancelled(
        booking.Guest.email,
        booking.Guest.firstName,
        booking,
        cancellationReason
      );
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error(`[updateBooking] Error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get customer's reservations (current and history)
 */
export async function customerReservations(req, res) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    // Find guest records associated with this user
    const guests = await Guest.findAll({
      where: { userId }
    });

    if (!guests || guests.length === 0) {
      return res.render("bookings/my-reservations", {
        title: "My Reservations | Naruwan Resort",
        currentReservations: [],
        pastReservations: [],
        userName: req.session.userName
      });
    }

    const guestIds = guests.map(g => g.id);

    // Get all bookings for these guests
    const currentReservations = await Booking.findAll({
      where: {
        guestId: { [Op.in]: guestIds },
        status: { [Op.in]: ["pending", "confirmed", "checked_in"] }
      },
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ],
      order: [["checkIn", "ASC"]]
    });

    const pastReservations = await Booking.findAll({
      where: {
        guestId: { [Op.in]: guestIds },
        status: { [Op.in]: ["completed", "checked_out", "cancelled"] }
      },
      include: [
        { model: Room, include: [RoomType] },
        { model: Guest }
      ],
      order: [["checkIn", "DESC"]]
    });

    res.render("bookings/my-reservations", {
      title: "My Reservations | Naruwan Resort",
      currentReservations,
      pastReservations,
      userName: req.session.userName,
      today: new Date().toISOString().slice(0, 10)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

/**
 * Get customer's reservation history (upcoming and past bookings)
 */
export async function reservationHistory(req, res) {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    // Find guest records associated with this user
    let guests = await Guest.findAll({
      where: { userId }
    });

    // If no guests found with userId, try to find unlinked guests by email and link them
    if (!guests || guests.length === 0) {
      const userEmail = req.session.userEmail;
      console.log(`[reservationHistory] No guests found for userId ${userId}. Trying to link by email: ${userEmail}`);

      if (userEmail) {
        const unlinkedGuests = await Guest.findAll({
          where: { email: userEmail, userId: null }
        });
        console.log(`[reservationHistory] Found ${unlinkedGuests.length} unlinked guests for email ${userEmail}`);

        if (unlinkedGuests.length > 0) {
          console.log(`[reservationHistory] Linking ${unlinkedGuests.length} guests to userId ${userId}`);
          for (const guest of unlinkedGuests) {
            guest.userId = userId;
            await guest.save();
          }
          guests = unlinkedGuests;
        }
      }
    }

    // If still no guests, create a fallback query by email
    let currentReservations = [];
    let pastReservations = [];
    const today = new Date().toISOString().slice(0, 10);

    if (guests && guests.length > 0) {
      const guestIds = guests.map(g => g.id);

      // Get current bookings (pending or confirmed)
      currentReservations = await Booking.findAll({
        where: {
          guestId: { [Op.in]: guestIds },
          status: { [Op.in]: ["pending", "confirmed"] }
        },
        include: [
          { model: Room, include: [RoomType] },
          { model: Guest }
        ],
        order: [["checkIn", "ASC"]]
      });

      // Get history bookings (completed, early checkout, cancelled, checked out)
      pastReservations = await Booking.findAll({
        where: {
          guestId: { [Op.in]: guestIds },
          status: { [Op.in]: ["completed", "early_checkout", "cancelled", "checked_out"] }
        },
        include: [
          { model: Room, include: [RoomType] },
          { model: Guest }
        ],
        order: [["checkIn", "DESC"]]
      });
    } else {
      // Fallback: search by user email directly
      const userEmail = req.session.userEmail;
      if (userEmail) {
        console.log(`[reservationHistory] Fallback: searching bookings by email ${userEmail}`);
        const bookingsViaEmail = await Booking.findAll({
          include: [
            {
              model: Guest,
              where: { email: userEmail }
            },
            { model: Room, include: [RoomType] }
          ]
        });

        // Link the guests to this user if not already linked
        if (bookingsViaEmail.length > 0) {
          const guestIds = [...new Set(bookingsViaEmail.map(b => b.Guest.id))];
          await Guest.update(
            { userId },
            { where: { id: { [Op.in]: guestIds } } }
          );
        }

        currentReservations = bookingsViaEmail.filter(b =>
          ["pending", "confirmed"].includes(b.status)
        ).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

        pastReservations = bookingsViaEmail.filter(b =>
          ["completed", "early_checkout", "cancelled", "checked_out"].includes(b.status)
        ).sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));
      }
    }

    // Convert to plain objects and add nights calculation
    currentReservations = currentReservations.map(booking => {
      const b = booking.toJSON ? booking.toJSON() : booking;
      b.nights = Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (24 * 60 * 60 * 1000));
      return b;
    });

    // Convert past reservations to plain objects first
    pastReservations = pastReservations.map(booking => {
      const b = booking.toJSON ? booking.toJSON() : booking;
      b.nights = Math.ceil((new Date(b.checkOut) - new Date(b.checkIn)) / (24 * 60 * 60 * 1000));
      return b;
    });

    // Calculate statistics for past reservations - ONLY non-cancelled bookings
    const confirmedReservations = pastReservations.filter(b => b.status !== "cancelled");
    const totalStays = confirmedReservations.length;
    let totalSpent = 0;
    let totalNights = 0;
    const roomTypeCount = {};
    const stayDurations = [];

    confirmedReservations.forEach(booking => {
      totalSpent += parseFloat(booking.totalAmount) || 0;
      const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (24 * 60 * 60 * 1000));
      totalNights += nights;
      stayDurations.push(nights);

      // Count room types
      const roomTypeName = booking.Room?.RoomType?.name || "Unknown";
      roomTypeCount[roomTypeName] = (roomTypeCount[roomTypeName] || 0) + 1;
    });

    // Find most visited room type
    let mostVisitedRoomType = "N/A";
    if (Object.keys(roomTypeCount).length > 0) {
      mostVisitedRoomType = Object.keys(roomTypeCount).reduce((a, b) =>
        roomTypeCount[a] > roomTypeCount[b] ? a : b
      );
    }

    // Calculate average stay duration
    const avgStayDuration = stayDurations.length > 0
      ? (stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length).toFixed(1)
      : 0;

    // Mark all unread notifications for this user's bookings as read
    try {
      const allGuestIds = (guests && guests.length > 0)
        ? guests.map(g => g.id)
        : [];
      if (allGuestIds.length > 0) {
        const bookingIds = [...currentReservations, ...pastReservations].map(b => b.id);
        if (bookingIds.length > 0) {
          await Notification.update(
            { isRead: true },
            { where: { bookingId: { [Op.in]: bookingIds }, isRead: false } }
          );
        }
      }
    } catch (markErr) {
      // Non-critical — don't block the page render
    }

    res.render("bookings/reservations", {
      title: "My Reservations | Naruwan Resort",
      currentReservations,
      pastReservations,
      userName: req.session.userName,
      totalStays,
      totalSpent: totalSpent.toFixed(2),
      totalNights,
      totalHistoryNights: totalNights,
      totalHistoryAmount: totalSpent.toFixed(2),
      mostVisitedRoomType,
      avgStayDuration
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

/**
 * Delete a booking permanently
 */
export async function deleteBooking(req, res) {
  try {
    const { id } = req.params;
    const role = req.session.role;
    const userId = req.session.userId;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    // Ownership check: only admin/staff can hard-delete; guests cannot delete bookings
    if (role !== 'admin' && role !== 'staff') {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    await booking.destroy();
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err) {
    console.error(`[deleteBooking] Error:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Handle Maya Webhook for payment confirmation
 */
export async function handleMayaWebhook(req, res) {
  try {
    const { requestReferenceNumber, status, paymentStatus } = req.body;

    // In Maya, successful payments usually have paymentStatus === 'PAYMENT_SUCCESS'
    if (requestReferenceNumber && paymentStatus === 'PAYMENT_SUCCESS') {
      const booking = await Booking.findByPk(requestReferenceNumber);
      if (booking && booking.paymentStatus !== 'paid') {
        booking.paymentStatus = 'paid';
        booking.status = 'confirmed';
        await booking.save();

        await Notification.create({
          bookingId: booking.id,
          type: 'confirmed',
          message: `Payment received via Maya. Your booking (ID: ${booking.id}) has been confirmed!`
        });

        // Fetch guest details for email
        const guest = await Guest.findByPk(booking.guestId);
        if (guest && guest.email) {
          await emailService.sendPaymentSuccess(guest.email, guest.firstName, booking);
        }
      }
    }

    // Always return 200 OK so Maya knows we received it
    res.status(200).send('OK');
  } catch (err) {
    console.error("Maya Webhook Error:", err);
    res.status(500).send('Error');
  }
}
