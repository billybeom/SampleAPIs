// Product 라우터 — api1-library
// Product CRUD + 배포 흐름 (draft → review → published / rejected)
//
// 엔드포인트 목록:
//   GET    /products              — 목록 조회 (status, visibility, category 필터)
//   GET    /products/:id          — 단건 조회
//   POST   /products              — Product 생성 (draft 상태)
//   PUT    /products/:id          — Product 전체 수정 (draft/rejected 만)
//   PATCH  /products/:id          — Product 부분 수정 (draft/rejected 만)
//   DELETE /products/:id          — Product 삭제 (draft/rejected 만)
//
// 배포 흐름:
//   POST   /products/:id/submit   — 검토 요청 (draft → review)
//   POST   /products/:id/publish  — 게시/배포  (review → published)
//   POST   /products/:id/reject   — 거절       (review → rejected)
//   POST   /products/:id/deprecate— 사용 중단  (published → deprecated)
//   POST   /products/:id/resubmit — 재제출     (rejected → draft)

"use strict";

const express = require("express");
const router  = express.Router();
const catalog = require("../data/catalog");

// ── 유효성 검사 헬퍼 ──────────────────────────────────────────────────────────

/** rate limit 객체 검사 */
function validateRateLimit(rl) {
  if (!rl || typeof rl !== "object") return "rateLimit 객체가 필요합니다.";
  if (!Number.isInteger(rl.count)    || rl.count    < 1) return "rateLimit.count는 1 이상의 정수여야 합니다.";
  if (!Number.isInteger(rl.interval) || rl.interval < 1) return "rateLimit.interval은 1 이상의 정수여야 합니다.";
  const validUnits = ["second", "minute", "hour", "day"];
  if (!validUnits.includes(rl.unit)) return `rateLimit.unit은 [${validUnits.join(", ")}] 중 하나여야 합니다.`;
  return null;
}

// ── GET /products — 목록 조회 ─────────────────────────────────────────────────
router.get("/", (req, res) => {
  const { status, visibility, category, nameSearch, page = 1, limit = 10 } = req.query;
  let result = [...catalog.getProducts()];

  if (status)     result = result.filter((p) => p.status === status);
  if (visibility) result = result.filter((p) => p.visibility === visibility);
  if (category) {
    const q = category.toLowerCase();
    result = result.filter((p) => p.categories.some((c) => c.toLowerCase().includes(q)));
  }
  if (nameSearch) {
    const q = nameSearch.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
    );
  }

  const total     = result.length;
  let pageNum     = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
  let limitNum    = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
  const start     = (pageNum - 1) * limitNum;

  // 각 Product에 planCount 파생 필드 추가
  const data = result.slice(start, start + limitNum).map((p) => ({
    ...p,
    planCount: catalog.getPlansByProduct(p.id).length,
  }));

  res.json({ total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) || 1, data });
});

// ── GET /products/:id — 단건 조회 ─────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const product = catalog.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product를 찾을 수 없습니다.", id: req.params.id });
  }
  const plans = catalog.getPlansByProduct(product.id);
  res.json({ ...product, plans, planCount: plans.length });
});

// ── POST /products — Product 생성 ────────────────────────────────────────────
router.post("/", (req, res) => {
  const { name, title, description, version, visibility, categories } = req.body;

  // 필수 필드 검사
  if (!name || !title || !description) {
    return res.status(400).json({ error: "name, title, description은 필수 입력 항목입니다." });
  }

  // name URL-safe 유효성 검사
  if (!/^[a-z0-9-]+$%.test(name) && !/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({ error: "name은 영문 소문자, 숫자, 하이픈(-)만 포함된 URL-safe 형식이어야 합니다." });
  }

  // name 유일성 검사
  const duplicate = catalog.getProducts().find((p) => p.name === name);
  if (duplicate) {
    return res.status(409).json({ error: `'${name}' 이름의 Product가 이미 존재합니다.`, id: duplicate.id });
  }

  const VALID_VISIBILITY = ["public", "authenticated", "custom"];
  const vis = visibility || "public";
  if (!VALID_VISIBILITY.includes(vis)) {
    return res.status(400).json({ error: `visibility는 [${VALID_VISIBILITY.join(", ")}] 중 하나여야 합니다.` });
  }

  const product = catalog.createProduct({
    name,
    title,
    description,
    version:    version    || "1.0.0",
    visibility: vis,
    categories: Array.isArray(categories) ? categories : [],
  });

  res.status(201).json(product);
});

// ── PUT /products/:id — Product 전체 수정 ────────────────────────────────────
router.put("/:id", (req, res) => {
  const product = catalog.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product를 찾을 수 없습니다.", id: req.params.id });
  }

  if (product.status !== "draft" && product.status !== "rejected") {
    return res.status(409).json({
      error: `'${product.status}' 상태의 Product는 수정할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 수정이 가능합니다.`,
      status: product.status,
    });
  }

  const { title, description, version, visibility, categories } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "title, description은 필수 입력 항목입니다." });
  }

  const VALID_VISIBILITY = ["public", "authenticated", "custom"];
  if (visibility !== undefined && !VALID_VISIBILITY.includes(visibility)) {
    return res.status(400).json({ error: `visibility는 [${VALID_VISIBILITY.join(", ")}] 중 하나여야 합니다.` });
  }

  const updated = catalog.updateProduct(req.params.id, {
    title:      title      ?? product.title,
    description:description ?? product.description,
    version:    version    ?? product.version,
    visibility: visibility ?? product.visibility,
    categories: Array.isArray(categories) ? categories : product.categories,
  });

  res.json(updated);
});

// ── PATCH /products/:id — Product 부분 수정 ──────────────────────────────────
router.patch("/:id", (req, res) => {
  const product = catalog.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product를 찾을 수 없습니다.", id: req.params.id });
  }

  if (product.status !== "draft" && product.status !== "rejected") {
    return res.status(409).json({
      error: `'${product.status}' 상태의 Product는 수정할 수 없습니다.`,
      status: product.status,
    });
  }

  const allowed = ["title", "description", "version", "visibility", "categories"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "수정할 필드가 없습니다." });
  }

  const VALID_VISIBILITY = ["public", "authenticated", "custom"];
  if (updates.visibility !== undefined && !VALID_VISIBILITY.includes(updates.visibility)) {
    return res.status(400).json({ error: `visibility는 [${VALID_VISIBILITY.join(", ")}] 중 하나여야 합니다.` });
  }

  const updated = catalog.updateProduct(req.params.id, updates);
  res.json(updated);
});

// ── DELETE /products/:id — Product 삭제 ───────────────────────────────────────
router.delete("/:id", (req, res) => {
  const product = catalog.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product를 찾을 수 없습니다.", id: req.params.id });
  }

  if (product.status !== "draft" && product.status !== "rejected") {
    return res.status(409).json({
      error: `'${product.status}' 상태의 Product는 삭제할 수 없습니다. DRAFT 또는 REJECTED 상태에서만 삭제가 가능합니다.`,
      status: product.status,
    });
  }

  // 연결된 Plan 함께 삭제
  const relatedPlans = catalog.getPlansByProduct(req.params.id);
  relatedPlans.forEach((p) => catalog.deletePlan(p.id));

  catalog.deleteProduct(req.params.id);
  res.json({
    message: "Product가 삭제되었습니다.",
    deletedProduct: product,
    deletedPlanCount: relatedPlans.length,
  });
});

// ── POST /products/:id/submit — 검토 요청 (draft → review) ───────────────────
router.post("/:id/submit", (req, res) => {
  const { note } = req.body;
  const result = catalog.transitionProductStatus(req.params.id, "review", note);
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const product = catalog.getProductById(req.params.id);
  res.json({ message: "검토 요청이 제출되었습니다.", product });
});

// ── POST /products/:id/publish — 게시/배포 (review → published) ──────────────
router.post("/:id/publish", (req, res) => {
  const result = catalog.transitionProductStatus(req.params.id, "published");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const product = catalog.getProductById(req.params.id);
  res.json({ message: `Product '${req.params.id}'가 성공적으로 게시(PUBLISHED)되었습니다.`, product });
});

// ── POST /products/:id/reject — 거절 (review → rejected) ─────────────────────
router.post("/:id/reject", (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "거절 사유(reason)는 필수 입력 항목입니다." });
  }
  const result = catalog.transitionProductStatus(req.params.id, "rejected", reason);
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const product = catalog.getProductById(req.params.id);
  res.json({ message: "Product 검토가 거절되었습니다.", product });
});

// ── POST /products/:id/deprecate — 사용 중단 (published → deprecated) ────────
router.post("/:id/deprecate", (req, res) => {
  const result = catalog.transitionProductStatus(req.params.id, "deprecated");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const product = catalog.getProductById(req.params.id);
  res.json({ message: `Product '${req.params.id}'가 사용 중단(DEPRECATED) 처리되었습니다.`, product });
});

// ── POST /products/:id/resubmit — 재제출 (rejected → draft) ──────────────────
router.post("/:id/resubmit", (req, res) => {
  const result = catalog.transitionProductStatus(req.params.id, "draft");
  if (!result.ok) {
    const code = result.reason.includes("찾을 수") ? 404 : 409;
    return res.status(code).json({ error: result.reason });
  }
  const product = catalog.getProductById(req.params.id);
  res.json({ message: "Product가 초안(DRAFT) 상태로 재설정되었습니다. 수정 후 재제출하세요.", product });
});

module.exports = router;
