// Query resolvers — Tours GraphQL API (api4-graphql)
// Product/Plan 카탈로그 Query 포함

const store = require("../data/store");

const Query = {
  // ── Cruise Queries ───────────────────────────────────────────────────────────

  cruises: (_parent, { filter = {}, pagination = {} }) => {
    let { offset = 0, limit = 20 } = pagination;
    if (offset < 0) offset = 0;
    if (limit < 1) limit = 20;
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
    let { offset = 0, limit = 20 } = pagination;
    if (offset < 0) offset = 0;
    if (limit < 1) limit = 20;
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
    let { offset = 0, limit = 20 } = pagination;
    if (offset < 0) offset = 0;
    if (limit < 1) limit = 20;
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

  // ── Product Queries ──────────────────────────────────────────────────────────

  /**
   * products — 필터·페이지네이션 지원 Product 목록 조회
   * filter: { status, visibility, category, nameSearch }
   */
  products: (_parent, { filter = {}, pagination = {} }) => {
    let { offset = 0, limit = 20 } = pagination;
    if (offset < 0) offset = 0;
    if (limit < 1) limit = 20;
    let items = store.getProducts();

    // 상태 필터 (enum은 대문자로 전달되므로 소문자로 비교)
    if (filter.status) {
      const s = filter.status.toLowerCase();
      items = items.filter((p) => p.status === s);
    }
    // 공개 범위 필터
    if (filter.visibility) {
      const v = filter.visibility.toLowerCase();
      items = items.filter((p) => p.visibility === v);
    }
    // 카테고리 부분 일치
    if (filter.category) {
      const q = filter.category.toLowerCase();
      items = items.filter((p) =>
        p.categories.some((c) => c.toLowerCase().includes(q))
      );
    }
    // 이름/제목 부분 일치
    if (filter.nameSearch) {
      const q = filter.nameSearch.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const paged = items.slice(offset, offset + limit);
    return { total, items: paged };
  },

  /** product — ID로 단건 조회 */
  product: (_parent, { productID }) => store.getProduct(productID),

  // ── Plan Queries ─────────────────────────────────────────────────────────────

  /**
   * plans — 필터·페이지네이션 지원 Plan 목록 조회
   * filter: { productID, status, freeOnly }
   */
  plans: (_parent, { filter = {}, pagination = {} }) => {
    let { offset = 0, limit = 20 } = pagination;
    if (offset < 0) offset = 0;
    if (limit < 1) limit = 20;
    let items = store.getPlans();

    // 특정 Product에 속한 Plan만
    if (filter.productID) {
      items = items.filter((p) => p.productID === filter.productID);
    }
    // 상태 필터
    if (filter.status) {
      const s = filter.status.toLowerCase();
      items = items.filter((p) => p.status === s);
    }
    // 무료 플랜만
    if (filter.freeOnly === true) {
      items = items.filter((p) => p.price && p.price.amount === 0);
    }

    const total = items.length;
    const paged = items.slice(offset, offset + limit);
    return { total, items: paged };
  },

  /** plan — ID로 단건 조회 */
  plan: (_parent, { planID }) => store.getPlan(planID),
};

module.exports = { Query };
