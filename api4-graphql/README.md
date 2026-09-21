# Tours GraphQL API (`api4-graphql`)

IBM API Connect 등록용 샘플 GraphQL API입니다.  
**Apollo Server v4 + Express** 기반으로 구현되었으며, 크루즈 여행사 예약 관리 도메인을 다룹니다.

---

## 특징

| 항목 | 내용 |
|------|------|
| **런타임** | Node.js 18+ |
| **프레임워크** | Apollo Server v4 + Express 4 |
| **포트** | 4000 |
| **데이터** | In-memory (재시작 시 초기화) |
| **GraphQL** | Query / Mutation / Subscription (선언) |
| **Scalars** | Date, DateTime, EmailAddress (커스텀) |

---

## 도메인 모델

```
Cruise (크루즈 상품)
  └── RoomType[] (INT / BAL / STE)

Customer (고객)
  └── Address (주소)

Booking (예약)
  ├── Cruise  ← 자동 조인
  ├── Customer ← 자동 조인
  └── BookedRoom (room.details ← 자동 조인)
```

---

## 빠른 시작

```bash
cd api4-graphql
npm install
npm start
```

서버 기동 후:

| 엔드포인트 | 설명 |
|-----------|------|
| `POST http://localhost:4000/graphql` | GraphQL 쿼리/뮤테이션 |
| `GET  http://localhost:4000/graphql` | Apollo Sandbox (브라우저) |
| `GET  http://localhost:4000/health`  | Health check |

### 동작 확인

```bash
# Health check
curl http://localhost:4000/health

# 크루즈 목록
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ cruises { total items { cruiseID title numDays } } }"}' | jq .

# 예약 단건 조회 (관계 자동 조인)
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ booking(bookingID: \"1001\") { status cruise { title } customer { fullName } room { details { pricePerNight } } } }"}' | jq .
```

---

## 사전 등록된 샘플 데이터

### Cruises

| ID | 이름 | 출발항 | 일수 |
|----|------|--------|------|
| `CRUISE-001` | Mediterranean Discovery | Barcelona | 14 |
| `CRUISE-002` | Caribbean Paradise | Miami | 7 |
| `CRUISE-003` | Northern Europe Fjords | Copenhagen | 11 |

### Customers

| 이메일 | 이름 | 국가 |
|--------|------|------|
| `alice@tours.com` | Alice Smith | USA |
| `bob@tours.com` | Bob Johnson | USA |
| `carol@tours.com` | Carol Williams | GBR |

### Bookings

| ID | 크루즈 | 고객 | 객실 | 상태 |
|----|--------|------|------|------|
| `1001` | CRUISE-001 | alice | BAL | CONFIRMED |
| `1002` | CRUISE-003 | bob | STE | CONFIRMED |

---

## Docker

```bash
# 이미지 빌드
docker build -t tours-graphql-api:latest .

# 실행
docker run -d --name tours-graphql-api -p 4000:4000 tours-graphql-api:latest

# 로그 확인
docker logs -f tours-graphql-api
```

---

## OpenShift 배포

```bash
# 1. 프로젝트 생성
oc new-project tours-graphql-api

# 2. 리소스 일괄 적용
oc apply -f openshift/

# 3. 빌드 시작
oc start-build tours-graphql-api --follow

# 4. 외부 접근 URL 확인
oc get route tours-graphql-api -o jsonpath='{.spec.host}'
```

배포 후: `https://<route-host>/graphql` 에서 Apollo Sandbox 접근 가능

---

## Kubernetes 배포

```bash
# 1. 네임스페이스 생성
kubectl create namespace tours-graphql-api

# 2. 리소스 일괄 적용
kubectl apply -f kubernetes/ -n tours-graphql-api

# 3. 파드 상태 확인
kubectl get pods -n tours-graphql-api

# 4. 포트 포워딩 (로컬 테스트)
kubectl port-forward svc/tours-graphql-api 4000:4000 -n tours-graphql-api
```

---

## Linux VM 배포

```bash
# 1. 필수 패키지 설치
bash deploy/vm/install.sh

# 2. 애플리케이션 배포
bash deploy/vm/deploy.sh

# 3. systemd 서비스 등록 및 기동
bash deploy/vm/service.sh
```

---

## IBM API Connect 연동

### 1. API 임포트

`apic/api4-graphql-apic.yaml` 파일을 IBM API Connect Manager에서 임포트합니다.

### 2. GraphQL 프록시 정책

```yaml
# API Connect Assembly (GraphQL Proxy)
execute:
  - gatewayscript:
      title: forward-graphql
      source: |
        context.message.header.set('Content-Type', 'application/json');
  - proxy:
      title: graphql-backend
      target-url: http://tours-graphql-api:4000/graphql
```

### 3. 역할 기반 접근 제어 (API Connect OAuth)

API Connect에서 OAuth2 정책을 추가하면 다음과 같이 역할을 구분할 수 있습니다:

| 역할 | 허용 작업 |
|------|----------|
| `GUEST` | 크루즈 조회만 |
| `CUSTOMER` | 본인 예약 CRUD |
| `AGENT` | 모든 고객/예약 관리 |
| `ADMIN` | 전체 (크루즈 관리 포함) |

---

## 스키마 레퍼런스 & GraphQL SDL 명세서

이 API의 핵심 명세는 GraphQL Schema Definition Language(SDL)로 정의되어 있습니다.

- **SDL 명세서 파일 경로**: [`src/schema/schema.graphql`](./src/schema/schema.graphql)
- **전체 스키마 상세 문서**: [SCHEMA.md](./SCHEMA.md)
- **호출 쿼리/뮤테이션 예시**: [EXAMPLES.md](./EXAMPLES.md)

### SDL 주요 구성 요소

1. **Custom Scalars**: `Date` (ISO 8601 YYYY-MM-DD), `DateTime` (ISO 8601 UTC), `EmailAddress` (RFC 5322)
2. **Core Types & Enums**:
   - `Cruise`, `RoomType`, `Customer`, `Address`, `Booking`, `BookedRoom`
   - `BookingStatus` (PENDING, CONFIRMED, CANCELLED, COMPLETED), `RoomTypeCode` (INT, BAL, STE), `Currency`, `SortDirection`
3. **Product & Plan 카탈로그 관리**:
   - `Product`, `Plan`, `RateLimitPolicy`, `PlanPrice`
   - `CatalogStatus` (DRAFT, REVIEW, PUBLISHED, REJECTED, DEPRECATED), `ProductVisibility`, `RateLimitUnit`
4. **Root Operations**:
   - **Query**: `cruises`, `cruise`, `customers`, `customer`, `bookings`, `booking`, `products`, `product`, `plans`, `plan` (다중 필터 및 `PaginationInput` 지원)
   - **Mutation**:
     - 고객 관리: `createCustomer`, `updateCustomer`, `deleteCustomer`
     - 예약 관리: `createBooking`, `updateBooking`, `deleteBooking`
     - 카탈로그 수명주기: `createProduct`, `updateProduct`, `submitProductForReview`, `publishProduct`, `rejectProduct`, `deprecateProduct`, `deleteProduct` 및 Plan CRUD/배포
   - **Subscription**: `bookingUpdated`, `cruiseBookingUpdated` (실시간 예약 이벤트)

---

## 프로젝트 구조

```
api4-graphql/
├── src/
│   ├── index.js              # Apollo Server v4 + Express 진입점
│   ├── schema/
│   │   └── schema.graphql    # GraphQL SDL (전체 스키마)
│   ├── resolvers/
│   │   ├── queries.js        # Query 리졸버
│   │   ├── mutations.js      # Mutation 리졸버
│   │   └── types.js          # Type 리졸버 + 커스텀 스칼라
│   └── data/
│       └── store.js          # In-memory 데이터 스토어
├── Dockerfile
├── package.json
├── SCHEMA.md
├── EXAMPLES.md
├── openshift/                # OpenShift 배포 매니페스트
├── kubernetes/               # Kubernetes 배포 매니페스트
└── deploy/vm/                # Linux VM 배포 스크립트
```
