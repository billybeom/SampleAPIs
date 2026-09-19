// In-memory sample data store
let books = [
  {
    id: "b001",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    genre: "Technology",
    publishedYear: 2008,
    available: true,
    stock: 3,
  },
  {
    id: "b002",
    title: "The Pragmatic Programmer",
    author: "David Thomas, Andrew Hunt",
    isbn: "978-0135957059",
    genre: "Technology",
    publishedYear: 2019,
    available: true,
    stock: 2,
  },
  {
    id: "b003",
    title: "Design Patterns",
    author: "Gang of Four",
    isbn: "978-0201633610",
    genre: "Technology",
    publishedYear: 1994,
    available: false,
    stock: 0,
  },
  {
    id: "b004",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    isbn: "978-0062316097",
    genre: "History",
    publishedYear: 2011,
    available: true,
    stock: 5,
  },
  {
    id: "b005",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "978-0743273565",
    genre: "Fiction",
    publishedYear: 1925,
    available: true,
    stock: 4,
  },
];

let loans = [
  {
    id: "l001",
    bookId: "b003",
    borrowerName: "Alice Kim",
    borrowerEmail: "alice@example.com",
    loanDate: "2024-11-01",
    dueDate: "2024-11-15",
    returnDate: null,
    status: "active",
  },
];

module.exports = { books, loans };
