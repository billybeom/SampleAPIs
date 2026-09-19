// In-memory data store — Tours GraphQL API (api4-graphql)
// api3-tours와 동일한 데이터 세트를 공유합니다.

const { v4: uuidv4 } = require("uuid");

// ── Cruises ───────────────────────────────────────────────────────────────────
let cruises = [
  {
    cruiseID: "CRUISE-001",
    title: "Mediterranean Discovery",
    description:
      "Experience the breathtaking beauty of the Mediterranean — from the azure waters of the Côte d'Azur to the ancient ruins of Rome and Athens.",
    startDate: "2025-06-01",
    endDate: "2025-06-15",
    startPort: "Barcelona",
    numDays: 14,
    roomTypes: [
      { roomID: "INT", name: "Interior Cabin",  description: "Comfortable interior cabin with all amenities",                             maxOccupancy: 2, pricePerNight: 120, currency: "USD" },
      { roomID: "BAL", name: "Balcony Cabin",   description: "Spacious cabin with private balcony and sea view",                         maxOccupancy: 2, pricePerNight: 220, currency: "USD" },
      { roomID: "STE", name: "Suite",           description: "Luxurious suite with panoramic ocean views and butler service",            maxOccupancy: 4, pricePerNight: 550, currency: "USD" },
    ],
  },
  {
    cruiseID: "CRUISE-002",
    title: "Caribbean Paradise",
    description:
      "Sail through turquoise Caribbean waters, visiting tropical islands of Jamaica, the Bahamas, and the US Virgin Islands.",
    startDate: "2025-08-10",
    endDate: "2025-08-17",
    startPort: "Miami",
    numDays: 7,
    roomTypes: [
      { roomID: "INT", name: "Interior Cabin",  description: "Cozy interior cabin with modern furnishings",                              maxOccupancy: 2, pricePerNight:  95, currency: "USD" },
      { roomID: "BAL", name: "Balcony Cabin",   description: "Private balcony cabin overlooking the ocean",                             maxOccupancy: 2, pricePerNight: 185, currency: "USD" },
      { roomID: "STE", name: "Suite",           description: "Premium suite with separate living area and ocean-view terrace",          maxOccupancy: 4, pricePerNight: 420, currency: "USD" },
    ],
  },
  {
    cruiseID: "CRUISE-003",
    title: "Northern Europe Fjords",
    description:
      "Discover the dramatic scenery of Norway's fjords, Viking history in Bergen, and the magical Northern Lights over Iceland.",
    startDate: "2025-09-05",
    endDate: "2025-09-16",
    startPort: "Copenhagen",
    numDays: 11,
    roomTypes: [
      { roomID: "INT", name: "Interior Cabin",  description: "Warm and comfortable interior cabin",                                     maxOccupancy: 2, pricePerNight: 140, currency: "USD" },
      { roomID: "BAL", name: "Balcony Cabin",   description: "Private balcony — perfect for watching fjord scenery",                    maxOccupancy: 2, pricePerNight: 260, currency: "USD" },
      { roomID: "STE", name: "Suite",           description: "Luxury suite with floor-to-ceiling windows for uninterrupted fjord views", maxOccupancy: 4, pricePerNight: 620, currency: "USD" },
    ],
  },
];

// ── Customers ─────────────────────────────────────────────────────────────────
let customers = [
  {
    emailAddress: "alice@tours.com",
    firstName: "Alice",
    lastName: "Smith",
    phone: "+1-555-0101",
    address: { street: "123 Harbour View", city: "San Francisco", state: "CA", postalCode: "94101", country: "USA" },
    createdAt: "2024-01-15T10:00:00.000Z",
  },
  {
    emailAddress: "bob@tours.com",
    firstName: "Bob",
    lastName: "Johnson",
    phone: "+1-555-0102",
    address: { street: "456 Ocean Drive", city: "Miami", state: "FL", postalCode: "33101", country: "USA" },
    createdAt: "2024-02-20T14:30:00.000Z",
  },
  {
    emailAddress: "carol@tours.com",
    firstName: "Carol",
    lastName: "Williams",
    phone: "+44-20-7946-0103",
    address: { street: "789 Portside Lane", city: "London", state: "", postalCode: "EC1A 1BB", country: "GBR" },
    createdAt: "2024-03-05T09:15:00.000Z",
  },
];

// ── Bookings ──────────────────────────────────────────────────────────────────
let bookings = [
  {
    bookingID: "1001",
    cruiseID: "CRUISE-001",
    customerID: "alice@tours.com",
    room: { roomID: "BAL", numRooms: 1 },
    numPassengers: 2,
    status: "CONFIRMED",
    bookedAt: "2024-11-01T08:00:00.000Z",
    updatedAt: null,
  },
  {
    bookingID: "1002",
    cruiseID: "CRUISE-003",
    customerID: "bob@tours.com",
    room: { roomID: "STE", numRooms: 1 },
    numPassengers: 2,
    status: "CONFIRMED",
    bookedAt: "2024-11-10T12:00:00.000Z",
    updatedAt: null,
  },
];

let nextBookingID = 1003;

// ── Accessor helpers ──────────────────────────────────────────────────────────

function getCruises() { return cruises; }
function getCruise(id) { return cruises.find((c) => c.cruiseID === id) || null; }

function getCustomers() { return customers; }
function getCustomer(email) { return customers.find((c) => c.emailAddress === email) || null; }

function getBookings() { return bookings; }
function getBooking(id) { return bookings.find((b) => b.bookingID === String(id)) || null; }
function getBookingsByCustomer(email) { return bookings.filter((b) => b.customerID === email); }
function getBookingsByCruise(cruiseID) { return bookings.filter((b) => b.cruiseID === cruiseID); }

function createCustomer(data) {
  const customer = { ...data, createdAt: new Date().toISOString() };
  customers.push(customer);
  return customer;
}

function updateCustomer(email, updates) {
  const idx = customers.findIndex((c) => c.emailAddress === email);
  if (idx === -1) return null;
  customers[idx] = {
    ...customers[idx],
    ...updates,
    address: updates.address ? { ...customers[idx].address, ...updates.address } : customers[idx].address,
  };
  return customers[idx];
}

function deleteCustomer(email) {
  const idx = customers.findIndex((c) => c.emailAddress === email);
  if (idx === -1) return null;
  const [deleted] = customers.splice(idx, 1);
  return deleted;
}

function createBooking(data) {
  const booking = {
    bookingID: String(nextBookingID++),
    ...data,
    status: "CONFIRMED",
    bookedAt: new Date().toISOString(),
    updatedAt: null,
  };
  bookings.push(booking);
  return booking;
}

function updateBooking(id, updates) {
  const idx = bookings.findIndex((b) => b.bookingID === String(id));
  if (idx === -1) return null;
  bookings[idx] = {
    ...bookings[idx],
    ...updates,
    room: updates.room ? { ...bookings[idx].room, ...updates.room } : bookings[idx].room,
    updatedAt: new Date().toISOString(),
  };
  return bookings[idx];
}

function deleteBooking(id) {
  const idx = bookings.findIndex((b) => b.bookingID === String(id));
  if (idx === -1) return null;
  const [deleted] = bookings.splice(idx, 1);
  return deleted;
}

module.exports = {
  getCruises, getCruise,
  getCustomers, getCustomer,
  getBookings, getBooking, getBookingsByCustomer, getBookingsByCruise,
  createCustomer, updateCustomer, deleteCustomer,
  createBooking, updateBooking, deleteBooking,
};
