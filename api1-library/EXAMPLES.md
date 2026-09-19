# 📚 Library Management API — 상세 사용 예시

> 서버가 `http://localhost:3000` 에서 실행 중인 것을 전제합니다.  
> `jq` 가 설치되어 있으면 응답을 예쁘게 출력할 수 있습니다.

---

## 목차

1. [Health / API Info](#1-health--api-info)
2. [도서 목록 조회 — 다양한 필터 조합](#2-도서-목록-조회--다양한-필터-조합)
3. [도서 단건 조회](#3-도서-단건-조회)
4. [도서 등록](#4-도서-등록)
5. [도서 전체 수정 (PUT)](#5-도서-전체-수정-put)
6. [도서 부분 수정 (PATCH) — 재고 조정](#6-도서-부분-수정-patch--재고-조정)
7. [도서 삭제](#7-도서-삭제)
8. [대출 목록 조회](#8-대출-목록-조회)
9. [도서 대출 신청](#9-도서-대출-신청)
10. [도서 반납](#10-도서-반납)
11. [에러 케이스 모음](#11-에러-케이스-모음)
12. [연속 시나리오 — 도서 등록부터 반납까지](#12-연속-시나리오--도서-등록부터-반납까지)

---

## 1. Health / API Info

### 서버 상태 확인

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "ok",
  "timestamp": "2024-11-15T09:00:00.000Z"
}
```

### API 정보 및 엔드포인트 목록 확인

```bash
curl http://localhost:3000/
```

```json
{
  "name": "Library Management API",
  "version": "1.0.0",
  "description": "Sample REST API for IBM API Connect demonstration",
  "endpoints": {
    "books": {
      "GET /books": "List all books (supports ?genre, ?available, ?author, ?page, ?limit)",
      "GET /books/:id": "Get a single book by ID",
      "POST /books": "Add a new book",
      "PUT /books/:id": "Update a book (full)",
      "PATCH /books/:id": "Update a book (partial)",
      "DELETE /books/:id": "Delete a book"
    },
    "loans": {
      "GET /loans": "List all loan records",
      "GET /loans/:id": "Get a single loan record",
      "POST /loans": "Borrow a book",
      "PATCH /loans/:id/return": "Return a borrowed book"
    }
  }
}
```

---

## 2. 도서 목록 조회 — 다양한 필터 조합

### 2-1. 전체 목록 (기본)

```bash
curl http://localhost:3000/books
```

```json
{
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    {
      "id": "b001",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "isbn": "978-0132350884",
      "genre": "Technology",
      "publishedYear": 2008,
      "available": true,
      "stock": 3
    },
    {
      "id": "b002",
      "title": "The Pragmatic Programmer",
      "author": "David Thomas, Andrew Hunt",
      "isbn": "978-0135957059",
      "genre": "Technology",
      "publishedYear": 2019,
      "available": true,
      "stock": 2
    },
    {
      "id": "b003",
      "title": "Design Patterns",
      "author": "Gang of Four",
      "isbn": "978-0201633610",
      "genre": "Technology",
      "publishedYear": 1994,
      "available": false,
      "stock": 0
    },
    {
      "id": "b004",
      "title": "Sapiens",
      "author": "Yuval Noah Harari",
      "isbn": "978-0062316097",
      "genre": "History",
      "publishedYear": 2011,
      "available": true,
      "stock": 5
    },
    {
      "id": "b005",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "isbn": "978-0743273565",
      "genre": "Fiction",
      "publishedYear": 1925,
      "available": true,
      "stock": 4
    }
  ]
}
```

### 2-2. 장르 필터 — Technology 도서만

```bash
curl "http://localhost:3000/books?genre=Technology"
```

```json
{
  "total": 3,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    { "id": "b001", "title": "Clean Code", "genre": "Technology", "available": true, "stock": 3 },
    { "id": "b002", "title": "The Pragmatic Programmer", "genre": "Technology", "available": true, "stock": 2 },
    { "id": "b003", "title": "Design Patterns", "genre": "Technology", "available": false, "stock": 0 }
  ]
}
```

### 2-3. 대출 가능 도서만 필터

```bash
curl "http://localhost:3000/books?available=true"
```

```json
{
  "total": 4,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    { "id": "b001", "title": "Clean Code", "available": true, "stock": 3 },
    { "id": "b002", "title": "The Pragmatic Programmer", "available": true, "stock": 2 },
    { "id": "b004", "title": "Sapiens", "available": true, "stock": 5 },
    { "id": "b005", "title": "The Great Gatsby", "available": true, "stock": 4 }
  ]
}
```

### 2-4. 장르 + 대출가능 복합 필터

```bash
curl "http://localhost:3000/books?genre=Technology&available=true"
```

```json
{
  "total": 2,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    { "id": "b001", "title": "Clean Code", "available": true, "stock": 3 },
    { "id": "b002", "title": "The Pragmatic Programmer", "available": true, "stock": 2 }
  ]
}
```

### 2-5. 저자명 부분 검색

```bash
# "Martin" 을 포함하는 저자
curl "http://localhost:3000/books?author=Martin"
```

```json
{
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    {
      "id": "b001",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "isbn": "978-0132350884",
      "genre": "Technology",
      "publishedYear": 2008,
      "available": true,
      "stock": 3
    }
  ]
}
```

### 2-6. 페이징 — 페이지당 2건씩, 2페이지

```bash
curl "http://localhost:3000/books?limit=2&page=2"
```

```json
{
  "total": 5,
  "page": 2,
  "limit": 2,
  "totalPages": 3,
  "data": [
    { "id": "b003", "title": "Design Patterns" },
    { "id": "b004", "title": "Sapiens" }
  ]
}
```

### 2-7. 복합 조건 — Technology 장르, 대출가능, 페이지 1건씩

```bash
curl "http://localhost:3000/books?genre=Technology&available=true&limit=1&page=1"
```

```json
{
  "total": 2,
  "page": 1,
  "limit": 1,
  "totalPages": 2,
  "data": [
    { "id": "b001", "title": "Clean Code", "available": true, "stock": 3 }
  ]
}
```

---

## 3. 도서 단건 조회

### 3-1. 존재하는 도서 조회

```bash
curl http://localhost:3000/books/b001
```

```json
{
  "id": "b001",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "genre": "Technology",
  "publishedYear": 2008,
  "available": true,
  "stock": 3
}
```

### 3-2. 대출 중인 도서 조회 (stock=0, available=false)

```bash
curl http://localhost:3000/books/b003
```

```json
{
  "id": "b003",
  "title": "Design Patterns",
  "author": "Gang of Four",
  "isbn": "978-0201633610",
  "genre": "Technology",
  "publishedYear": 1994,
  "available": false,
  "stock": 0
}
```

---

## 4. 도서 등록

### 4-1. 기술 서적 등록 (모든 필드)

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Refactoring: Improving the Design of Existing Code",
    "author": "Martin Fowler",
    "isbn": "978-0134757599",
    "genre": "Technology",
    "publishedYear": 2018,
    "stock": 3
  }'
```

```json
{
  "id": "ba3f2c1d",
  "title": "Refactoring: Improving the Design of Existing Code",
  "author": "Martin Fowler",
  "isbn": "978-0134757599",
  "genre": "Technology",
  "publishedYear": 2018,
  "available": true,
  "stock": 3
}
```

### 4-2. 필수 필드만으로 등록 (genre/publishedYear 생략)

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Art of War",
    "author": "Sun Tzu",
    "isbn": "978-0195014761"
  }'
```

```json
{
  "id": "cb5d3e2f",
  "title": "The Art of War",
  "author": "Sun Tzu",
  "isbn": "978-0195014761",
  "genre": "Uncategorized",
  "publishedYear": null,
  "available": true,
  "stock": 1
}
```

### 4-3. 소설 등록

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "1984",
    "author": "George Orwell",
    "isbn": "978-0451524935",
    "genre": "Fiction",
    "publishedYear": 1949,
    "stock": 5
  }'
```

```json
{
  "id": "dc6e4f3a",
  "title": "1984",
  "author": "George Orwell",
  "isbn": "978-0451524935",
  "genre": "Fiction",
  "publishedYear": 1949,
  "available": true,
  "stock": 5
}
```

---

## 5. 도서 전체 수정 (PUT)

### 5-1. 모든 필드 교체

```bash
curl -X PUT http://localhost:3000/books/b001 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Code (개정판)",
    "author": "Robert C. Martin",
    "isbn": "978-0132350884",
    "genre": "Technology",
    "publishedYear": 2008,
    "available": true,
    "stock": 5
  }'
```

```json
{
  "id": "b001",
  "title": "Clean Code (개정판)",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "genre": "Technology",
  "publishedYear": 2008,
  "available": true,
  "stock": 5
}
```

---

## 6. 도서 부분 수정 (PATCH) — 재고 조정

### 6-1. 재고만 증가

```bash
curl -X PATCH http://localhost:3000/books/b002 \
  -H "Content-Type: application/json" \
  -d '{ "stock": 5 }'
```

```json
{
  "id": "b002",
  "title": "The Pragmatic Programmer",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0135957059",
  "genre": "Technology",
  "publishedYear": 2019,
  "available": true,
  "stock": 5
}
```

### 6-2. 재고 0으로 설정 → available 자동으로 false 전환

```bash
curl -X PATCH http://localhost:3000/books/b004 \
  -H "Content-Type: application/json" \
  -d '{ "stock": 0 }'
```

```json
{
  "id": "b004",
  "title": "Sapiens",
  "available": false,
  "stock": 0
}
```

### 6-3. 장르만 변경

```bash
curl -X PATCH http://localhost:3000/books/b004 \
  -H "Content-Type: application/json" \
  -d '{ "genre": "Non-Fiction" }'
```

```json
{
  "id": "b004",
  "title": "Sapiens",
  "genre": "Non-Fiction",
  "available": true,
  "stock": 5
}
```

### 6-4. 여러 필드 동시 변경

```bash
curl -X PATCH http://localhost:3000/books/b005 \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 10,
    "genre": "Classic Fiction"
  }'
```

```json
{
  "id": "b005",
  "title": "The Great Gatsby",
  "genre": "Classic Fiction",
  "available": true,
  "stock": 10
}
```

---

## 7. 도서 삭제

### 7-1. 정상 삭제

```bash
curl -X DELETE http://localhost:3000/books/b005
```

```json
{
  "message": "Book deleted successfully",
  "book": {
    "id": "b005",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "isbn": "978-0743273565",
    "genre": "Fiction",
    "publishedYear": 1925,
    "available": true,
    "stock": 4
  }
}
```

---

## 8. 대출 목록 조회

### 8-1. 전체 대출 목록

```bash
curl http://localhost:3000/loans
```

```json
{
  "total": 1,
  "data": [
    {
      "id": "l001",
      "bookId": "b003",
      "borrowerName": "Alice Kim",
      "borrowerEmail": "alice@example.com",
      "loanDate": "2024-11-01",
      "dueDate": "2024-11-15",
      "returnDate": null,
      "status": "active"
    }
  ]
}
```

### 8-2. 특정 도서의 대출 기록만 조회

```bash
curl "http://localhost:3000/loans?bookId=b003"
```

```json
{
  "total": 1,
  "data": [
    {
      "id": "l001",
      "bookId": "b003",
      "borrowerName": "Alice Kim",
      "borrowerEmail": "alice@example.com",
      "loanDate": "2024-11-01",
      "dueDate": "2024-11-15",
      "returnDate": null,
      "status": "active"
    }
  ]
}
```

### 8-3. 반납 완료된 대출 기록만 조회

```bash
curl "http://localhost:3000/loans?status=returned"
```

```json
{
  "total": 0,
  "data": []
}
```

### 8-4. 대출 단건 조회

```bash
curl http://localhost:3000/loans/l001
```

```json
{
  "id": "l001",
  "bookId": "b003",
  "borrowerName": "Alice Kim",
  "borrowerEmail": "alice@example.com",
  "loanDate": "2024-11-01",
  "dueDate": "2024-11-15",
  "returnDate": null,
  "status": "active"
}
```

---

## 9. 도서 대출 신청

### 9-1. 기본 대출 (14일)

```bash
curl -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "b001",
    "borrowerName": "홍길동",
    "borrowerEmail": "hong@example.com",
    "daysToLoan": 14
  }'
```

```json
{
  "loan": {
    "id": "l8f3a2b1",
    "bookId": "b001",
    "borrowerName": "홍길동",
    "borrowerEmail": "hong@example.com",
    "loanDate": "2024-11-15",
    "dueDate": "2024-11-29",
    "returnDate": null,
    "status": "active"
  },
  "book": {
    "id": "b001",
    "title": "Clean Code",
    "available": true,
    "stock": 2
  }
}
```

### 9-2. 단기 대출 (7일)

```bash
curl -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "b002",
    "borrowerName": "김민지",
    "borrowerEmail": "minji.kim@corp.com",
    "daysToLoan": 7
  }'
```

```json
{
  "loan": {
    "id": "l9g4b3c2",
    "bookId": "b002",
    "borrowerName": "김민지",
    "borrowerEmail": "minji.kim@corp.com",
    "loanDate": "2024-11-15",
    "dueDate": "2024-11-22",
    "returnDate": null,
    "status": "active"
  },
  "book": {
    "id": "b002",
    "title": "The Pragmatic Programmer",
    "available": true,
    "stock": 1
  }
}
```

### 9-3. 마지막 재고 대출 → stock=0, available=false 전환 확인

```bash
# b002 재고가 1권만 남아 있을 때 대출
curl -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "b002",
    "borrowerName": "이철수",
    "borrowerEmail": "cs.lee@corp.com",
    "daysToLoan": 14
  }'
```

```json
{
  "loan": {
    "id": "lae5c4d3",
    "bookId": "b002",
    "borrowerName": "이철수",
    "borrowerEmail": "cs.lee@corp.com",
    "loanDate": "2024-11-15",
    "dueDate": "2024-11-29",
    "returnDate": null,
    "status": "active"
  },
  "book": {
    "id": "b002",
    "title": "The Pragmatic Programmer",
    "available": false,
    "stock": 0
  }
}
```

---

## 10. 도서 반납

### 10-1. 정상 반납

```bash
curl -X PATCH http://localhost:3000/loans/l001/return
```

```json
{
  "message": "Book returned successfully",
  "loan": {
    "id": "l001",
    "bookId": "b003",
    "borrowerName": "Alice Kim",
    "borrowerEmail": "alice@example.com",
    "loanDate": "2024-11-01",
    "dueDate": "2024-11-15",
    "returnDate": "2024-11-15",
    "status": "returned"
  }
}
```

> 반납 후 해당 도서의 `stock` 이 1 증가하고 `available` 이 `true` 로 변경됩니다.

### 10-2. 반납 후 도서 상태 확인

```bash
curl http://localhost:3000/books/b003
```

```json
{
  "id": "b003",
  "title": "Design Patterns",
  "available": true,
  "stock": 1
}
```

---

## 11. 에러 케이스 모음

### 11-1. 존재하지 않는 도서 조회 → 404

```bash
curl http://localhost:3000/books/b999
```

```json
{
  "error": "Book not found",
  "id": "b999"
}
```

**HTTP Status: `404 Not Found`**

### 11-2. 중복 ISBN으로 도서 등록 → 409

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Code (복사본)",
    "author": "Robert C. Martin",
    "isbn": "978-0132350884"
  }'
```

```json
{
  "error": "A book with this ISBN already exists",
  "isbn": "978-0132350884"
}
```

**HTTP Status: `409 Conflict`**

### 11-3. 필수 필드 누락으로 도서 등록 → 400

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "제목만 있는 책"
  }'
```

```json
{
  "error": "title, author, isbn are required fields"
}
```

**HTTP Status: `400 Bad Request`**

### 11-4. 재고 없는 도서 대출 시도 → 409

```bash
curl -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "b003",
    "borrowerName": "박영희",
    "borrowerEmail": "yh.park@example.com",
    "daysToLoan": 14
  }'
```

```json
{
  "error": "Book is not available for loan",
  "bookId": "b003"
}
```

**HTTP Status: `409 Conflict`**

### 11-5. 대출 필수 필드 누락 → 400

```bash
curl -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "b001"
  }'
```

```json
{
  "error": "bookId, borrowerName, borrowerEmail are required"
}
```

**HTTP Status: `400 Bad Request`**

### 11-6. 대출 중인 도서 삭제 시도 → 409

```bash
# b003은 l001 대출이 active 상태인 경우
curl -X DELETE http://localhost:3000/books/b003
```

```json
{
  "error": "Cannot delete book with active loans",
  "activeLoans": 1
}
```

**HTTP Status: `409 Conflict`**

### 11-7. 이미 반납된 대출 재반납 시도 → 409

```bash
curl -X PATCH http://localhost:3000/loans/l001/return
```

```json
{
  "error": "Book already returned"
}
```

**HTTP Status: `409 Conflict`**

### 11-8. 없는 라우트 접근 → 404

```bash
curl http://localhost:3000/nonexistent
```

```json
{
  "error": "Route not found",
  "path": "/nonexistent"
}
```

**HTTP Status: `404 Not Found`**

---

## 12. 연속 시나리오 — 도서 등록부터 반납까지

아래는 전체 라이프사이클을 순서대로 실행하는 시나리오입니다.

```bash
BASE=http://localhost:3000

# ── Step 1: 신규 도서 등록 ────────────────────────────────────────────────────
echo "=== Step 1: 도서 등록 ==="
BOOK=$(curl -s -X POST ${BASE}/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Domain-Driven Design",
    "author": "Eric Evans",
    "isbn": "978-0321125217",
    "genre": "Technology",
    "publishedYear": 2003,
    "stock": 2
  }')
echo $BOOK
BOOK_ID=$(echo $BOOK | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "등록된 도서 ID: $BOOK_ID"

# ── Step 2: 등록된 도서 조회 확인 ────────────────────────────────────────────
echo ""
echo "=== Step 2: 도서 조회 ==="
curl -s ${BASE}/books/${BOOK_ID}

# ── Step 3: 첫 번째 대출 ─────────────────────────────────────────────────────
echo ""
echo "=== Step 3: 첫 번째 대출 (홍길동, 14일) ==="
LOAN1=$(curl -s -X POST ${BASE}/loans \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"${BOOK_ID}\",
    \"borrowerName\": \"홍길동\",
    \"borrowerEmail\": \"hong@example.com\",
    \"daysToLoan\": 14
  }")
echo $LOAN1
LOAN1_ID=$(echo $LOAN1 | python3 -c "import sys,json; print(json.load(sys.stdin)['loan']['id'])")
echo "대출 ID: $LOAN1_ID"

# ── Step 4: 두 번째 대출 (재고 1 남음) ───────────────────────────────────────
echo ""
echo "=== Step 4: 두 번째 대출 (김민지, 7일) — 재고 1 남음 ==="
LOAN2=$(curl -s -X POST ${BASE}/loans \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"${BOOK_ID}\",
    \"borrowerName\": \"김민지\",
    \"borrowerEmail\": \"minji@example.com\",
    \"daysToLoan\": 7
  }")
echo $LOAN2
LOAN2_ID=$(echo $LOAN2 | python3 -c "import sys,json; print(json.load(sys.stdin)['loan']['id'])")

# ── Step 5: 재고 소진 후 추가 대출 시도 → 409 ────────────────────────────────
echo ""
echo "=== Step 5: 재고 소진 후 추가 대출 시도 → 409 ==="
curl -s -X POST ${BASE}/loans \
  -H "Content-Type: application/json" \
  -d "{
    \"bookId\": \"${BOOK_ID}\",
    \"borrowerName\": \"이철수\",
    \"borrowerEmail\": \"cs@example.com\",
    \"daysToLoan\": 14
  }"

# ── Step 6: 재고 보충 (PATCH) ─────────────────────────────────────────────────
echo ""
echo "=== Step 6: 재고 보충 (stock: 5) ==="
curl -s -X PATCH ${BASE}/books/${BOOK_ID} \
  -H "Content-Type: application/json" \
  -d '{ "stock": 5 }'

# ── Step 7: 첫 번째 대출 반납 ────────────────────────────────────────────────
echo ""
echo "=== Step 7: 홍길동 반납 ==="
curl -s -X PATCH ${BASE}/loans/${LOAN1_ID}/return

# ── Step 8: 대출 현황 확인 ───────────────────────────────────────────────────
echo ""
echo "=== Step 8: 전체 대출 현황 확인 ==="
curl -s "${BASE}/loans?bookId=${BOOK_ID}"

# ── Step 9: 도서 최종 상태 확인 ──────────────────────────────────────────────
echo ""
echo "=== Step 9: 도서 최종 상태 ==="
curl -s ${BASE}/books/${BOOK_ID}
```

---

## Python requests 예시

```python
import requests

BASE = "http://localhost:3000"

# 도서 목록 조회
resp = requests.get(f"{BASE}/books", params={"genre": "Technology", "available": "true"})
books = resp.json()
print(f"총 {books['total']}권 조회됨")
for b in books["data"]:
    print(f"  [{b['id']}] {b['title']} — 재고: {b['stock']}")

# 도서 등록
new_book = requests.post(f"{BASE}/books", json={
    "title": "Clean Architecture",
    "author": "Robert C. Martin",
    "isbn": "978-0134494166",
    "genre": "Technology",
    "publishedYear": 2017,
    "stock": 3,
}).json()
print(f"\n등록 완료: {new_book['id']} — {new_book['title']}")

# 대출 신청
loan = requests.post(f"{BASE}/loans", json={
    "bookId": new_book["id"],
    "borrowerName": "테스트 사용자",
    "borrowerEmail": "test@example.com",
    "daysToLoan": 14,
}).json()
print(f"대출 완료: {loan['loan']['id']} — 반납 예정일 {loan['loan']['dueDate']}")

# 반납
ret = requests.patch(f"{BASE}/loans/{loan['loan']['id']}/return").json()
print(f"반납 완료: {ret['loan']['status']} — {ret['loan']['returnDate']}")
```

---

## JavaScript / fetch 예시

```javascript
const BASE = "http://localhost:3000";

// 도서 목록 조회
const booksRes = await fetch(`${BASE}/books?genre=Technology`);
const books = await booksRes.json();
console.log(`총 ${books.total}권:`, books.data.map(b => b.title));

// 도서 등록
const newBook = await fetch(`${BASE}/books`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "You Don't Know JS",
    author: "Kyle Simpson",
    isbn: "978-1491924464",
    genre: "Technology",
    publishedYear: 2015,
    stock: 4,
  }),
}).then(r => r.json());
console.log("등록:", newBook.id, newBook.title);

// 대출
const loan = await fetch(`${BASE}/loans`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    bookId: newBook.id,
    borrowerName: "홍길동",
    borrowerEmail: "hong@example.com",
    daysToLoan: 14,
  }),
}).then(r => r.json());
console.log("대출:", loan.loan.id, "반납일:", loan.loan.dueDate);

// 반납
const ret = await fetch(`${BASE}/loans/${loan.loan.id}/return`, {
  method: "PATCH",
}).then(r => r.json());
console.log("반납:", ret.loan.status, ret.loan.returnDate);
```
