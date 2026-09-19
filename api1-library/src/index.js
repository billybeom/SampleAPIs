const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const bookRoutes = require("./routes/books");
const loanRoutes = require("./routes/loans");

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
    },
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/books", bookRoutes);
app.use("/loans", loanRoutes);

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
