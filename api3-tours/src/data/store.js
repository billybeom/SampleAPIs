// In-memory sample data store for Tours Management API
// Based on the nodetours data model (cruises, customers, bookings)

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
      {
        roomID: "INT",
        name: "Interior Cabin",
        description: "Comfortable interior cabin with all amenities",
        maxOccupancy: 2,
        pricePerNight: 120,
        currency: "USD",
      },
      {
        roomID: "BAL",
        name: "Balcony Cabin",
        description: "Spacious cabin with private balcony and sea view",
        maxOccupancy: 2,
        pricePerNight: 220,
        currency: "USD",
      },
      {
        roomID: "STE",
        name: "Suite",
        description: "Luxurious suite with panoramic ocean views and butler service",
        maxOccupancy: 4,
        pricePerNight: 550,
        currency: "USD",
      },
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
      {
        roomID: "INT",
        name: "Interior Cabin",
        description: "Cozy interior cabin with modern furnishings",
        maxOccupancy: 2,
        pricePerNight: 95,
        currency: "USD",
      },
      {
        roomID: "BAL",
        name: "Balcony Cabin",
        description: "Private balcony cabin overlooking the ocean",
        maxOccupancy: 2,
        pricePerNight: 185,
        currency: "USD",
      },
      {
        roomID: "STE",
        name: "Suite",
        description: "Premium suite with separate living area and ocean-view terrace",
        maxOccupancy: 4,
        pricePerNight: 420,
        currency: "USD",
      },
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
      {
        roomID: "INT",
        name: "Interior Cabin",
        description: "Warm and comfortable interior cabin",
        maxOccupancy: 2,
        pricePerNight: 140,
        currency: "USD",
      },
      {
        roomID: "BAL",
        name: "Balcony Cabin",
        description: "Private balcony — perfect for watching fjord scenery",
        maxOccupancy: 2,
        pricePerNight: 260,
        currency: "USD",
      },
      {
        roomID: "STE",
        name: "Suite",
        description: "Luxury suite with floor-to-ceiling windows for uninterrupted fjord views",
        maxOccupancy: 4,
        pricePerNight: 620,
        currency: "USD",
      },
    ],
  },
];

let customers = [
  {
    emailAddress: "alice@tours.com",
    firstName: "Alice",
    lastName: "Smith",
    phone: "+1-555-0101",
    address: {
      street: "123 Harbour View",
      city: "San Francisco",
      state: "CA",
      postalCode: "94101",
      country: "USA",
    },
    createdAt: "2024-01-15T10:00:00.000Z",
  },
  {
    emailAddress: "bob@tours.com",
    firstName: "Bob",
    lastName: "Johnson",
    phone: "+1-555-0102",
    address: {
      street: "456 Ocean Drive",
      city: "Miami",
      state: "FL",
      postalCode: "33101",
      country: "USA",
    },
    createdAt: "2024-02-20T14:30:00.000Z",
  },
  {
    emailAddress: "carol@tours.com",
    firstName: "Carol",
    lastName: "Williams",
    phone: "+44-20-7946-0103",
    address: {
      street: "789 Portside Lane",
      city: "London",
      state: "",
      postalCode: "EC1A 1BB",
      country: "UK",
    },
    createdAt: "2024-03-05T09:15:00.000Z",
  },
];

let bookings = [
  {
    bookingID: 1001,
    cruiseID: "CRUISE-001",
    customerID: "alice@tours.com",
    room: {
      roomID: "BAL",
      numRooms: 1,
    },
    status: "confirmed",
    bookedAt: "2024-11-01T08:00:00.000Z",
  },
  {
    bookingID: 1002,
    cruiseID: "CRUISE-003",
    customerID: "bob@tours.com",
    room: {
      roomID: "STE",
      numRooms: 1,
    },
    status: "confirmed",
    bookedAt: "2024-11-10T12:00:00.000Z",
  },
];

// Auto-incrementing booking ID counter
let nextBookingID = 1003;

function getNextBookingID() {
  return nextBookingID++;
}

module.exports = { cruises, customers, bookings, getNextBookingID };
