// In-memory data store — Tours GraphQL API (api4-graphql)
// api3-tours와 동일한 데이터 세트를 공유합니다.
// Product/Plan 카탈로그 관리 도메인도 함께 포함합니다.

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

// ── Products ──────────────────────────────────────────────────────────────────
// Product는 하나 이상의 Plan을 포함하는 API 상품 묶음입니다.
// 상태 흐름: draft → review → published / rejected
let products = [
  {
    productID: "PROD-001",
    name: "Library API Product",
    title: "Library Management API Product",
    description: "도서관 도서/대출 관리 API를 포함하는 기본 상품입니다.",
    version: "1.0.0",
    status: "published",     // draft | review | published | rejected | deprecated
    visibility: "public",    // public | authenticated | custom
    categories: ["library", "management"],
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2024-02-01T12:00:00.000Z",
    publishedAt: "2024-02-01T12:00:00.000Z",
    reviewNote: null,
    rejectionReason: null,
  },
  {
    productID: "PROD-002",
    name: "Tours GraphQL Product",
    title: "Tours & Cruise Management GraphQL Product",
    description: "크루즈 여행 예약 관리 GraphQL API를 포함하는 상품입니다.",
    version: "1.0.0",
    status: "published",
    visibility: "public",
    categories: ["tours", "travel", "graphql"],
    createdAt: "2024-03-01T10:00:00.000Z",
    updatedAt: "2024-04-15T14:30:00.000Z",
    publishedAt: "2024-04-15T14:30:00.000Z",
    reviewNote: null,
    rejectionReason: null,
  },
  {
    productID: "PROD-003",
    name: "Salary API Product",
    title: "Salary Management API Product (Draft)",
    description: "직원 연봉 관리 API를 포함하는 기업 내부용 상품입니다.",
    version: "1.0.0",
    status: "draft",
    visibility: "authenticated",
    categories: ["hr", "salary", "internal"],
    createdAt: "2024-05-01T08:00:00.000Z",
    updatedAt: "2024-05-01T08:00:00.000Z",
    publishedAt: null,
    reviewNote: null,
    rejectionReason: null,
  },
];

// ── Plans ─────────────────────────────────────────────────────────────────────
// Plan은 특정 Product의 사용 정책(요금, 호출 제한, 허용 API)을 정의합니다.
// 하나의 Product에 여러 Plan이 연결될 수 있습니다.
let plans = [
  {
    planID: "PLAN-001",
    productID: "PROD-001",   // 연결된 Product
    name: "free",
    title: "무료 체험 플랜",
    description: "분당 10회 호출 제한의 무료 플랜입니다. 개발·테스트 용도에 적합합니다.",
    rateLimit: { count: 10, interval: 1, unit: "minute" },
    burstLimit: null,
    price: { amount: 0, currency: "KRW", billingPeriod: null },
    features: ["도서 목록 조회", "도서 단건 조회"],
    status: "published",     // draft | review | published | deprecated
    approvalRequired: false,
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2024-02-01T12:00:00.000Z",
  },
  {
    planID: "PLAN-002",
    productID: "PROD-001",
    name: "standard",
    title: "표준 플랜",
    description: "분당 100회 호출 가능한 표준 플랜입니다. 소규모 서비스에 적합합니다.",
    rateLimit: { count: 100, interval: 1, unit: "minute" },
    burstLimit: { count: 150, interval: 1, unit: "minute" },
    price: { amount: 29000, currency: "KRW", billingPeriod: "monthly" },
    features: ["도서 CRUD 전체", "대출 관리", "고급 필터"],
    status: "published",
    approvalRequired: false,
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2024-02-01T12:00:00.000Z",
  },
  {
    planID: "PLAN-003",
    productID: "PROD-002",
    name: "graphql-basic",
    title: "GraphQL 기본 플랜",
    description: "시간당 500회 쿼리 가능한 기본 GraphQL 플랜입니다.",
    rateLimit: { count: 500, interval: 1, unit: "hour" },
    burstLimit: null,
    price: { amount: 0, currency: "KRW", billingPeriod: null },
    features: ["Query 전체", "기본 Mutation"],
    status: "published",
    approvalRequired: false,
    createdAt: "2024-03-01T10:00:00.000Z",
    updatedAt: "2024-04-15T14:30:00.000Z",
  },
  {
    planID: "PLAN-004",
    productID: "PROD-003",
    name: "enterprise",
    title: "기업 전용 플랜 (초안)",
    description: "무제한 호출, 전용 SLA 보장, 24/7 지원을 포함한 기업 플랜입니다.",
    rateLimit: { count: 10000, interval: 1, unit: "hour" },
    burstLimit: { count: 15000, interval: 1, unit: "hour" },
    price: { amount: 990000, currency: "KRW", billingPeriod: "monthly" },
    features: ["전체 API 접근", "RBAC 지원", "감사 로그", "전용 게이트웨이"],
    status: "draft",
    approvalRequired: true,
    createdAt: "2024-05-01T08:00:00.000Z",
    updatedAt: "2024-05-01T08:00:00.000Z",
  },
];

let nextProductSeq = 4;   // PROD-004 부터 시작
let nextPlanSeq    = 5;   // PLAN-005 부터 시작

// ── Product accessor helpers ──────────────────────────────────────────────────

function getProducts() { return products; }

function getProduct(id) {
  return products.find((p) => p.productID === id) || null;
}

function getProductsByStatus(status) {
  return products.filter((p) => p.status === status);
}

function createProduct(data) {
  const seqStr = String(nextProductSeq++).padStart(3, "0");
  const product = {
    productID: `PROD-${seqStr}`,
    ...data,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
    reviewNote: null,
    rejectionReason: null,
  };
  products.push(product);
  return product;
}

function updateProduct(id, updates) {
  const idx = products.findIndex((p) => p.productID === id);
  if (idx === -1) return null;
  products[idx] = {
    ...products[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return products[idx];
}

/**
 * Product 상태 전이.
 * 허용된 전이:
 *   draft      → review
 *   review     → published | rejected
 *   published  → deprecated
 *   rejected   → draft (수정 후 재제출)
 */
function transitionProductStatus(id, nextStatus, note) {
  const product = getProduct(id);
  if (!product) return { ok: false, reason: "Product를 찾을 수 없습니다." };

  const allowed = {
    draft:      ["review"],
    review:     ["published", "rejected"],
    published:  ["deprecated"],
    rejected:   ["draft"],
    deprecated: [],
  };

  if (!allowed[product.status] || !allowed[product.status].includes(nextStatus)) {
    return {
      ok: false,
      reason: `'${product.status}' 상태에서 '${nextStatus}'(으)로 전이할 수 없습니다. 허용: [${(allowed[product.status] || []).join(", ")}]`,
    };
  }

  const updates = { status: nextStatus };
  if (nextStatus === "review")      updates.reviewNote = note || null;
  if (nextStatus === "published")   updates.publishedAt = new Date().toISOString();
  if (nextStatus === "rejected")    updates.rejectionReason = note || null;
  if (nextStatus === "draft")       updates.rejectionReason = null;

  updateProduct(id, updates);
  return { ok: true };
}

function deleteProduct(id) {
  const idx = products.findIndex((p) => p.productID === id);
  if (idx === -1) return null;
  const [deleted] = products.splice(idx, 1);
  return deleted;
}

// ── Plan accessor helpers ──────────────────────────────────────────────────────

function getPlans() { return plans; }

function getPlan(id) {
  return plans.find((p) => p.planID === id) || null;
}

function getPlansByProduct(productID) {
  return plans.filter((p) => p.productID === productID);
}

function createPlan(data) {
  const seqStr = String(nextPlanSeq++).padStart(3, "0");
  const plan = {
    planID: `PLAN-${seqStr}`,
    ...data,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  plans.push(plan);
  return plan;
}

function updatePlan(id, updates) {
  const idx = plans.findIndex((p) => p.planID === id);
  if (idx === -1) return null;
  plans[idx] = {
    ...plans[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return plans[idx];
}

/**
 * Plan 상태 전이.
 * 허용된 전이:
 *   draft     → review
 *   review    → published | rejected
 *   published → deprecated
 *   rejected  → draft (재제출)
 */
function transitionPlanStatus(id, nextStatus, note) {
  const plan = getPlan(id);
  if (!plan) return { ok: false, reason: "Plan을 찾을 수 없습니다." };

  const allowed = {
    draft:      ["review"],
    review:     ["published", "rejected"],
    published:  ["deprecated"],
    rejected:   ["draft"],
    deprecated: [],
  };

  if (!allowed[plan.status] || !allowed[plan.status].includes(nextStatus)) {
    return {
      ok: false,
      reason: `'${plan.status}' 상태에서 '${nextStatus}'(으)로 전이할 수 없습니다. 허용: [${(allowed[plan.status] || []).join(", ")}]`,
    };
  }

  updatePlan(id, { status: nextStatus });
  return { ok: true };
}

function deletePlan(id) {
  const idx = plans.findIndex((p) => p.planID === id);
  if (idx === -1) return null;
  const [deleted] = plans.splice(idx, 1);
  return deleted;
}

module.exports = {
  getCruises, getCruise,
  getCustomers, getCustomer,
  getBookings, getBooking, getBookingsByCustomer, getBookingsByCruise,
  createCustomer, updateCustomer, deleteCustomer,
  createBooking, updateBooking, deleteBooking,
  // Product/Plan
  getProducts, getProduct, getProductsByStatus, createProduct, updateProduct,
  transitionProductStatus, deleteProduct,
  getPlans, getPlan, getPlansByProduct, createPlan, updatePlan,
  transitionPlanStatus, deletePlan,
};
