// In-memory 카탈로그 데이터 스토어 — api1-library
// Product 와 Plan 도메인을 관리합니다.
//
// 상태 흐름:
//   Product/Plan: draft → review → published / rejected → draft (재제출)
//                 published → deprecated

// ── Products ──────────────────────────────────────────────────────────────────
let products = [
  {
    id: "PROD-001",
    name: "library-api-product",
    title: "Library Management API Product",
    description: "도서관 도서/대출 관리 API를 포함하는 기본 상품입니다.",
    version: "1.0.0",
    status: "published",      // draft | review | published | rejected | deprecated
    visibility: "public",     // public | authenticated | custom
    categories: ["library", "management"],
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2024-02-01T12:00:00.000Z",
    publishedAt: "2024-02-01T12:00:00.000Z",
    reviewNote: null,
    rejectionReason: null,
  },
  {
    id: "PROD-002",
    name: "library-premium-product",
    title: "Library Premium API Product",
    description: "고급 도서 분석 및 추천 기능이 포함된 프리미엄 상품입니다.",
    version: "1.0.0",
    status: "draft",
    visibility: "authenticated",
    categories: ["library", "analytics", "premium"],
    createdAt: "2024-06-01T10:00:00.000Z",
    updatedAt: "2024-06-01T10:00:00.000Z",
    publishedAt: null,
    reviewNote: null,
    rejectionReason: null,
  },
];

// ── Plans ─────────────────────────────────────────────────────────────────────
let plans = [
  {
    id: "PLAN-001",
    productId: "PROD-001",   // 연결된 Product
    name: "free",
    title: "무료 체험 플랜",
    description: "분당 10회 호출 제한의 무료 플랜입니다. 개발·테스트 용도에 적합합니다.",
    rateLimit: { count: 10, interval: 1, unit: "minute" },
    burstLimit: null,
    price: { amount: 0, currency: "KRW", billingPeriod: null },
    features: ["도서 목록 조회", "도서 단건 조회"],
    status: "published",
    approvalRequired: false,
    createdAt: "2024-01-10T09:00:00.000Z",
    updatedAt: "2024-02-01T12:00:00.000Z",
  },
  {
    id: "PLAN-002",
    productId: "PROD-001",
    name: "standard",
    title: "표준 플랜",
    description: "분당 100회 호출 가능한 표준 플랜입니다.",
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
    id: "PLAN-003",
    productId: "PROD-002",
    name: "analytics-beta",
    title: "분석 기능 베타 플랜 (초안)",
    description: "도서 분석·추천 API 베타 접근 플랜입니다.",
    rateLimit: { count: 50, interval: 1, unit: "minute" },
    burstLimit: null,
    price: { amount: 9900, currency: "KRW", billingPeriod: "monthly" },
    features: ["도서 분석", "추천 API"],
    status: "draft",
    approvalRequired: true,
    createdAt: "2024-06-01T10:00:00.000Z",
    updatedAt: "2024-06-01T10:00:00.000Z",
  },
];

let nextProductSeq = 3;  // PROD-003 부터
let nextPlanSeq    = 4;  // PLAN-004 부터

// ── 유효한 상태 전이 테이블 ───────────────────────────────────────────────────
const ALLOWED_TRANSITIONS = {
  draft:      ["review"],
  review:     ["published", "rejected"],
  published:  ["deprecated"],
  rejected:   ["draft"],
  deprecated: [],
};

// ── Product 헬퍼 함수 ─────────────────────────────────────────────────────────

function getProducts() { return products; }

function getProductById(id) {
  return products.find((p) => p.id === id) || null;
}

function createProduct(data) {
  const seqStr = String(nextProductSeq++).padStart(3, "0");
  const product = {
    id: `PROD-${seqStr}`,
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
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
  return products[idx];
}

/**
 * Product 상태 전이 — 허용되지 않은 전이는 에러 문자열을 반환합니다.
 * @returns {{ ok: boolean, reason?: string }}
 */
function transitionProductStatus(id, nextStatus, note) {
  const product = getProductById(id);
  if (!product) return { ok: false, reason: "Product를 찾을 수 없습니다." };

  const allowed = ALLOWED_TRANSITIONS[product.status] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      reason: `'${product.status}' 상태에서 '${nextStatus}'(으)로 전이할 수 없습니다. 허용: [${allowed.join(", ")}]`,
    };
  }

  const updates = { status: nextStatus };
  if (nextStatus === "review")    updates.reviewNote = note || null;
  if (nextStatus === "published") updates.publishedAt = new Date().toISOString();
  if (nextStatus === "rejected")  updates.rejectionReason = note || null;
  if (nextStatus === "draft")     updates.rejectionReason = null;

  updateProduct(id, updates);
  return { ok: true };
}

function deleteProduct(id) {
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [deleted] = products.splice(idx, 1);
  return deleted;
}

// ── Plan 헬퍼 함수 ────────────────────────────────────────────────────────────

function getPlans() { return plans; }

function getPlanById(id) {
  return plans.find((p) => p.id === id) || null;
}

function getPlansByProduct(productId) {
  return plans.filter((p) => p.productId === productId);
}

function createPlan(data) {
  const seqStr = String(nextPlanSeq++).padStart(3, "0");
  const plan = {
    id: `PLAN-${seqStr}`,
    ...data,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  plans.push(plan);
  return plan;
}

function updatePlan(id, updates) {
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  plans[idx] = { ...plans[idx], ...updates, updatedAt: new Date().toISOString() };
  return plans[idx];
}

function transitionPlanStatus(id, nextStatus) {
  const plan = getPlanById(id);
  if (!plan) return { ok: false, reason: "Plan을 찾을 수 없습니다." };

  const allowed = ALLOWED_TRANSITIONS[plan.status] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      reason: `'${plan.status}' 상태에서 '${nextStatus}'(으)로 전이할 수 없습니다. 허용: [${allowed.join(", ")}]`,
    };
  }

  updatePlan(id, { status: nextStatus });
  return { ok: true };
}

function deletePlan(id) {
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [deleted] = plans.splice(idx, 1);
  return deleted;
}

module.exports = {
  getProducts, getProductById, createProduct, updateProduct,
  transitionProductStatus, deleteProduct,
  getPlans, getPlanById, getPlansByProduct, createPlan, updatePlan,
  transitionPlanStatus, deletePlan,
  ALLOWED_TRANSITIONS,
};
