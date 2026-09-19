# Tours GraphQL API — Examples (EXAMPLES.md)

IBM API Connect 샘플 GraphQL API (`api4-graphql`)의 실제 사용 예시입니다.  
서버를 먼저 기동한 후 아래 예시를 실행하세요.

```bash
cd api4-graphql
npm install
npm start
# → http://localhost:4000/graphql
```

---

## 목차

1. [Apollo Sandbox (브라우저)](#1-apollo-sandbox-브라우저)
2. [curl 예시](#2-curl-예시)
3. [Query 예시](#3-query-예시)
4. [Mutation 예시](#4-mutation-예시)
5. [필터 & 페이지네이션](#5-필터--페이지네이션)
6. [에러 케이스](#6-에러-케이스)
7. [GraphQL vs REST 비교](#7-graphql-vs-rest-비교)

---

## 1. Apollo Sandbox (브라우저)

서버 기동 후 브라우저에서 `http://localhost:4000/graphql` 접속 →  
Apollo Sandbox가 자동으로 열립니다. 스키마 탐색, 쿼리 자동완성, 실행까지 모두 가능합니다.

---

## 2. curl 예시

```bash
# Health Check
curl http://localhost:4000/health

# 크루즈 목록 조회
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ cruises { total items { cruiseID title startDate numDays } } }"}' | jq .
```

---

## 3. Query 예시

### 3-1. 전체 크루즈 목록

```graphql
query GetAllCruises {
  cruises {
    total
    items {
      cruiseID
      title
      startDate
      endDate
      startPort
      numDays
      roomTypes {
        roomID
        name
        pricePerNight
        currency
      }
      bookingCount
    }
  }
}
```

**curl:**
```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { cruises { total items { cruiseID title startDate numDays bookingCount } } }"}' | jq .
```

---

### 3-2. 단일 크루즈 상세 조회

```graphql
query GetCruise {
  cruise(cruiseID: "CRUISE-001") {
    cruiseID
    title
    description
    startDate
    endDate
    startPort
    numDays
    roomTypes {
      roomID
      name
      maxOccupancy
      pricePerNight
      currency
    }
    bookingCount
    bookings {
      bookingID
      status
      customer {
        fullName
      }
    }
  }
}
```

**curl:**
```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ cruise(cruiseID: \"CRUISE-001\") { title numDays roomTypes { roomID pricePerNight } bookingCount } }"}' | jq .
```

---

### 3-3. 고객 상세 + 예약 목록 (한 번의 쿼리로 모두 조회!)

```graphql
query GetCustomerWithBookings {
  customer(emailAddress: "alice@tours.com") {
    emailAddress
    fullName
    phone
    address {
      city
      country
    }
    bookingCount
    bookings {
      bookingID
      status
      cruise {
        title
        startDate
        endDate
        startPort
      }
      room {
        roomID
        numRooms
        details {
          name
          pricePerNight
          currency
        }
      }
      numPassengers
      bookedAt
    }
  }
}
```

> **GraphQL의 강점**: REST라면 `GET /customers/alice` → `GET /bookings?customerId=alice` → 각 예약마다 `GET /cruises/{id}` 를 여러 번 호출해야 하지만, GraphQL은 이 모든 데이터를 **한 번의 요청**으로 가져옵니다.

**curl:**
```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ customer(emailAddress: \"alice@tours.com\") { fullName bookings { bookingID cruise { title startDate } room { details { pricePerNight } } } } }"}' | jq .
```

---

### 3-4. 예약 단건 조회 (전체 관계 자동 조인)

```graphql
query GetBooking {
  booking(bookingID: "1001") {
    bookingID
    status
    cruise {
      title
      startDate
      endDate
      startPort
    }
    customer {
      fullName
      phone
      address {
        city
        country
      }
    }
    room {
      roomID
      numRooms
      details {
        name
        maxOccupancy
        pricePerNight
        currency
      }
    }
    numPassengers
    bookedAt
    updatedAt
  }
}
```

**curl:**
```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ booking(bookingID: \"1001\") { status cruise { title } customer { fullName } room { roomID details { name pricePerNight } } } }"}' | jq .
```

---

## 4. Mutation 예시

### 4-1. 고객 등록

```graphql
mutation CreateCustomer {
  createCustomer(input: {
    emailAddress: "dave@tours.com"
    firstName: "Dave"
    lastName: "Brown"
    phone: "+1-555-0104"
    address: {
      street: "321 Sunset Blvd"
      city: "Los Angeles"
      state: "CA"
      postalCode: "90001"
      country: "USA"
    }
  }) {
    success
    message
    customer {
      emailAddress
      fullName
      createdAt
    }
  }
}
```

**curl:**
```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createCustomer(input: { emailAddress: \"dave@tours.com\", firstName: \"Dave\", lastName: \"Brown\", phone: \"+1-555-0104\", address: { street: \"321 Sunset Blvd\", city: \"Los Angeles\", state: \"CA\", postalCode: \"90001\", country: \"USA\" } }) { success message customer { emailAddress fullName } } }"
  }' | jq .
```

---

### 4-2. 예약 생성

```graphql
mutation CreateBooking {
  createBooking(input: {
    cruiseID: "CRUISE-002"
    customerID: "carol@tours.com"
    room: { roomID: BAL, numRooms: 1 }
    numPassengers: 2
  }) {
    success
    message
    booking {
      bookingID
      status
      cruise {
        title
        startDate
      }
      customer {
        fullName
      }
      room {
        roomID
        details {
          name
          pricePerNight
        }
      }
    }
  }
}
```

**curl:**
```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createBooking(input: { cruiseID: \"CRUISE-002\", customerID: \"carol@tours.com\", room: { roomID: BAL, numRooms: 1 }, numPassengers: 2 }) { success message booking { bookingID status cruise { title } } } }"}' | jq .
```

---

### 4-3. 고객 정보 수정

```graphql
mutation UpdateCustomer {
  updateCustomer(
    emailAddress: "alice@tours.com"
    input: {
      phone: "+1-555-9999"
      address: {
        street: "999 New Street"
        city: "San Francisco"
        state: "CA"
        postalCode: "94105"
        country: "USA"
      }
    }
  ) {
    success
    message
    customer {
      emailAddress
      phone
      address {
        street
        city
      }
    }
  }
}
```

---

### 4-4. 예약 상태 변경 (취소)

```graphql
mutation CancelBooking {
  updateBooking(
    bookingID: "1002"
    input: { status: CANCELLED }
  ) {
    success
    message
    booking {
      bookingID
      status
      updatedAt
    }
  }
}
```

---

### 4-5. 예약 삭제

```graphql
mutation DeleteBooking {
  deleteBooking(bookingID: "1002") {
    success
    message
    deletedId
  }
}
```

---

### 4-6. 고객 삭제

```graphql
# carol은 활성 예약이 없으므로 삭제 가능
mutation DeleteCustomer {
  deleteCustomer(emailAddress: "carol@tours.com") {
    success
    message
    deletedId
  }
}
```

---

## 5. 필터 & 페이지네이션

### 출발항 필터 + 일수 범위

```graphql
query FilterCruises {
  cruises(
    filter: {
      startPort: "Barcelona"
      minNumDays: 10
      maxNumDays: 15
    }
  ) {
    total
    items {
      cruiseID
      title
      startPort
      numDays
    }
  }
}
```

### 날짜 범위 필터

```graphql
query CruisesInSummer {
  cruises(filter: {
    startDateFrom: "2025-07-01"
    startDateTo: "2025-09-30"
  }) {
    total
    items { cruiseID title startDate startPort }
  }
}
```

### 고객 국가 필터

```graphql
query USCustomers {
  customers(filter: { country: "USA" }) {
    total
    items {
      emailAddress
      fullName
      bookingCount
    }
  }
}
```

### 예약 상태 필터

```graphql
query ConfirmedBookings {
  bookings(filter: { status: CONFIRMED }) {
    total
    items {
      bookingID
      cruise { title startDate }
      customer { fullName }
      room { roomID }
    }
  }
}
```

### 페이지네이션

```graphql
query BookingsPage2 {
  bookings(pagination: { offset: 10, limit: 5 }) {
    total
    items {
      bookingID
      status
    }
  }
}
```

---

## 6. 에러 케이스

### 존재하지 않는 크루즈로 예약

```graphql
mutation {
  createBooking(input: {
    cruiseID: "CRUISE-999"
    customerID: "alice@tours.com"
    room: { roomID: INT, numRooms: 1 }
    numPassengers: 1
  }) {
    success   # false
    message   # "Cruise 'CRUISE-999' not found."
    booking   # null
  }
}
```

### 활성 예약이 있는 고객 삭제 시도

```graphql
mutation {
  deleteCustomer(emailAddress: "alice@tours.com") {
    success   # false
    message   # "Cannot delete customer 'alice@tours.com': 1 active booking(s) exist."
  }
}
```

### 완료된 예약 수정 시도

```graphql
mutation {
  updateBooking(bookingID: "1001" input: { status: PENDING }) {
    success   # false (COMPLETED 상태 불변)
    message
  }
}
```

### 잘못된 이메일 형식 (스키마 유효성 검사)

```graphql
query {
  customer(emailAddress: "not-an-email") {
    fullName  # GraphQL 에러: Invalid email address
  }
}
```

---

## 7. GraphQL vs REST 비교

| 시나리오 | REST | GraphQL |
|----------|------|---------|
| 고객 + 예약 + 크루즈 정보 한 번에 | 3~4회 API 호출 | 1회 쿼리 |
| 필요한 필드만 선택 | 전체 응답 수신 후 필터링 | 쿼리에서 필드 지정 |
| 관계 데이터 탐색 | N+1 문제 발생 가능 | Type resolver 자동 처리 |
| API 변경 | 버전 관리 필요 | 스키마 확장 (기존 클라이언트 무중단) |
| 문서화 | OpenAPI 별도 작성 | 스키마가 곧 문서 (Introspection) |

---

> 전체 스키마 레퍼런스는 [SCHEMA.md](./SCHEMA.md)를 참조하세요.
