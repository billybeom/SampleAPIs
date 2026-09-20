const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const bookRoutes    = require("./routes/books");
const loanRoutes    = require("./routes/loans");
const productRoutes = require("./routes/products");
const planRoutes    = require("./routes/plans");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ── Health check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Info ────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Library Management API",
    version: "1.0.0",
    description: "Sample REST API for IBM API Connect demonstration",
    endpoints: {
        books: {
          "GET /books": "List all books (supports ?genre, ?available, ?author, ?page, ?limit)",
          "GET /books/:id": "Get a single book by ID",
          "POST /books": "Add a new book",
          "PUT /books/:id": "Update a book (full)",
          "PATCH /books/:id": "Update a book (partial)",
          "DELETE /books/:id": "Delete a book",
        },
        loans: {
          "GET /loans": "List all loan records (supports ?status, ?bookId)",
          "GET /loans/:id": "Get a single loan record",
          "POST /loans": "Borrow a book",
          "PATCH /loans/:id/return": "Return a borrowed book",
        },
        products: {
          "GET /products": "Product 목록 조회 (?status, ?visibility, ?category, ?nameSearch, ?page, ?limit)",
          "GET /products/:id": "Product 단건 조회 (plans 포함)",
          "POST /products": "Product 생성 (draft 상태)",
          "PUT /products/:id": "Product 전체 수정 (draft/rejected 만)",
          "PATCH /products/:id": "Product 부분 수정 (draft/rejected 만)",
          "DELETE /products/:id": "Product 삭제 (draft/rejected 만)",
          "POST /products/:id/submit": "검토 요청 (draft → review)",
          "POST /products/:id/publish": "게시 배포 (review → published)",
          "POST /products/:id/reject": "거절 (review → rejected)",
          "POST /products/:id/deprecate": "사용 중단 (published → deprecated)",
          "POST /products/:id/resubmit": "재제출 (rejected → draft)",
        },
        plans: {
          "GET /plans": "Plan 목록 조회 (?productId, ?status, ?freeOnly, ?page, ?limit)",
          "GET /plans/:id": "Plan 단건 조회 (product 정보 포함)",
          "POST /plans": "Plan 생성 (draft 상태, productId 필수)",
          "PUT /plans/:id": "Plan 전체 수정 (draft/rejected 만)",
          "PATCH /plans/:id": "Plan 부분 수정 (draft/rejected 만)",
          "DELETE /plans/:id": "Plan 삭제 (draft/rejected 만)",
          "POST /plans/:id/submit": "검토 요청 (draft → review)",
          "POST /plans/:id/publish": "게시 배포 (review → published)",
          "POST /plans/:id/reject": "거절 (review → rejected)",
          "POST /plans/:id/deprecate": "사용 중단 (published → deprecated)",
          "POST /plans/:id/resubmit": "재제출 (rejected → draft)",
        },
      },
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/books",    bookRoutes);
app.use("/loans",    loanRoutes);
app.use("/products", productRoutes);
app.use("/plans",    planRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`📚 Library API running on http://localhost:${PORT}`);
  console.log(`   API Info : http://localhost:${PORT}/`);
  console.log(`   Health   : http://localhost:${PORT}/health`);
});
