// Mutation resolvers — Tours GraphQL API (api4-graphql)
// Product/Plan 카탈로그 Mutation 포함

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

    // Validate numPassengers >= 1
    if (input.numPassengers !== undefined && input.numPassengers < 1) {
      return {
        success: false,
        message: "numPassengers must be at least 1.",
        booking: existing,
      };
    }

    // Validate numRooms >= 1
    if (input.room && input.room.numRooms !== undefined && input.room.numRooms < 1) {
      return {
        success: false,
        message: "numRooms must be at least 1.",
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

  // ── Product Mutations ────────────────────────────────────────────────────────

  /**
   * createProduct — 새 Product 생성 (draft 상태)
   * 동일 name이 이미 존재하면 에러 반환
   */
  createProduct: (_parent, { input }) => {
    // 필수 필드 검사
    if (!input.name || !input.title || !input.description) {
      return {
        success: false,
        message: "name, title, description은 필수 입력 항목입니다.",
        product: null,
      };
    }

    // name URL-safe 형식 검사
    if (!/^[a-z0-9-]+$/.test(input.name)) {
      return {
        success: false,
        message: "name은 영문 소문자, 숫자, 하이픈(-)만 포함된 URL-safe 형식이어야 합니다.",
        product: null,
      };
    }

    // 중복 name 검사
    const duplicate = store.getProducts().find((p) => p.name === input.name);
    if (duplicate) {
      return {
        success: false,
        message: `'${input.name}' 이름의 Product가 이미 존재합니다.`,
        product: null,
      };
    }

    const product = store.createProduct({
      name:        input.name,
      title:       input.title,
      description: input.description,
      version:     input.version     || "1.0.0",
      visibility:  (input.visibility || "PUBLIC").toLowerCase(),
      categories:  input.categories  || [],
    });

    return {
      success: true,
      message: `Product '${product.productID}' 가 초안(DRAFT) 상태로 생성되었습니다.`,
      product,
    };
  },

  /**
   * updateProduct — 기존 Product 수정
   * DRAFT 또는 REJECTED 상태에서만 수정 가능
   */
  updateProduct: (_parent, { productID, input }) => {
    const product = store.getProduct(productID);
    if (!product) {
      return {
        success: false,
        message: `Product '${productID}'를 찾을 수 없습니다.`,
        product: null,
      };
    }

    if (product.status !== "draft" && product.status !== "rejected") {
      return {
        success: false,
        message: `'${product.status}' 상태의 Product는 수정할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 수정이 가능합니다.`,
        product,
      };
    }

    if (input.visibility !== undefined && input.visibility !== null) {
      const VALID_VISIBILITY = ["PUBLIC", "AUTHENTICATED", "CUSTOM"];
      if (!VALID_VISIBILITY.includes(input.visibility.toUpperCase())) {
        return {
          success: false,
          message: `visibility는 [${VALID_VISIBILITY.join(", ")}] 중 하나여야 합니다.`,
          product,
        };
      }
    }

    const updates = {};
    if (input.title       !== undefined) updates.title       = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.version     !== undefined) updates.version     = input.version;
    if (input.visibility  !== undefined) updates.visibility  = input.visibility ? input.visibility.toLowerCase() : "public";
    if (input.categories  !== undefined) updates.categories  = input.categories;

    const updated = store.updateProduct(productID, updates);
    return {
      success: true,
      message: `Product '${productID}'가 수정되었습니다.`,
      product: updated,
    };
  },

  /**
   * submitProductForReview — Product를 REVIEW 상태로 제출
   * DRAFT 상태에서만 가능
   */
  submitProductForReview: (_parent, { productID, note }) => {
    const result = store.transitionProductStatus(productID, "review", note);
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        product: store.getProduct(productID),
      };
    }
    return {
      success: true,
      message: `Product '${productID}'가 검토 요청(REVIEW) 상태로 전환되었습니다.`,
      product: store.getProduct(productID),
    };
  },

  /**
   * publishProduct — Product를 PUBLISHED 상태로 배포
   * REVIEW 상태에서만 가능
   */
  publishProduct: (_parent, { productID }) => {
    const result = store.transitionProductStatus(productID, "published");
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        product: store.getProduct(productID),
      };
    }
    return {
      success: true,
      message: `Product '${productID}'가 성공적으로 게시(PUBLISHED)되었습니다.`,
      product: store.getProduct(productID),
    };
  },

  /**
   * rejectProduct — Product를 REJECTED 상태로 전환
   * REVIEW 상태에서만 가능
   */
  rejectProduct: (_parent, { productID, reason }) => {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: "거절 사유(reason)는 필수 입력 항목입니다.",
        product: store.getProduct(productID),
      };
    }
    const result = store.transitionProductStatus(productID, "rejected", reason);
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        product: store.getProduct(productID),
      };
    }
    return {
      success: true,
      message: `Product '${productID}'가 거절(REJECTED) 처리되었습니다.`,
      product: store.getProduct(productID),
    };
  },

  /**
   * deprecateProduct — Product를 DEPRECATED 상태로 전환
   * PUBLISHED 상태에서만 가능
   */
  deprecateProduct: (_parent, { productID }) => {
    const result = store.transitionProductStatus(productID, "deprecated");
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        product: store.getProduct(productID),
      };
    }
    return {
      success: true,
      message: `Product '${productID}'가 사용 중단(DEPRECATED) 처리되었습니다.`,
      product: store.getProduct(productID),
    };
  },

  /**
   * deleteProduct — Product 삭제
   * DRAFT 또는 REJECTED 상태에서만 삭제 가능 (PUBLISHED 보호)
   * 연결된 Plan이 있으면 함께 삭제
   */
  deleteProduct: (_parent, { productID }) => {
    const product = store.getProduct(productID);
    if (!product) {
      return {
        success: false,
        message: `Product '${productID}'를 찾을 수 없습니다.`,
        deletedId: productID,
      };
    }

    if (product.status !== "draft" && product.status !== "rejected") {
      return {
        success: false,
        message: `'${product.status}' 상태의 Product는 삭제할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 삭제가 가능합니다.`,
        deletedId: productID,
      };
    }

    // 연결된 Plan도 함께 삭제
    const relatedPlans = store.getPlansByProduct(productID);
    relatedPlans.forEach((p) => store.deletePlan(p.planID));

    store.deleteProduct(productID);
    return {
      success: true,
      message: `Product '${productID}' 및 연결된 ${relatedPlans.length}개 Plan이 삭제되었습니다.`,
      deletedId: productID,
    };
  },

  // ── Plan Mutations ───────────────────────────────────────────────────────────

  /**
   * createPlan — 새 Plan 생성 (draft 상태)
   * 연결된 Product가 존재해야 하며, 동일 name이 같은 Product 내에 없어야 함
   */
  createPlan: (_parent, { input }) => {
    // 연결 Product 존재 여부 검사
    const product = store.getProduct(input.productID);
    if (!product) {
      return {
        success: false,
        message: `Product '${input.productID}'를 찾을 수 없습니다.`,
        plan: null,
      };
    }

    // 필수 필드 검사
    if (!input.name || !input.title || !input.description) {
      return {
        success: false,
        message: "name, title, description은 필수 입력 항목입니다.",
        plan: null,
      };
    }

    // name URL-safe 형식 검사
    if (!/^[a-z0-9-]+$/.test(input.name)) {
      return {
        success: false,
        message: "name은 영문 소문자, 숫자, 하이픈(-)만 포함된 URL-safe 형식이어야 합니다.",
        plan: null,
      };
    }

    // rateLimit 유효성 검사
    if (!input.rateLimit || input.rateLimit.count < 1 || input.rateLimit.interval < 1) {
      return {
        success: false,
        message: "rateLimit.count 및 rateLimit.interval은 1 이상이어야 합니다.",
        plan: null,
      };
    }

    // burstLimit 유효성 검사 (선택 필드)
    if (input.burstLimit && (input.burstLimit.count < 1 || input.burstLimit.interval < 1)) {
      return {
        success: false,
        message: "burstLimit.count 및 burstLimit.interval은 1 이상이어야 합니다.",
        plan: null,
      };
    }

    // price 유효성 검사
    if (input.price && input.price.amount < 0) {
      return {
        success: false,
        message: "price.amount는 0 이상의 숫자여야 합니다.",
        plan: null,
      };
    }

    // 같은 Product 내 중복 name 검사
    const existingPlans = store.getPlansByProduct(input.productID);
    const duplicate = existingPlans.find((p) => p.name === input.name);
    if (duplicate) {
      return {
        success: false,
        message: `Product '${input.productID}' 내에 '${input.name}' 이름의 Plan이 이미 존재합니다.`,
        plan: null,
      };
    }

    const plan = store.createPlan({
      productID:       input.productID,
      name:            input.name,
      title:           input.title,
      description:     input.description,
      rateLimit:       { ...input.rateLimit, unit: input.rateLimit.unit.toLowerCase() },
      burstLimit:      input.burstLimit
                         ? { ...input.burstLimit, unit: input.burstLimit.unit.toLowerCase() }
                         : null,
      price:           input.price,
      features:        input.features || [],
      approvalRequired: input.approvalRequired === true,
    });

    return {
      success: true,
      message: `Plan '${plan.planID}'가 초안(DRAFT) 상태로 생성되었습니다.`,
      plan,
    };
  },

  /**
   * updatePlan — 기존 Plan 수정
   * DRAFT 또는 REJECTED 상태에서만 수정 가능
   */
  updatePlan: (_parent, { planID, input }) => {
    const plan = store.getPlan(planID);
    if (!plan) {
      return {
        success: false,
        message: `Plan '${planID}'를 찾을 수 없습니다.`,
        plan: null,
      };
    }

    if (plan.status !== "draft" && plan.status !== "rejected") {
      return {
        success: false,
        message: `'${plan.status}' 상태의 Plan은 수정할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 수정이 가능합니다.`,
        plan,
      };
    }

    // rateLimit 유효성 검사
    if (input.rateLimit !== undefined && input.rateLimit !== null) {
      if (input.rateLimit.count < 1 || input.rateLimit.interval < 1) {
        return {
          success: false,
          message: "rateLimit.count 및 rateLimit.interval은 1 이상이어야 합니다.",
          plan,
        };
      }
    }

    // burstLimit 유효성 검사
    if (input.burstLimit !== undefined && input.burstLimit !== null) {
      if (input.burstLimit.count < 1 || input.burstLimit.interval < 1) {
        return {
          success: false,
          message: "burstLimit.count 및 burstLimit.interval은 1 이상이어야 합니다.",
          plan,
        };
      }
    }

    // price 유효성 검사
    if (input.price !== undefined && input.price !== null) {
      if (input.price.amount < 0) {
        return {
          success: false,
          message: "price.amount는 0 이상의 숫자여야 합니다.",
          plan,
        };
      }
    }

    const updates = {};
    if (input.title           !== undefined) updates.title           = input.title;
    if (input.description     !== undefined) updates.description     = input.description;
    if (input.features        !== undefined) updates.features        = input.features;
    if (input.approvalRequired !== undefined) updates.approvalRequired = input.approvalRequired;
    if (input.rateLimit       !== undefined) {
      updates.rateLimit = input.rateLimit
        ? { ...input.rateLimit, unit: input.rateLimit.unit.toLowerCase() }
        : null;
    }
    if (input.burstLimit      !== undefined) {
      updates.burstLimit = input.burstLimit
        ? { ...input.burstLimit, unit: input.burstLimit.unit.toLowerCase() }
        : null;
    }
    if (input.price           !== undefined) updates.price = input.price;

    const updated = store.updatePlan(planID, updates);
    return {
      success: true,
      message: `Plan '${planID}'가 수정되었습니다.`,
      plan: updated,
    };
  },

  /**
   * submitPlanForReview — Plan을 REVIEW 상태로 제출
   */
  submitPlanForReview: (_parent, { planID }) => {
    const result = store.transitionPlanStatus(planID, "review");
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        plan: store.getPlan(planID),
      };
    }
    return {
      success: true,
      message: `Plan '${planID}'가 검토 요청(REVIEW) 상태로 전환되었습니다.`,
      plan: store.getPlan(planID),
    };
  },

  /**
   * publishPlan — Plan을 PUBLISHED 상태로 배포
   */
  publishPlan: (_parent, { planID }) => {
    const result = store.transitionPlanStatus(planID, "published");
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        plan: store.getPlan(planID),
      };
    }
    return {
      success: true,
      message: `Plan '${planID}'가 성공적으로 게시(PUBLISHED)되었습니다.`,
      plan: store.getPlan(planID),
    };
  },

  /**
   * rejectPlan — Plan을 REJECTED 상태로 전환
   */
  rejectPlan: (_parent, { planID, reason }) => {
    if (!reason || !reason.trim()) {
      return {
        success: false,
        message: "거절 사유(reason)는 필수 입력 항목입니다.",
        plan: store.getPlan(planID),
      };
    }
    const result = store.transitionPlanStatus(planID, "rejected");
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        plan: store.getPlan(planID),
      };
    }
    return {
      success: true,
      message: `Plan '${planID}'가 거절(REJECTED) 처리되었습니다.`,
      plan: store.getPlan(planID),
    };
  },

  /**
   * deprecatePlan — Plan을 DEPRECATED 상태로 전환
   */
  deprecatePlan: (_parent, { planID }) => {
    const result = store.transitionPlanStatus(planID, "deprecated");
    if (!result.ok) {
      return {
        success: false,
        message: result.reason,
        plan: store.getPlan(planID),
      };
    }
    return {
      success: true,
      message: `Plan '${planID}'가 사용 중단(DEPRECATED) 처리되었습니다.`,
      plan: store.getPlan(planID),
    };
  },

  /**
   * deletePlan — Plan 삭제
   * DRAFT 또는 REJECTED 상태에서만 가능
   */
  deletePlan: (_parent, { planID }) => {
    const plan = store.getPlan(planID);
    if (!plan) {
      return {
        success: false,
        message: `Plan '${planID}'를 찾을 수 없습니다.`,
        deletedId: planID,
      };
    }

    if (plan.status !== "draft" && plan.status !== "rejected") {
      return {
        success: false,
        message: `'${plan.status}' 상태의 Plan은 삭제할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 삭제가 가능합니다.`,
        deletedId: planID,
      };
    }

    store.deletePlan(planID);
    return {
      success: true,
      message: `Plan '${planID}'가 삭제되었습니다.`,
      deletedId: planID,
    };
  },
};

module.exports = { Mutation };
