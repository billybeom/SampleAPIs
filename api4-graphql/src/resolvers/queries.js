// Query resolvers — Tours GraphQL API (api4-graphql)

const store = require("../data/store");

const Query = {
  // ── Cruise Queries ───────────────────────────────────────────────────────────

  cruises: (_parent, { filter = {}, pagination = {} }) => {
    const { offset = 0, limit = 20 } = pagination;
    let items = store.getCruises();

    if (filter.startPort) {
      const q = filter.startPort.toLowerCase();
      items = items.filter((c) => c.startPort.toLowerCase().includes(q));
    }
    if (filter.startDateFrom) {
      items = items.filter((c) => c.startDate >= filter.startDateFrom);
    }
    if (filter.startDateTo) {
      items = items.filter((c) => c.startDate <= filter.startDateTo);
    }
    if (filter.minNumDays !== undefined && filter.minNumDays !== null) {
      items = items.filter((c) => c.numDays >= filter.minNumDays);
    }
    if (filter.maxNumDays !== undefined && filter.maxNumDays !== null) {
      items = items.filter((c) => c.numDays <= filter.maxNumDays);
    }

    const total = items.length;
    const paged = items.slice(offset, offset + limit);
    return { total, items: paged };
  },

  cruise: (_parent, { cruiseID }) => store.getCruise(cruiseID),

  // ── Customer Queries ─────────────────────────────────────────────────────────

  customers: (_parent, { filter = {}, pagination = {} }) => {
    const { offset = 0, limit = 20 } = pagination;
    let items = store.getCustomers();

    if (filter.country) {
      items = items.filter((c) => c.address.country === filter.country);
    }
    if (filter.nameSearch) {
      const q = filter.nameSearch.toLowerCase();
      items = items.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const paged = items.slice(offset, offset + limit);
    return { total, items: paged };
  },

  customer: (_parent, { emailAddress }) => store.getCustomer(emailAddress),

  // ── Booking Queries ──────────────────────────────────────────────────────────

  bookings: (_parent, { filter = {}, pagination = {} }) => {
    const { offset = 0, limit = 20 } = pagination;
    let items = store.getBookings();

    if (filter.cruiseID) {
      items = items.filter((b) => b.cruiseID === filter.cruiseID);
    }
    if (filter.customerID) {
      items = items.filter((b) => b.customerID === filter.customerID);
    }
    if (filter.status) {
      items = items.filter((b) => b.status === filter.status);
    }

    const total = items.length;
    const paged = items.slice(offset, offset + limit);
    return { total, items: paged };
  },

  booking: (_parent, { bookingID }) => store.getBooking(bookingID),
};

module.exports = { Query };
