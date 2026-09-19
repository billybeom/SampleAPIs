// Mutation resolvers — Tours GraphQL API (api4-graphql)

const store = require("../data/store");

const Mutation = {
  // ── Customer Mutations ───────────────────────────────────────────────────────

  createCustomer: (_parent, { input }) => {
    const existing = store.getCustomer(input.emailAddress);
    if (existing) {
      return {
        success: false,
        message: `Customer with email '${input.emailAddress}' already exists.`,
        customer: null,
      };
    }
    const customer = store.createCustomer(input);
    return {
      success: true,
      message: "Customer created successfully.",
      customer,
    };
  },

  updateCustomer: (_parent, { emailAddress, input }) => {
    const customer = store.updateCustomer(emailAddress, input);
    if (!customer) {
      return {
        success: false,
        message: `Customer '${emailAddress}' not found.`,
        customer: null,
      };
    }
    return {
      success: true,
      message: "Customer updated successfully.",
      customer,
    };
  },

  deleteCustomer: (_parent, { emailAddress }) => {
    // Block deletion if the customer has active (PENDING/CONFIRMED) bookings
    const activeBookings = store
      .getBookingsByCustomer(emailAddress)
      .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED");
    if (activeBookings.length > 0) {
      return {
        success: false,
        message: `Cannot delete customer '${emailAddress}': ${activeBookings.length} active booking(s) exist.`,
        deletedId: emailAddress,
      };
    }

    const deleted = store.deleteCustomer(emailAddress);
    if (!deleted) {
      return {
        success: false,
        message: `Customer '${emailAddress}' not found.`,
        deletedId: emailAddress,
      };
    }
    return {
      success: true,
      message: "Customer deleted successfully.",
      deletedId: emailAddress,
    };
  },

  // ── Booking Mutations ────────────────────────────────────────────────────────

  createBooking: (_parent, { input }) => {
    const { cruiseID, customerID, room, numPassengers } = input;

    // Validate cruise exists
    const cruise = store.getCruise(cruiseID);
    if (!cruise) {
      return {
        success: false,
        message: `Cruise '${cruiseID}' not found.`,
        booking: null,
      };
    }

    // Validate customer exists
    const customer = store.getCustomer(customerID);
    if (!customer) {
      return {
        success: false,
        message: `Customer '${customerID}' not found.`,
        booking: null,
      };
    }

    // Validate roomID exists in the cruise's roomTypes
    const roomType = cruise.roomTypes.find((rt) => rt.roomID === room.roomID);
    if (!roomType) {
      return {
        success: false,
        message: `Room type '${room.roomID}' is not available on cruise '${cruiseID}'.`,
        booking: null,
      };
    }

    // Validate numRooms >= 1
    if (room.numRooms < 1) {
      return {
        success: false,
        message: "numRooms must be at least 1.",
        booking: null,
      };
    }

    // Validate numPassengers >= 1
    if (numPassengers < 1) {
      return {
        success: false,
        message: "numPassengers must be at least 1.",
        booking: null,
      };
    }

    const booking = store.createBooking({ cruiseID, customerID, room, numPassengers });
    return {
      success: true,
      message: "Booking created successfully.",
      booking,
    };
  },

  updateBooking: (_parent, { bookingID, input }) => {
    const existing = store.getBooking(bookingID);
    if (!existing) {
      return {
        success: false,
        message: `Booking '${bookingID}' not found.`,
        booking: null,
      };
    }

    // Cannot modify COMPLETED or CANCELLED bookings
    if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
      return {
        success: false,
        message: `Booking '${bookingID}' has status '${existing.status}' and cannot be modified.`,
        booking: existing,
      };
    }

    // If changing roomID, validate it exists on the cruise
    if (input.room && input.room.roomID) {
      const cruise = store.getCruise(existing.cruiseID);
      const roomType = cruise && cruise.roomTypes.find((rt) => rt.roomID === input.room.roomID);
      if (!roomType) {
        return {
          success: false,
          message: `Room type '${input.room.roomID}' is not available on cruise '${existing.cruiseID}'.`,
          booking: existing,
        };
      }
    }

    const booking = store.updateBooking(bookingID, input);
    return {
      success: true,
      message: "Booking updated successfully.",
      booking,
    };
  },

  deleteBooking: (_parent, { bookingID }) => {
    const existing = store.getBooking(bookingID);
    if (!existing) {
      return {
        success: false,
        message: `Booking '${bookingID}' not found.`,
        deletedId: bookingID,
      };
    }

    // Cannot delete COMPLETED bookings
    if (existing.status === "COMPLETED") {
      return {
        success: false,
        message: `Booking '${bookingID}' has status 'COMPLETED' and cannot be deleted.`,
        deletedId: bookingID,
      };
    }

    store.deleteBooking(bookingID);
    return {
      success: true,
      message: "Booking cancelled and deleted successfully.",
      deletedId: bookingID,
    };
  },
};

module.exports = { Mutation };
