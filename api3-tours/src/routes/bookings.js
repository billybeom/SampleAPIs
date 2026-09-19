const express = require("express");
const router = express.Router();
const db = require("../data/store");

/**
 * GET /bookings
 * Query params: cruiseID, customerID
 */
router.get("/", (req, res) => {
  let result = [...db.bookings];
  const { cruiseID, customerID } = req.query;

  if (cruiseID) {
    result = result.filter((b) => b.cruiseID === cruiseID);
  }
  if (customerID) {
    result = result.filter((b) => b.customerID === customerID);
  }

  res.json({ total: result.length, data: result });
});

/**
 * POST /bookings
 * Body: { cruiseID, customerID, room: { roomID, numRooms } }
 * Validates that cruiseID and customerID exist.
 */
router.post("/", (req, res) => {
  const { cruiseID, customerID, room } = req.body;

  if (!cruiseID || !customerID || !room || !room.roomID) {
    return res.status(400).json({
      error: "cruiseID, customerID, and room.roomID are required fields",
    });
  }

  const cruise = db.cruises.find((c) => c.cruiseID === cruiseID);
  if (!cruise) {
    return res.status(404).json({ error: "Cruise not found", cruiseID });
  }

  const customer = db.customers.find((c) => c.emailAddress === customerID);
  if (!customer) {
    return res
      .status(404)
      .json({ error: "Customer not found", customerID });
  }

  // Validate roomID exists for this cruise
  const roomType = cruise.roomTypes.find((r) => r.roomID === room.roomID);
  if (!roomType) {
    return res.status(400).json({
      error: "Invalid roomID for this cruise",
      roomID: room.roomID,
      availableRooms: cruise.roomTypes.map((r) => r.roomID),
    });
  }

  const newBooking = {
    bookingID: db.getNextBookingID(),
    cruiseID,
    customerID,
    room: {
      roomID: room.roomID,
      numRooms: room.numRooms || 1,
    },
    status: "confirmed",
    bookedAt: new Date().toISOString(),
  };

  db.bookings.push(newBooking);
  res.status(201).json(newBooking);
});

/**
 * GET /bookings/:id
 * Path param: id = bookingID (integer)
 */
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = db.bookings.find((b) => b.bookingID === id);
  if (!booking) {
    return res
      .status(404)
      .json({ error: "Booking not found", bookingID: id });
  }
  res.json(booking);
});

/**
 * PUT /bookings/:id  – full update
 * Allows updating room and status.
 */
router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = db.bookings.findIndex((b) => b.bookingID === id);
  if (idx === -1) {
    return res
      .status(404)
      .json({ error: "Booking not found", bookingID: id });
  }

  const { room, status } = req.body;
  const existing = db.bookings[idx];

  // If updating room, validate the roomID against the cruise
  if (room && room.roomID) {
    const cruise = db.cruises.find((c) => c.cruiseID === existing.cruiseID);
    const roomType = cruise
      ? cruise.roomTypes.find((r) => r.roomID === room.roomID)
      : null;
    if (!roomType) {
      return res.status(400).json({
        error: "Invalid roomID for this cruise",
        roomID: room.roomID,
      });
    }
  }

  db.bookings[idx] = {
    ...existing,
    room: room ?? existing.room,
    status: status ?? existing.status,
  };

  res.json(db.bookings[idx]);
});

/**
 * DELETE /bookings/:id
 * Path param: id = bookingID (integer)
 */
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = db.bookings.findIndex((b) => b.bookingID === id);
  if (idx === -1) {
    return res
      .status(404)
      .json({ error: "Booking not found", bookingID: id });
  }

  const [deleted] = db.bookings.splice(idx, 1);
  res.json({ message: "Booking deleted successfully", booking: deleted });
});

module.exports = router;
