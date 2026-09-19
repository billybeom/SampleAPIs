const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../data/books");

/**
 * GET /books
 * Query params: genre, available, author, page, limit
 */
router.get("/", (req, res) => {
  let result = [...db.books];
  const { genre, available, author, page = 1, limit = 10 } = req.query;

  if (genre) {
    result = result.filter(
      (b) => b.genre.toLowerCase() === genre.toLowerCase()
    );
  }
  if (available !== undefined) {
    result = result.filter((b) => b.available === (available === "true"));
  }
  if (author) {
    result = result.filter((b) =>
      b.author.toLowerCase().includes(author.toLowerCase())
    );
  }

  const total = result.length;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const start = (pageNum - 1) * limitNum;
  const data = result.slice(start, start + limitNum);

  res.json({
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    data,
  });
});

/**
 * GET /books/:id
 */
router.get("/:id", (req, res) => {
  const book = db.books.find((b) => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: "Book not found", id: req.params.id });
  }
  res.json(book);
});

/**
 * POST /books
 */
router.post("/", (req, res) => {
  const { title, author, isbn, genre, publishedYear, stock = 1 } = req.body;

  if (!title || !author || !isbn) {
    return res
      .status(400)
      .json({ error: "title, author, isbn are required fields" });
  }

  const duplicate = db.books.find((b) => b.isbn === isbn);
  if (duplicate) {
    return res
      .status(409)
      .json({ error: "A book with this ISBN already exists", isbn });
  }

  const newBook = {
    id: `b${uuidv4().split("-")[0]}`,
    title,
    author,
    isbn,
    genre: genre || "Uncategorized",
    publishedYear: publishedYear || null,
    available: stock > 0,
    stock,
  };

  db.books.push(newBook);
  res.status(201).json(newBook);
});

/**
 * PUT /books/:id  – full update
 */
router.put("/:id", (req, res) => {
  const idx = db.books.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  const { title, author, isbn, genre, publishedYear, available, stock } =
    req.body;
  const book = db.books[idx];

  db.books[idx] = {
    ...book,
    title: title ?? book.title,
    author: author ?? book.author,
    isbn: isbn ?? book.isbn,
    genre: genre ?? book.genre,
    publishedYear: publishedYear ?? book.publishedYear,
    available: available ?? book.available,
    stock: stock ?? book.stock,
  };

  res.json(db.books[idx]);
});

/**
 * PATCH /books/:id  – partial update (e.g. stock adjustment)
 */
router.patch("/:id", (req, res) => {
  const idx = db.books.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  const updates = req.body;
  db.books[idx] = { ...db.books[idx], ...updates };

  // keep available flag consistent with stock
  if (updates.stock !== undefined) {
    db.books[idx].available = db.books[idx].stock > 0;
  }

  res.json(db.books[idx]);
});

/**
 * DELETE /books/:id
 */
router.delete("/:id", (req, res) => {
  const idx = db.books.findIndex((b) => b.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: "Book not found" });
  }

  const activeLoans = db.loans.filter(
    (l) => l.bookId === req.params.id && l.status === "active"
  );
  if (activeLoans.length > 0) {
    return res.status(409).json({
      error: "Cannot delete book with active loans",
      activeLoans: activeLoans.length,
    });
  }

  const [deleted] = db.books.splice(idx, 1);
  res.json({ message: "Book deleted successfully", book: deleted });
});

module.exports = router;
