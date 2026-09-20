// 카탈로그(Product/Plan) 통합 테스트 — api4-graphql
// Node.js 내장 테스트 러너 사용: node --test test/catalog.test.js
//
// 테스트 범위:
//   1. 데이터 스토어 — 시드 데이터, CRUD, 상태 전이
//   2. GraphQL Query — products, product, plans, plan
//   3. GraphQL Mutation — createProduct, 배포 흐름(submit→publish), reject, deprecate
//   4. GraphQL Mutation — createPlan, 배포 흐름, 연관 관계
//   5. 에러 케이스 — 중복 name, 존재하지 않는 ID, 잘못된 상태 전이

"use strict";

const assert = require("assert");
const test   = require("node:test");

// ── 스토어 직접 테스트 (단위) ─────────────────────────────────────────────────

test("스토어 — Product 시드 데이터 존재 확인", () => {
  // 테스트마다 fresh require를 위해 캐시 클리어
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  const products = store.getProducts();
  assert.ok(products.length >= 3, "시드 Product가 3개 이상 있어야 합니다.");
  assert.strictEqual(products[0].productID, "PROD-001");
  assert.strictEqual(products[0].status, "published");
});

test("스토어 — Plan 시드 데이터 존재 확인", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  const plans = store.getPlans();
  assert.ok(plans.length >= 4, "시드 Plan이 4개 이상 있어야 합니다.");
  assert.strictEqual(plans[0].planID, "PLAN-001");
  assert.strictEqual(plans[0].productID, "PROD-001");
});

test("스토어 — Product CRUD 전체 흐름", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  // 생성
  const p = store.createProduct({
    name: "test-product",
    title: "테스트 상품",
    description: "단위 테스트용 상품",
    version: "1.0.0",
    visibility: "public",
    categories: ["test"],
  });
  assert.ok(p.productID.startsWith("PROD-"), "생성된 productID는 PROD-로 시작해야 합니다.");
  assert.strictEqual(p.status, "draft", "생성 시 draft 상태여야 합니다.");
  assert.strictEqual(p.publishedAt, null);

  // 수정
  const updated = store.updateProduct(p.productID, { title: "수정된 제목" });
  assert.strictEqual(updated.title, "수정된 제목");

  // 삭제
  const deleted = store.deleteProduct(p.productID);
  assert.strictEqual(deleted.productID, p.productID);
  assert.strictEqual(store.getProduct(p.productID), null);
});

test("스토어 — Product 상태 전이 흐름 (draft→review→published)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  const p = store.createProduct({
    name: "lifecycle-product",
    title: "라이프사이클 테스트",
    description: "상태 전이 테스트용",
    version: "1.0.0",
    visibility: "public",
    categories: [],
  });

  // draft → review
  let res = store.transitionProductStatus(p.productID, "review", "검토 요청 메모");
  assert.ok(res.ok, "draft→review 전이 성공해야 합니다.");
  let current = store.getProduct(p.productID);
  assert.strictEqual(current.status, "review");
  assert.strictEqual(current.reviewNote, "검토 요청 메모");

  // review → published
  res = store.transitionProductStatus(p.productID, "published");
  assert.ok(res.ok, "review→published 전이 성공해야 합니다.");
  current = store.getProduct(p.productID);
  assert.strictEqual(current.status, "published");
  assert.ok(current.publishedAt !== null, "publishedAt이 설정되어야 합니다.");

  // published → deprecated
  res = store.transitionProductStatus(p.productID, "deprecated");
  assert.ok(res.ok, "published→deprecated 전이 성공해야 합니다.");
  assert.strictEqual(store.getProduct(p.productID).status, "deprecated");
});

test("스토어 — Product 잘못된 상태 전이 거부", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  // PROD-001은 published 상태
  const res = store.transitionProductStatus("PROD-001", "review");
  assert.strictEqual(res.ok, false, "published에서 review로 전이는 불가해야 합니다.");
  assert.ok(res.reason.includes("전이할 수 없습니다"), "에러 메시지가 포함되어야 합니다.");
});

test("스토어 — Product reject 후 재제출 흐름", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  const p = store.createProduct({
    name: "reject-test",
    title: "거절 테스트",
    description: "거절 흐름 테스트",
    version: "1.0.0",
    visibility: "public",
    categories: [],
  });

  store.transitionProductStatus(p.productID, "review");
  store.transitionProductStatus(p.productID, "rejected", "검토 거절 사유");

  let current = store.getProduct(p.productID);
  assert.strictEqual(current.status, "rejected");
  assert.strictEqual(current.rejectionReason, "검토 거절 사유");

  // rejected → draft (재제출)
  const res = store.transitionProductStatus(p.productID, "draft");
  assert.ok(res.ok, "rejected→draft 전이 성공해야 합니다.");
  current = store.getProduct(p.productID);
  assert.strictEqual(current.status, "draft");
  assert.strictEqual(current.rejectionReason, null, "재제출 시 rejectionReason이 초기화되어야 합니다.");
});

test("스토어 — Plan CRUD 전체 흐름", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  const plan = store.createPlan({
    productID: "PROD-001",
    name: "test-plan",
    title: "테스트 플랜",
    description: "단위 테스트용 플랜",
    rateLimit: { count: 50, interval: 1, unit: "minute" },
    burstLimit: null,
    price: { amount: 0, currency: "KRW", billingPeriod: null },
    features: ["기능1"],
    approvalRequired: false,
  });

  assert.ok(plan.planID.startsWith("PLAN-"), "생성된 planID는 PLAN-로 시작해야 합니다.");
  assert.strictEqual(plan.status, "draft");
  assert.strictEqual(plan.productID, "PROD-001");

  // getPlansByProduct 확인
  const byProduct = store.getPlansByProduct("PROD-001");
  assert.ok(byProduct.some((p) => p.planID === plan.planID), "getPlansByProduct에 포함되어야 합니다.");

  // 삭제
  store.deletePlan(plan.planID);
  assert.strictEqual(store.getPlan(plan.planID), null);
});

test("스토어 — Plan 상태 전이 흐름 (draft→review→published)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  const store = require("../src/data/store");

  const plan = store.createPlan({
    productID: "PROD-001",
    name: "plan-lifecycle",
    title: "라이프사이클 플랜",
    description: "상태 전이 테스트",
    rateLimit: { count: 100, interval: 1, unit: "minute" },
    burstLimit: null,
    price: { amount: 9900, currency: "KRW", billingPeriod: "monthly" },
    features: [],
    approvalRequired: false,
  });

  let res = store.transitionPlanStatus(plan.planID, "review");
  assert.ok(res.ok, "draft→review 전이 성공해야 합니다.");
  assert.strictEqual(store.getPlan(plan.planID).status, "review");

  res = store.transitionPlanStatus(plan.planID, "published");
  assert.ok(res.ok, "review→published 전이 성공해야 합니다.");
  assert.strictEqual(store.getPlan(plan.planID).status, "published");
});

// ── Query/Mutation 리졸버 단위 테스트 ─────────────────────────────────────────

test("Query.products — 전체 목록 반환", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const result = Query.products(null, {});
  assert.ok(result.total >= 3);
  assert.ok(Array.isArray(result.items));
});

test("Query.products — status 필터 (PUBLISHED)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const result = Query.products(null, { filter: { status: "PUBLISHED" } });
  assert.ok(result.items.every((p) => p.status === "published"), "published 상태 Product만 반환해야 합니다.");
});

test("Query.products — nameSearch 필터", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const result = Query.products(null, { filter: { nameSearch: "Library" } });
  assert.ok(result.items.length >= 1, "Library 관련 Product가 있어야 합니다.");
  assert.ok(
    result.items.every((p) => p.name.toLowerCase().includes("library") || p.title.toLowerCase().includes("library")),
    "검색 결과가 nameSearch와 일치해야 합니다."
  );
});

test("Query.product — 단건 조회 (존재)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const product = Query.product(null, { productID: "PROD-001" });
  assert.ok(product !== null);
  assert.strictEqual(product.productID, "PROD-001");
});

test("Query.product — 단건 조회 (미존재)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const product = Query.product(null, { productID: "PROD-NOTEXIST" });
  assert.strictEqual(product, null);
});

test("Query.plans — productID 필터", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const result = Query.plans(null, { filter: { productID: "PROD-001" } });
  assert.ok(result.total >= 2, "PROD-001에 Plan이 2개 이상 있어야 합니다.");
  assert.ok(result.items.every((p) => p.productID === "PROD-001"), "모든 Plan이 PROD-001에 속해야 합니다.");
});

test("Query.plans — freeOnly 필터", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  const result = Query.plans(null, { filter: { freeOnly: true } });
  assert.ok(result.items.every((p) => p.price.amount === 0), "무료 플랜만 반환해야 합니다.");
});

test("Mutation.createProduct — 정상 생성", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  const result = Mutation.createProduct(null, {
    input: {
      name: "mutation-test-product",
      title: "Mutation 테스트 상품",
      description: "Mutation 테스트용 상품",
      version: "1.0.0",
      visibility: "PUBLIC",
      categories: ["test"],
    },
  });

  assert.ok(result.success, "성공 응답이어야 합니다.");
  assert.ok(result.product.productID.startsWith("PROD-"));
  assert.strictEqual(result.product.status, "draft");
});

test("Mutation.createProduct — 중복 name 에러", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  const result = Mutation.createProduct(null, {
    input: {
      name: "Library API Product",  // 이미 존재하는 name
      title: "중복 상품",
      description: "중복 테스트",
    },
  });
  assert.strictEqual(result.success, false);
});

test("Mutation — Product 전체 배포 흐름 (createProduct→submit→publish)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // 1. 생성
  const created = Mutation.createProduct(null, {
    input: {
      name: "deploy-flow-product",
      title: "배포 흐름 테스트 상품",
      description: "전체 배포 흐름 테스트",
    },
  });
  assert.ok(created.success);
  const id = created.product.productID;

  // 2. 검토 요청
  const submitted = Mutation.submitProductForReview(null, { productID: id, note: "검토 요청" });
  assert.ok(submitted.success, "검토 요청 성공해야 합니다.");
  assert.strictEqual(submitted.product.status, "review");

  // 3. 게시
  const published = Mutation.publishProduct(null, { productID: id });
  assert.ok(published.success, "게시 성공해야 합니다.");
  assert.strictEqual(published.product.status, "published");
  assert.ok(published.product.publishedAt !== null, "publishedAt이 설정되어야 합니다.");
});

test("Mutation — Product 잘못된 상태 전이 에러 반환", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // PROD-001은 이미 published → submit 불가
  const result = Mutation.submitProductForReview(null, { productID: "PROD-001" });
  assert.strictEqual(result.success, false, "published 상태에서 submit은 실패해야 합니다.");
});

test("Mutation.createPlan — 정상 생성 (PROD-001에 연결)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  const result = Mutation.createPlan(null, {
    input: {
      productID: "PROD-001",
      name: "mutation-test-plan",
      title: "Mutation 테스트 플랜",
      description: "테스트 플랜 설명",
      rateLimit: { count: 200, interval: 1, unit: "MINUTE" },
      price: { amount: 49000, currency: "KRW", billingPeriod: "monthly" },
      features: ["기능A", "기능B"],
      approvalRequired: false,
    },
  });

  assert.ok(result.success, "Plan 생성 성공해야 합니다.");
  assert.ok(result.plan.planID.startsWith("PLAN-"));
  assert.strictEqual(result.plan.status, "draft");
  assert.strictEqual(result.plan.productID, "PROD-001");
  assert.strictEqual(result.plan.rateLimit.unit, "minute");
});

test("Mutation.createPlan — 존재하지 않는 Product 에러", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  const result = Mutation.createPlan(null, {
    input: {
      productID: "PROD-NOTEXIST",
      name: "orphan-plan",
      title: "고아 플랜",
      description: "존재하지 않는 Product에 연결 시도",
      rateLimit: { count: 10, interval: 1, unit: "MINUTE" },
      price: { amount: 0, currency: "KRW", billingPeriod: null },
    },
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("찾을 수 없습니다"));
});

test("Mutation.createPlan — rateLimit.count < 1 유효성 에러", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  const result = Mutation.createPlan(null, {
    input: {
      productID: "PROD-001",
      name: "invalid-rate-plan",
      title: "잘못된 Rate Limit 플랜",
      description: "유효성 오류 테스트",
      rateLimit: { count: 0, interval: 1, unit: "MINUTE" },  // count: 0 이므로 에러
      price: { amount: 0, currency: "KRW", billingPeriod: null },
    },
  });

  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("1 이상이어야 합니다"));
});

test("Mutation — Plan 전체 배포 흐름 (createPlan→submit→publish)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // 생성
  const created = Mutation.createPlan(null, {
    input: {
      productID: "PROD-001",
      name: "plan-deploy-flow",
      title: "배포 흐름 플랜",
      description: "전체 배포 흐름 테스트",
      rateLimit: { count: 300, interval: 1, unit: "MINUTE" },
      price: { amount: 19900, currency: "KRW", billingPeriod: "monthly" },
      features: ["기능X"],
      approvalRequired: false,
    },
  });
  assert.ok(created.success);
  const planID = created.plan.planID;

  // 검토 요청
  const submitted = Mutation.submitPlanForReview(null, { planID });
  assert.ok(submitted.success);
  assert.strictEqual(submitted.plan.status, "review");

  // 게시
  const published = Mutation.publishPlan(null, { planID });
  assert.ok(published.success, "Plan 게시 성공해야 합니다.");
  assert.strictEqual(published.plan.status, "published");
});

test("Mutation.deleteProduct — draft 상태 삭제 (연결 Plan 함께 삭제)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");
  const store = require("../src/data/store");

  // 새 Product + Plan 생성
  const product = Mutation.createProduct(null, {
    input: { name: "delete-test-product", title: "삭제 테스트", description: "삭제 흐름 테스트" },
  });
  const productID = product.product.productID;

  Mutation.createPlan(null, {
    input: {
      productID,
      name: "delete-child-plan",
      title: "삭제될 플랜",
      description: "부모 Product 삭제 시 함께 삭제",
      rateLimit: { count: 10, interval: 1, unit: "MINUTE" },
      price: { amount: 0, currency: "KRW", billingPeriod: null },
    },
  });

  const plansBefore = store.getPlansByProduct(productID).length;
  assert.strictEqual(plansBefore, 1);

  // Product 삭제
  const deleted = Mutation.deleteProduct(null, { productID });
  assert.ok(deleted.success, "draft 상태 Product 삭제 성공해야 합니다.");
  assert.ok(deleted.message.includes("1개 Plan"), "삭제된 Plan 수가 메시지에 포함되어야 합니다.");
  assert.strictEqual(store.getProduct(productID), null);
  assert.strictEqual(store.getPlansByProduct(productID).length, 0);
});

test("Mutation.deleteProduct — published 상태 삭제 거부", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // PROD-001은 published 상태
  const result = Mutation.deleteProduct(null, { productID: "PROD-001" });
  assert.strictEqual(result.success, false, "published 상태는 삭제할 수 없어야 합니다.");
});

test("Mutation.rejectProduct — 거절 사유 필수", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // PROD-003은 draft → submit 후 reject
  Mutation.submitProductForReview(null, { productID: "PROD-003" });
  const result = Mutation.rejectProduct(null, { productID: "PROD-003", reason: "" });
  assert.strictEqual(result.success, false, "빈 거절 사유는 거부되어야 합니다.");
});

// ── 타입 리졸버 단위 테스트 ─────────────────────────────────────────────────

test("타입 리졸버 — Product.plans (연결된 Plan 목록)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/types")];
  const typeResolvers = require("../src/resolvers/types");

  const plans = typeResolvers.Product.plans({ productID: "PROD-001" });
  assert.ok(plans.length >= 2, "PROD-001에 연결된 Plan이 2개 이상 있어야 합니다.");
  assert.ok(plans.every((p) => p.productID === "PROD-001"));
});

test("타입 리졸버 — Product.status 대문자 변환", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/types")];
  const typeResolvers = require("../src/resolvers/types");

  const status = typeResolvers.Product.status({ status: "published" });
  assert.strictEqual(status, "PUBLISHED");
});

test("타입 리졸버 — Plan.product (연결된 Product 조회)", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/types")];
  const typeResolvers = require("../src/resolvers/types");

  const product = typeResolvers.Plan.product({ productID: "PROD-001" });
  assert.ok(product !== null, "연결된 Product가 있어야 합니다.");
  assert.strictEqual(product.productID, "PROD-001");
});

test("타입 리졸버 — Plan.rateLimit unit 대문자 변환", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/types")];
  const typeResolvers = require("../src/resolvers/types");

  const rl = typeResolvers.Plan.rateLimit({ rateLimit: { count: 100, interval: 1, unit: "minute" } });
  assert.strictEqual(rl.unit, "MINUTE");
});

test("타입 리졸버 — Plan.burstLimit null 처리", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/types")];
  const typeResolvers = require("../src/resolvers/types");

  const bl = typeResolvers.Plan.burstLimit({ burstLimit: null });
  assert.strictEqual(bl, null, "burstLimit이 null이면 null을 반환해야 합니다.");
});

// ── 적대적 검증 (Adversarial Validation) 추가 테스트 ───────────────────────────────

test("적대적 검증 — createProduct/createPlan URL-safe name 검증", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // 잘못된 Product name
  const prodRes = Mutation.createProduct(null, {
    input: {
      name: "Invalid Name With Spaces!",
      title: "정상 제목",
      description: "설명",
    },
  });
  assert.strictEqual(prodRes.success, false);
  assert.ok(prodRes.message.includes("URL-safe 형식"));

  // 잘못된 Plan name
  const planRes = Mutation.createPlan(null, {
    input: {
      productID: "PROD-001",
      name: "Premium Plan Name!",
      title: "정상 제목",
      description: "설명",
      rateLimit: { count: 10, interval: 1, unit: "MINUTE" },
      price: { amount: 0, currency: "KRW" },
    },
  });
  assert.strictEqual(planRes.success, false);
  assert.ok(planRes.message.includes("URL-safe 형식"));
});

test("적대적 검증 — updateProduct visibility 검증", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  const result = Mutation.updateProduct(null, {
    productID: "PROD-003", // draft 상품
    input: {
      visibility: "INVALID_VISIBILITY_VAL",
    },
  });
  assert.strictEqual(result.success, false);
  assert.ok(result.message.includes("visibility는"));
});

test("적대적 검증 — createPlan/updatePlan 음수 요금(price.amount) 차단", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // createPlan 음수 요금
  const createRes = Mutation.createPlan(null, {
    input: {
      productID: "PROD-001",
      name: "negative-price-plan",
      title: "음수 요금 플랜",
      description: "테스트",
      rateLimit: { count: 100, interval: 1, unit: "MINUTE" },
      price: { amount: -5000, currency: "KRW" },
    },
  });
  assert.strictEqual(createRes.success, false);
  assert.ok(createRes.message.includes("0 이상의 숫자"));

  // updatePlan 음수 요금
  const updateRes = Mutation.updatePlan(null, {
    planID: "PLAN-004", // draft 플랜
    input: {
      price: { amount: -100, currency: "KRW" },
    },
  });
  assert.strictEqual(updateRes.success, false);
  assert.ok(updateRes.message.includes("0 이상의 숫자"));
});

test("적대적 검증 — updatePlan 잘못된 rateLimit / burstLimit 값 차단", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // rateLimit.count < 1
  const rlRes = Mutation.updatePlan(null, {
    planID: "PLAN-004",
    input: {
      rateLimit: { count: 0, interval: 1, unit: "MINUTE" },
    },
  });
  assert.strictEqual(rlRes.success, false);
  assert.ok(rlRes.message.includes("1 이상이어야 합니다."));

  // burstLimit.interval < 1
  const blRes = Mutation.updatePlan(null, {
    planID: "PLAN-004",
    input: {
      burstLimit: { count: 10, interval: -5, unit: "MINUTE" },
    },
  });
  assert.strictEqual(blRes.success, false);
  assert.ok(blRes.message.includes("1 이상이어야 합니다."));
});

test("적대적 검증 — updateBooking 음수 인원 및 객실 수 차단", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/mutations")];
  const { Mutation } = require("../src/resolvers/mutations");

  // 음수 탑승객 수
  const passRes = Mutation.updateBooking(null, {
    bookingID: "1001",
    input: { numPassengers: 0 },
  });
  assert.strictEqual(passRes.success, false);
  assert.ok(passRes.message.includes("numPassengers must be at least 1"));

  // 음수 객실 수
  const roomRes = Mutation.updateBooking(null, {
    bookingID: "1001",
    input: {
      room: { roomID: "BAL", numRooms: -2 },
    },
  });
  assert.strictEqual(roomRes.success, false);
  assert.ok(roomRes.message.includes("numRooms must be at least 1"));
});

test("적대적 검증 — Query 페이지네이션 안전 범주(Bound) 확인", () => {
  delete require.cache[require.resolve("../src/data/store")];
  delete require.cache[require.resolve("../src/resolvers/queries")];
  const { Query } = require("../src/resolvers/queries");

  // offset에 음수를 입력했을 때 0으로 자동 교정되어 동작해야 함
  const result = Query.products(null, {
    pagination: { offset: -5, limit: -10 },
  });
  assert.ok(result.total >= 3);
  assert.ok(result.items.length <= 20); // 음수 limit 시 기본 limit 20으로 자동 교정되어야 함
});
