// Type resolvers — Tours GraphQL API (api4-graphql)
// Resolves computed/relational fields that cannot be derived from raw store objects alone.

const store = require("../data/store");

// ── Cruise type resolvers ────────────────────────────────────────────────────

const Cruise = {
  /** All bookings for this cruise (resolved from store) */
  bookings: (cruise) => store.getBookingsByCruise(cruise.cruiseID),

  /** Derived count — avoids a separate query */
  bookingCount: (cruise) => store.getBookingsByCruise(cruise.cruiseID).length,
};

// ── Customer type resolvers ──────────────────────────────────────────────────

const Customer = {
  /** Computed full name */
  fullName: (customer) => `${customer.firstName} ${customer.lastName}`,

  /** All bookings for this customer */
  bookings: (customer) => store.getBookingsByCustomer(customer.emailAddress),

  /** Derived count */
  bookingCount: (customer) =>
    store.getBookingsByCustomer(customer.emailAddress).length,
};

// ── Booking type resolvers ───────────────────────────────────────────────────

const Booking = {
  /** Resolve the associated Cruise object */
  cruise: (booking) => store.getCruise(booking.cruiseID),

  /** Resolve the associated Customer object */
  customer: (booking) => store.getCustomer(booking.customerID),
};

// ── BookedRoom type resolvers ────────────────────────────────────────────────

const BookedRoom = {
  /**
   * Resolve the room type details from the parent booking's cruise.
   * We need access to the booking's cruiseID — Apollo passes the parent
   * (BookedRoom) but we need to climb up. We store cruiseID on the raw
   * booking object; the booking raw data is the grandparent, so we pass
   * the entire booking as `_booking` context via the Booking.room resolver.
   *
   * However, since Apollo resolves BookedRoom from a Booking parent,
   * we need the cruiseID that lives on the booking. The cleanest approach:
   * store cruiseID directly on the BookedRoom object when we return it.
   * See Booking.room resolver below.
   */
  details: (bookedRoom) => {
    if (!bookedRoom._cruiseID) return null;
    const cruise = store.getCruise(bookedRoom._cruiseID);
    if (!cruise) return null;
    return cruise.roomTypes.find((rt) => rt.roomID === bookedRoom.roomID) || null;
  },
};

// Override Booking.room to attach _cruiseID onto the BookedRoom object
// so BookedRoom.details can resolve without a second context lookup.
Booking.room = (booking) => ({
  ...booking.room,
  _cruiseID: booking.cruiseID,
});

// ── Custom Scalar resolvers ──────────────────────────────────────────────────
// Apollo Server passes through String scalars by default.
// We declare them here for completeness; real validation could be added.

const { GraphQLScalarType, Kind } = require("graphql");

const DateScalar = new GraphQLScalarType({
  name: "Date",
  description: "ISO 8601 date string (YYYY-MM-DD)",
  serialize: (value) => String(value),
  parseValue: (value) => String(value),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? ast.value : null),
});

const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO 8601 datetime string (UTC)",
  serialize: (value) => String(value),
  parseValue: (value) => String(value),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? ast.value : null),
});

const EmailAddressScalar = new GraphQLScalarType({
  name: "EmailAddress",
  description: "RFC 5322 email address",
  serialize: (value) => String(value),
  parseValue: (value) => {
    const s = String(value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
      throw new Error(`Invalid email address: ${s}`);
    }
    return s;
  },
  parseLiteral: (ast) => {
    if (ast.kind !== Kind.STRING) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ast.value)) {
      throw new Error(`Invalid email address: ${ast.value}`);
    }
    return ast.value;
  },
});

// ── Product 타입 리졸버 ─────────────────────────────────────────────────────

const Product = {
  /** 연결된 Plan 목록 조회 */
  plans: (product) => store.getPlansByProduct(product.productID),

  /** 연결된 Plan 수 (파생 필드) */
  planCount: (product) => store.getPlansByProduct(product.productID).length,

  /** 스토어의 status(소문자) → GraphQL enum(대문자) 변환 */
  status: (product) => product.status ? product.status.toUpperCase() : "DRAFT",

  /** 스토어의 visibility(소문자) → GraphQL enum(대문자) 변환 */
  visibility: (product) => product.visibility ? product.visibility.toUpperCase() : "PUBLIC",
};

// ── Plan 타입 리졸버 ────────────────────────────────────────────────────────

const Plan = {
  /** 연결된 Product 객체 조회 */
  product: (plan) => store.getProduct(plan.productID),

  /** 스토어의 status(소문자) → GraphQL enum(대문자) 변환 */
  status: (plan) => plan.status ? plan.status.toUpperCase() : "DRAFT",

  /** rateLimit.unit 소문자 → 대문자 변환 */
  rateLimit: (plan) =>
    plan.rateLimit && plan.rateLimit.unit
      ? { ...plan.rateLimit, unit: plan.rateLimit.unit.toUpperCase() }
      : null,

  /** burstLimit.unit 소문자 → 대문자 변환 (null 허용) */
  burstLimit: (plan) =>
    plan.burstLimit && plan.burstLimit.unit
      ? { ...plan.burstLimit, unit: plan.burstLimit.unit.toUpperCase() }
      : null,
};

module.exports = {
  Cruise,
  Customer,
  Booking,
  BookedRoom,
  Product,
  Plan,
  Date: DateScalar,
  DateTime: DateTimeScalar,
  EmailAddress: EmailAddressScalar,
};
