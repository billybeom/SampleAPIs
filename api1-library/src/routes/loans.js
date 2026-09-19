const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const db = require("../data/books");

/**
 * GET /loans  – list all loans
 */
router.get("/", (req, res) => {
  const { status, bookId } = req.query;
  let result = [...db.loans];

  if (status) result = result.filter((l) => l.status === status);
  if (bookId) result = result.filter((l) => l.bookId === bookId);

  res.json({ total: result.length, data: result });
});

/**
 * GET /loans/:id
 */
router.get("/:id", (req, res) => {
  const loan = db.loans.find((l) => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  res.json(loan);
});

/**
 * POST /loans  – borrow a book
 */
router.post("/", (req, res) => {
  const { bookId, borrowerName, borrowerEmail, daysToLoan = 14 } = req.body;

  if (!bookId || !borrowerName || !borrowerEmail) {
    return res
      .status(400)
      .json({ error: "bookId, borrowerName, borrowerEmail are required" });
  }

  const book = db.books.find((b) => b.id === bookId);
  if (!book) return res.status(404).json({ error: "Book not found" });
  if (!book.available || book.stock < 1) {
    return res
      .status(409)
      .json({ error: "Book is not available for loan", bookId });
  }

  const loanDate = new Date();
  const dueDate = new Date(loanDate);
  dueDate.setDate(dueDate.getDate() + parseInt(daysToLoan));

  const loan = {
    id: `l${uuidv4().split("-")[0]}`,
    bookId,
    borrowerName,
    borrowerEmail,
    loanDate: loanDate.toISOString().split("T")[0],
    dueDate: dueDate.toISOString().split("T")[0],
    returnDate: null,
    status: "active",
  };

  db.loans.push(loan);
  book.stock -= 1;
  book.available = book.stock > 0;

  res.status(201).json({ loan, book });
});

/**
 * PATCH /loans/:id/return  – return a book
 */
router.patch("/:id/return", (req, res) => {
  const loan = db.loans.find((l) => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: "Loan not found" });
  if (loan.status === "returned") {
    return res.status(409).json({ error: "Book already returned" });
  }

  loan.status = "returned";
  loan.returnDate = new Date().toISOString().split("T")[0];

  const book = db.books.find((b) => b.id === loan.bookId);
  if (book) {
    book.stock += 1;
    book.available = true;
  }

  res.json({ message: "Book returned successfully", loan });
});

module.exports = router;
