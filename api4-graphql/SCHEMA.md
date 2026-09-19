# Tours GraphQL API — Schema Reference (SCHEMA.md)

IBM API Connect 샘플 GraphQL API의 전체 스키마 레퍼런스입니다.

---

## 목차

1. [Custom Scalars](#custom-scalars)
2. [Enums](#enums)
3. [Types](#types)
4. [Input Types](#input-types)
5. [Query](#query)
6. [Mutation](#mutation)
7. [Subscription](#subscription)

---

## Custom Scalars

| Scalar | 형식 | 예시 |
|--------|------|------|
| `Date` | ISO 8601 날짜 (YYYY-MM-DD) | `"2025-06-01"` |
| `DateTime` | ISO 8601 날짜+시간 (UTC) | `"2024-11-01T08:00:00.000Z"` |
| `EmailAddress` | RFC 5322 이메일 | `"alice@tours.com"` |

---

## Enums

### `BookingStatus`

| 값 | 설명 |
|----|------|
| `PENDING` | 대기 중 — 결제 또는 확인 대기 |
| `CONFIRMED` | 확정됨 — 예약 확정 및 결제 완료 |
| `CANCELLED` | 취소됨 |
| `COMPLETED` | 완료됨 — 여행 종료 |

### `RoomTypeCode`

| 값 | 설명 |
|----|------|
| `INT` | Interior Cabin — 창문 없음, 가장 경제적 |
| `BAL` | Balcony Cabin — 개인 발코니, 바다 전망 |
| `STE` | Suite — 별도 거실, 풀 오션뷰, 버틀러 서비스 |

### `Currency`

`USD` · `EUR` · `GBP` · `KRW`

### `SortDirection`

`ASC` · `DESC`

---

## Types

### `Cruise`

| 필드 | 타입 | 설명 |
|------|------|------|
| `cruiseID` | `ID!` | 고유 ID (예: `CRUISE-001`) |
| `title` | `String!` | 크루즈 이름 |
| `description` | `String!` | 상세 설명 |
| `startDate` | `Date!` | 출발일 |
| `endDate` | `Date!` | 도착일 |
| `startPort` | `String!` | 출발항 |
| `numDays` | `Int!` | 항해 일수 |
| `roomTypes` | `[RoomType!]!` | 객실 유형 목록 |
| `bookings` | `[Booking!]!` | 이 크루즈의 예약 목록 |
| `bookingCount` | `Int!` | 예약 수 (computed) |

### `RoomType`

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomID` | `RoomTypeCode!` | 객실 유형 코드 |
| `name` | `String!` | 객실 이름 |
| `description` | `String!` | 객실 설명 |
| `maxOccupancy` | `Int!` | 최대 수용 인원 |
| `pricePerNight` | `Float!` | 1박 가격 |
| `currency` | `Currency!` | 통화 |

### `Customer`

| 필드 | 타입 | 설명 |
|------|------|------|
| `emailAddress` | `EmailAddress!` | 고유 ID (이메일) |
| `firstName` | `String!` | 이름 |
| `lastName` | `String!` | 성 |
| `fullName` | `String!` | 전체 이름 (computed) |
| `phone` | `String!` | 전화번호 |
| `address` | `Address!` | 주소 |
| `createdAt` | `DateTime!` | 계정 생성 일시 |
| `bookings` | `[Booking!]!` | 이 고객의 예약 목록 |
| `bookingCount` | `Int!` | 예약 수 (computed) |

### `Address`

| 필드 | 타입 |
|------|------|
| `street` | `String!` |
| `city` | `String!` |
| `state` | `String` |
| `postalCode` | `String!` |
| `country` | `String!` |

### `Booking`

| 필드 | 타입 | 설명 |
|------|------|------|
| `bookingID` | `ID!` | 예약 ID |
| `status` | `BookingStatus!` | 예약 상태 |
| `cruise` | `Cruise!` | 크루즈 정보 (자동 join) |
| `customer` | `Customer!` | 고객 정보 (자동 join) |
| `room` | `BookedRoom!` | 예약 객실 정보 |
| `numPassengers` | `Int!` | 탑승 인원 |
| `bookedAt` | `DateTime!` | 예약 생성 일시 |
| `updatedAt` | `DateTime` | 마지막 수정 일시 |

### `BookedRoom`

| 필드 | 타입 | 설명 |
|------|------|------|
| `roomID` | `RoomTypeCode!` | 객실 유형 코드 |
| `numRooms` | `Int!` | 예약 객실 수 |
| `details` | `RoomType` | 객실 상세 정보 (자동 조회) |

---

## Input Types

### `CreateCustomerInput`

```graphql
input CreateCustomerInput {
  emailAddress: EmailAddress!
  firstName:    String!
  lastName:     String!
  phone:        String!
  address:      AddressInput!
}
```

### `UpdateCustomerInput`

```graphql
input UpdateCustomerInput {
  firstName: String
  lastName:  String
  phone:     String
  address:   AddressInput
}
```

### `CreateBookingInput`

```graphql
input CreateBookingInput {
  cruiseID:      ID!
  customerID:    EmailAddress!
  room:          BookedRoomInput!
  numPassengers: Int!
}
```

### `UpdateBookingInput`

```graphql
input UpdateBookingInput {
  status:        BookingStatus
  room:          BookedRoomInput
  numPassengers: Int
}
```

### `CruiseFilterInput`

```graphql
input CruiseFilterInput {
  startDateFrom: Date
  startDateTo:   Date
  startPort:     String   # 부분 일치
  minNumDays:    Int
  maxNumDays:    Int
}
```

### `CustomerFilterInput`

```graphql
input CustomerFilterInput {
  country:    String   # 정확히 일치 (예: USA, GBR)
  nameSearch: String   # firstName/lastName 부분 일치
}
```

### `BookingFilterInput`

```graphql
input BookingFilterInput {
  cruiseID:   ID
  customerID: EmailAddress
  status:     BookingStatus
}
```

### `PaginationInput`

```graphql
input PaginationInput {
  offset: Int = 0
  limit:  Int = 20
}
```

---

## Query

| 필드 | 인자 | 반환 타입 | 설명 |
|------|------|-----------|------|
| `cruises` | `filter`, `pagination` | `CruiseConnection!` | 크루즈 목록 |
| `cruise` | `cruiseID: ID!` | `Cruise` | 단일 크루즈 |
| `customers` | `filter`, `pagination` | `CustomerConnection!` | 고객 목록 |
| `customer` | `emailAddress: EmailAddress!` | `Customer` | 단일 고객 |
| `bookings` | `filter`, `pagination` | `BookingConnection!` | 예약 목록 |
| `booking` | `bookingID: ID!` | `Booking` | 단일 예약 |

---

## Mutation

| 필드 | 인자 | 반환 타입 | 설명 |
|------|------|-----------|------|
| `createCustomer` | `input: CreateCustomerInput!` | `CustomerPayload!` | 고객 등록 |
| `updateCustomer` | `emailAddress`, `input` | `CustomerPayload!` | 고객 수정 |
| `deleteCustomer` | `emailAddress: EmailAddress!` | `DeletePayload!` | 고객 삭제 (활성 예약 없을 때만) |
| `createBooking` | `input: CreateBookingInput!` | `BookingPayload!` | 예약 생성 |
| `updateBooking` | `bookingID`, `input` | `BookingPayload!` | 예약 수정 (COMPLETED/CANCELLED 불가) |
| `deleteBooking` | `bookingID: ID!` | `DeletePayload!` | 예약 취소 (COMPLETED 불가) |

### Payload 타입

```graphql
type CustomerPayload {
  success:  Boolean!
  message:  String!
  customer: Customer   # 성공 시 반환
}

type BookingPayload {
  success: Boolean!
  message: String!
  booking: Booking     # 성공 시 반환
}

type DeletePayload {
  success:   Boolean!
  message:   String!
  deletedId: ID!
}
```

---

## Subscription

> Subscription은 개념적으로 선언되어 있으며, WebSocket 트랜스포트 설정 시 활성화됩니다.
> IBM API Connect AsyncAPI 정책과 연동 가능합니다.

| 이벤트 | 인자 | 반환 타입 |
|--------|------|-----------|
| `bookingUpdated` | — | `Booking!` |
| `cruiseBookingUpdated` | `cruiseID: ID!` | `Booking!` |

---

## 에러 처리

GraphQL 에러는 두 가지 방식으로 반환됩니다:

1. **Mutation 결과 내 에러** (`success: false`): 비즈니스 로직 오류 (존재하지 않는 리소스, 중복, 상태 충돌 등)
2. **GraphQL 표준 에러** (`errors[]`): 스키마 유효성 검사 실패, 잘못된 타입 등

### 예시 에러 응답

```json
{
  "data": {
    "createBooking": {
      "success": false,
      "message": "Cruise 'CRUISE-999' not found.",
      "booking": null
    }
  }
}
```
