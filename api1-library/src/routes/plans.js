// Plan 라우터 — api1-library
// Plan CRUD + 배포 흐름 (draft → review → published / rejected)
//
// 엔드포인트 목록:
//   GET    /plans                  — 목록 조회 (productId, status, freeOnly 필터)
//   GET    /plans/:id              — 단건 조회
//   POST   /plans                  — Plan 생성 (draft 상태, productId 필수)
//   PUT    /plans/:id              — Plan 전체 수정 (draft/rejected 만)
//   PATCH  /plans/:id              — Plan 부분 수정 (draft/rejected 만)
//   DELETE /plans/:id              — Plan 삭제 (draft/rejected 만)
//
// 배포 흐름:
//   POST   /plans/:id/submit       — 검토 요청 (draft → review)
//   POST   /plans/:id/publish      — 게시/배포  (review → published)
//   POST   /plans/:id/reject       — 거절       (review → rejected)
//   POST   /plans/:id/deprecate    — 사용 중단  (published → deprecated)
//   POST   /plans/:id/resubmit     — 재제출     (rejected → draft)

"use strict";

const express = require("express");
const router  = express.Router();
const catalog = require("../data/catalog");

// ── 유효성 검사 헬퍼 ──────────────────────────────────────────────────────────

/** rate limit 객체 검사, 에러 메시지 또는 null 반환 */
function validateRateLimit(rl, fieldName) {
  if (!rl || typeof rl !== "object") return `${fieldName} 객체가 필요합니다.`;
  if (!Number.isInteger(rl.count)    || rl.count    < 1) return `${fieldName}.count는 1 이상의 정수여야 합니다.`;
  if (!Number.isInteger(rl.interval) || rl.interval < 1) return `${fieldName}.interval은 1 이상의 정수여야 합니다.`;
  const VALID_UNITS = ["second", "minute", "hour", "day"];
  if (!VALID_UNITS.includes(rl.unit)) return `${fieldName}.unit은 [${VALID_UNITS.join(", ")}] 중 하나여야 합니다.`;
  return null;
}

/** price 객체 검사 */
function validatePrice(price) {
  if (!price || typeof price !== "object") return "price 객체가 필요합니다.";
  if (typeof price.amount !== "number" || price.amount < 0) return "price.amount는 0 이상의 숫자여야 합니다.";
  if (!price.currency || typeof price.currency !== "string") return "price.currency는 필수입니다.";
  return null;
}

// ── GET /plans — 목록 조회 ────────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { productId, status, freeOnly, page = 1, limit = 10 } = req.query;
  let result = [...catalog.getPlans()];

  if (productId) result = result.filter((p) => p.productId === productId);
  if (status)    result = result.filter((p) => p.status === status);
  if (freeOnly === "true") result = result.filter((p) => p.price && p.price.amount === 0);

  const total    = result.length;
  let pageNum    = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  let limitNum   = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
  const start    = (pageNum - 1) * limitNum;
  const data     = result.slice(start, start + limitNum);

  res.json({ total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) || 1, data });
});

// ── GET /plans/:id — 단건 조회 ────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const plan = catalog.getPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: "Plan을 찾을 수 없습니다.", id: req.params.id });
  }
  // 연결된 Product 정보 포함
  const product = catalog.getProductById(plan.productId);
  res.json({ ...plan, product: product || null });
});

// ── POST /plans — Plan 생성 ───────────────────────────────────────────────────
router.post("/", (req, res) => {
  const {
    productId,
    name,
    title,
    description,
    rateLimit,
    burstLimit,
    price,
    features,
    approvalRequired,
  } = req.body;

  // 필수 필드 검사
  if (!productId || !name || !title || !description) {
    return res.status(400).json({
      error: "productId, name, title, description은 필수 입력 항목입니다.",
    });
  }

  // name URL-safe 유효성 검사
  if (!/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({ error: "name은 영문 소문자, 숫자, 하이픈(-)만 포함된 URL-safe 형식이어야 합니다." });
  }

  // 연결 Product 존재 여부 확인
  const product = catalog.getProductById(productId);
  if (!product) {
    return res.status(404).json({ error: `Product '${productId}'를 찾을 수 없습니다.`, productId });
  }

  // rateLimit 유효성 검사
  const rlError = validateRateLimit(rateLimit, "rateLimit");
  if (rlError) return res.status(400).json({ error: rlError });

  // burstLimit 유효성 검사 (선택 필드)
  if (burstLimit !== undefined && burstLimit !== null) {
    const blError = validateRateLimit(burstLimit, "burstLimit");
    if (blError) return res.status(400).json({ error: blError });
  }

  // price 유효성 검사
  const priceError = validatePrice(price);
  if (priceError) return res.status(400).json({ error: priceError });

  // 같은 Product 내 중복 name 검사
  const existingPlans = catalog.getPlansByProduct(productId);
  if (existingPlans.find((p) => p.name === name)) {
    return res.status(409).json({
      error: `Product '${productId}' 내에 '${name}' 이름의 Plan이 이미 존재합니다.`,
    });
  }

  const plan = catalog.createPlan({
    productId,
    name,
    title,
    description,
    rateLimit,
    burstLimit: burstLimit || null,
    price,
    features: Array.isArray(features) ? features : [],
    approvalRequired: approvalRequired === true,
  });

  res.status(201).json(plan);
});

// ── PUT /plans/:id — Plan 전체 수정 ──────────────────────────────────────────
router.put("/:id", (req, res) => {
  const plan = catalog.getPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: "Plan을 찾을 수 없습니다.", id: req.params.id });
  }

  if (plan.status !== "draft" && plan.status !== "rejected") {
    return res.status(409).json({
      error: `'${plan.status}' 상태의 Plan은 수정할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 수정이 가능합니다.`,
      status: plan.status,
    });
  }

  const { title, description, rateLimit, burstLimit, price, features, approvalRequired } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "title, description은 필수 입력 항목입니다." });
  }

  if (rateLimit) {
    const rlError = validateRateLimit(rateLimit, "rateLimit");
    if (rlError) return res.status(400).json({ error: rlError });
  }
  if (price) {
    const priceError = validatePrice(price);
    if (priceError) return res.status(400).json({ error: priceError });
  }

  const updated = catalog.updatePlan(req.params.id, {
    title:           title           ?? plan.title,
    description:     description     ?? plan.description,
    rateLimit:       rateLimit       ?? plan.rateLimit,
    burstLimit:      burstLimit      !== undefined ? burstLimit : plan.burstLimit,
    price:           price           ?? plan.price,
    features:        Array.isArray(features) ? features : plan.features,
    approvalRequired: approvalRequired !== undefined ? approvalRequired : plan.approvalRequired,
  });

  res.json(updated);
});

// ── PATCH /plans/:id — Plan 부분 수정 ────────────────────────────────────────
router.patch("/:id", (req, res) => {
  const plan = catalog.getPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: "Plan을 찾을 수 없습니다.", id: req.params.id });
  }

  if (plan.status !== "draft" && plan.status !== "rejected") {
    return res.status(409).json({
      error: `'${plan.status}' 상태의 Plan은 수정할 수 없습니다.`,
      status: plan.status,
    });
  }

  const allowed = ["title", "description", "rateLimit", "burstLimit", "price", "features", "approvalRequired"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "수정할 필드가 없습니다." });
  }

  // 선택 필드 유효성 검사
  if (updates.rateLimit) {
    const rlError = validateRateLimit(updates.rateLimit, "rateLimit");
    if (rlError) return res.status(400).json({ error: rlError });
  }
  if (updates.burstLimit) {
    const blError = validateRateLimit(updates.burstLimit, "burstLimit");
    if (blError) return res.status(400).json({ error: blError });
  }
  if (updates.price) {
    const priceError = validatePrice(updates.price);
    if (priceError) return res.status(400).json({ error: priceError });
  }

  const updated = catalog.updatePlan(req.params.id, updates);
  res.json(updated);
});

// ── DELETE /plans/:id — Plan 삭제 ─────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const plan = catalog.getPlanById(req.params.id);
  if (!plan) {
    return res.status(404).json({ error: "Plan을 찾을 수 없습니다.", id: req.params.id });
  }

  if (plan.status !== "draft" && plan.status !== "rejected") {
    return res.status(409).json({
      error: `'${plan.status}' 상태의 Plan은 삭제할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 삭제가 가능합니다.`,
      status: plan.status,
    });
  }

  catalog.deletePlan(req.params.id);
  res.json({ message: "Plan이 삭제되었습니다.", deletedPlan: plan });
});

// ── POST /plans/:id/submit — 검토 요청 (draft → review) ──────────────────────
router.post("/:id/submit", (req, res) => {
  const result = catalog.transitionPlanStatus(req.params.id, "review");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const plan = catalog.getPlanById(req.params.id);
  res.json({ message: "Plan 검토 요청이 제출되었습니다.", plan });
});

// ── POST /plans/:id/publish — 게시/배포 (review → published) ─────────────────
router.post("/:id/publish", (req, res) => {
  const result = catalog.transitionPlanStatus(req.params.id, "published");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const plan = catalog.getPlanById(req.params.id);
  res.json({ message: `Plan '${req.params.id}'가 성공적으로 게시(PUBLISHED)되었습니다.`, plan });
});

// ── POST /plans/:id/reject — 거절 (review → rejected) ────────────────────────
router.post("/:id/reject", (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "거절 사유(reason)는 필수 입력 항목입니다." });
  }
  const result = catalog.transitionPlanStatus(req.params.id, "rejected");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const plan = catalog.getPlanById(req.params.id);
  res.json({ message: "Plan 검토가 거절되었습니다.", plan });
});

// ── POST /plans/:id/deprecate — 사용 중단 (published → deprecated) ────────────
router.post("/:id/deprecate", (req, res) => {
  const result = catalog.transitionPlanStatus(req.params.id, "deprecated");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const plan = catalog.getPlanById(req.params.id);
  res.json({ message: `Plan '${req.params.id}'가 사용 중단(DEPRECATED) 처리되었습니다.`, plan });
});

// ── POST /plans/:id/resubmit — 재제출 (rejected → draft) ─────────────────────
router.post("/:id/resubmit", (req, res) => {
  const result = catalog.transitionPlanStatus(req.params.id, "draft");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const plan = catalog.getPlanById(req.params.id);
  res.json({ message: "Plan이 초안(DRAFT) 상태로 재설정되었습니다. 수정 후 재제출하세요.", plan });
});

module.exports = router;
