# IBM API Connect — Sample APIs

다섯 개의 샘플 API를 제공합니다. 각 API는 IBM API Connect에 바로 등록할 수 있도록 설계되었습니다.

---

## 구성

```
.
├── api1-library/      ← Node.js + Express    | 직관적인 도서관 관리 REST API
├── api2-salary/       ← Python + FastAPI     | Keycloak OAuth2/OIDC + RBAC 연봉 관리 REST API
├── api3-tours/        ← Node.js + Express    | 크루즈 여행사 관리 REST API
├── api4-graphql/      ← Node.js + Apollo v4  | 크루즈 여행사 GraphQL API
├── api5-odata/        ← Node.js + Express    | OData 4.0 제품 카탈로그 API
├── local-dev/         ← Docker Compose로 로컬 전체 환경 실행 (Keycloak 포함)
└── apic/              ← IBM API Connect Assembly YAML 정책 파일
```

### 30초 로컬 시작

```bash
# API 1 — Library (포트 3000)
cd api1-library && npm install && npm start

# API 2 — Salary (포트 8001, Keycloak 필요)
cd local-dev && docker compose up --build
./init-keycloak.sh

# API 3 — Tours REST (포트 3002, 의존성 없음)
cd api3-tours && npm install && npm start

# API 4 — Tours GraphQL (포트 4000, 의존성 없음)
cd api4-graphql && npm install && npm start

# API 5 — OData Product Catalog (포트 3003, 의존성 없음)
cd api5-odata && npm install && npm start
```

→ Keycloak 포함 전체 환경: [local-dev/README.md](local-dev/README.md)

---

## API 1 — Library Management API

**목적:** 인증 없이 사용 가능한 직관적인 CRUD API 시연  
**기술 스택:** Node.js 18 + Express 4  
**포트:** `3000`

### 빠른 시작
```bash
cd api1-library
npm install
npm start
```

### 주요 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /books` | 도서 목록 (필터/페이징) |
| `POST /books` | 도서 등록 |
| `PATCH /books/:id` | 재고 조정 등 부분 수정 |
| `DELETE /books/:id` | 도서 삭제 (대출 중이면 409 반환) |
| `POST /loans` | 대출 신청 |
| `PATCH /loans/:id/return` | 반납 처리 |

→ 자세한 내용: [api1-library/README.md](api1-library/README.md)

---

## API 2 — Salary Management API

**목적:** OAuth2 JWT + 역할 기반 권한 관리(RBAC) 시연
**기술 스택:** Python 3.11 + FastAPI + Keycloak JWKS(RS256)
**포트:** `8001`
**API 문서:** http://localhost:8001/docs (Swagger UI 자동 제공)

### 빠른 시작
```bash
cd api2-salary
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 역할 권한 요약
```
employee  → 본인 연봉만 조회/수정 가능
manager   → 소속 팀 전체 연봉 조회/수정 가능
hr_system → 전체 조회/수정/삭제 가능 (퇴사 처리 등)
```

→ 자세한 내용: [api2-salary/README.md](api2-salary/README.md)

---

## API 3 — Tours Management API

**목적:** 크루즈 여행사 API — 상품/고객/예약 관리 CRUD 시연
**기술 스택:** Node.js 18 + Express 4 (in-memory, 의존성 없음)
**포트:** `3002`
**원본:** [nodetours](https://github.com/przemekulik/nodetours) 기반 (MongoDB/GraphQL 제거, REST 순수 재구성)

### 빠른 시작
```bash
cd api3-tours
npm install
npm start
```

### 주요 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /cruises` | 크루즈 상품 목록 (필터: startDate, endDate, startPort, numDays) |
| `GET /cruises/:id` | 크루즈 단건 조회 |
| `GET /customers` | 고객 목록 |
| `POST /customers` | 고객 등록 (이메일 중복 → 409) |
| `PUT /customers/:id` | 고객 정보 수정 |
| `DELETE /customers/:id` | 고객 삭제 (예약 있으면 409) |
| `GET /bookings` | 예약 목록 (필터: cruiseID, customerID) |
| `POST /bookings` | 예약 생성 |
| `PUT /bookings/:id` | 예약 수정 |
| `DELETE /bookings/:id` | 예약 취소 |

→ 자세한 내용: [api3-tours/README.md](api3-tours/README.md)

---

## API 4 — Tours GraphQL API

**목적:** GraphQL의 핵심 기능 시연 (Query/Mutation/Type resolver/Custom Scalars)
**기술 스택:** Node.js 18 + Apollo Server v4 + Express 4 (in-memory, 의존성 없음)
**포트:** `4000`

### 빠른 시작
```bash
cd api4-graphql
npm install
npm start
# → http://localhost:4000/graphql (Apollo Sandbox 자동 실행)
```

### 주요 Operation
| Operation | 설명 |
|-----------|------|
| `query { cruises { ... } }` | 크루즈 목록 (필터/페이징) |
| `query { customer(emailAddress: ...) { bookings { cruise { ... } } } }` | 고객+예약+크루즈 한 번에 조회 |
| `mutation { createBooking(input: ...) { ... } }` | 예약 생성 (비즈니스 검증 포함) |
| `mutation { deleteCustomer(emailAddress: ...) { ... } }` | 고객 삭제 (활성 예약 있으면 거부) |

### GraphQL vs REST 핵심 차이
- **한 번의 요청으로 관계 데이터 모두 조회** — N+1 문제 없음
- **필요한 필드만 선택** — 과다/과소 fetch 방지
- **스키마가 곧 문서** — Apollo Sandbox에서 자동 탐색 가능

→ 자세한 내용: [api4-graphql/README.md](api4-graphql/README.md) · [스키마 레퍼런스](api4-graphql/SCHEMA.md)

---

## API 5 — OData 4.0 Product Catalog API

**목적:** OData 4.0 쿼리 옵션(`$filter`, `$select`, `$orderby`, `$expand` 등) 시연
**기술 스택:** Node.js 18 + Express 4 (in-memory, 의존성 없음)
**포트:** `3003`

> **IBM API Connect 등록 시 참고:** IBM API Connect 12.1.1 기준, DataPower API Gateway는 별도의 "OData API" 타입을 지원하지 않습니다.
> 이 API는 **REST API(OpenAPI 3.0)** 로 등록하며, OData 쿼리 파라미터(`$filter`, `$expand` 등)는 `invoke` 정책의 **Parameter control**을 통해 백엔드로 그대로 전달됩니다.

### 빠른 시작
```bash
cd api5-odata
npm install
npm start
# → http://localhost:3003 (OData 서비스 문서)
```

### 주요 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /` | OData 서비스 문서 (엔티티 셋 목록) |
| `GET /$metadata` | CSDL XML 메타데이터 문서 |
| `GET /Products` | 제품 목록 (`$filter`, `$select`, `$orderby`, `$top`, `$skip`, `$count`, `$expand` 지원) |
| `GET /Products/{id}` | 제품 단건 조회 |
| `POST /Products` | 제품 생성 |
| `PATCH /Products/{id}` | 제품 부분 수정 |
| `DELETE /Products/{id}` | 제품 삭제 |
| `GET /Categories` | 카테고리 목록 (OData 쿼리 옵션 지원) |
| `GET /Categories/{id}/Products` | 카테고리별 제품 목록 (네비게이션 프로퍼티) |

### OData vs REST 핵심 차이
- **표준화된 쿼리 문법** — `$filter`, `$orderby`, `$select` 로 클라이언트가 직접 데이터 형태를 제어
- **`$expand` 로 관계 데이터 인라인** — 별도 요청 없이 연관 엔티티 포함
- **`/$metadata` 로 스키마 자동 노출** — CSDL XML 기반 자동 문서화

→ 자세한 내용: [api5-odata/README.md](api5-odata/README.md)

---

## IBM API Connect 등록 방법

> **게이트웨이 타입 선택 기준 (버전 12.1.1 기준)**
> - **DataPower API Gateway**: 기업 표준 게이트웨이. REST, SOAP, GraphQL API 지원. `invoke` 정책 버전 2.0.0 이상 사용.
> - **DataPower Nano Gateway**: 클라우드 네이티브 경량 게이트웨이. OpenAPI 3.0 REST API 전용 (OpenAPI 2.0 미지원).
> - **DataPower Gateway (v5 compatible)**: 레거시 호환 게이트웨이 (**deprecated** — 신규 배포에는 사용 금지).

### 방법 1 — OpenAPI 명세서로 REST API Import

IBM API Connect 12.1.1에서 REST API를 등록하는 정식 경로는 **API Studio > Add an API > Create a REST API from an OpenAPI definition**입니다.

| API | 명세서 파일 | Import 방법 |
|-----|-----------|------------|
| Library API | `api1-library/openapi.yaml` | API Studio > Add an API > From file (OpenAPI 3.0) |
| Salary API | `api2-salary/openapi.yaml` | API Studio > Add an API > From file (OpenAPI 3.0) |
| Tours REST API | `api3-tours/openapi.yaml` | API Studio > Add an API > From file (OpenAPI 3.0) |
| Tours GraphQL API | `api4-graphql/src/schema/schema.graphql` | API Studio > Add an API > Create a GraphQL API |
| OData Catalog API | `api5-odata/openapi.yaml` | API Studio > Add an API > From file (OpenAPI 3.0, REST API로 등록) |

### 방법 2 — APIC Assembly YAML로 Import (권장)

`apic/` 폴더의 파일은 **Assembly 정책이 포함된 완성형 API 정의**입니다.

> **참고:** `api5-odata`는 현재 `apic/` 폴더에 Assembly YAML이 제공되지 않습니다.
> API Studio UI를 통해 방법 1로 등록한 후, Assembly 편집기에서 `invoke` 정책을 직접 추가하세요.
> `invoke` 정책 설정 시 **Parameter control** 항목을 "Allowlist 없음(전체 통과)"으로 유지해야 `$filter`, `$expand` 등 OData 쿼리 파라미터가 백엔드로 정상 전달됩니다.

```bash
# apic CLI 로그인
apic login --server management.example.com --username admin

# API 정의 Publish
apic publish apic/api1-library-apic.yaml --server management.example.com \
  --organization my-org --catalog sandbox

apic publish apic/api2-salary-apic.yaml --server management.example.com \
  --organization my-org --catalog sandbox
```

→ 자세한 내용: [apic/README.md](apic/README.md)

---

## 요구 사항

| API | 런타임 | 최소 버전 |
|-----|--------|---------|
| API 1 | Node.js | 18+ |
| API 2 | Python | 3.11+ |
| API 3 | Node.js | 18+ |
| API 4 | Node.js | 18+ |
| API 5 | Node.js | 18+ |

---

## 배포 가이드

이 프로젝트는 세 가지 IBM API Connect 구성 환경을 모두 지원합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  시나리오 A — IBM API Connect on OpenShift (OCP)                │
│                                                                  │
│   OCP Cluster                                                    │
│   ┌──────────────┐    Route(HTTPS)    ┌──────────────────────┐  │
│   │  APIC        │ ◄────────────────► │  sample-apis NS      │  │
│   │  (OCP 설치)  │                    │  ┌────────────────┐   │  │
│   └──────────────┘                    │  │ library-api Pod│   │  │
│                                       │  │ salary-api Pod │   │  │
│                                       │  └────────────────┘   │  │
│                                       └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  시나리오 B — 표준 Kubernetes 클러스터 (EKS/GKE/AKS/온프레미스) │
│                                                                  │
│   K8s Cluster                                                    │
│   ┌──────────────┐  Ingress(HTTPS)  ┌──────────────────────┐    │
│   │  APIC        │ ◄──────────────► │  sample-apis NS      │    │
│   │  (K8s 설치)  │                  │  ┌────────────────┐   │    │
│   └──────────────┘                  │  │ library-api Pod│   │    │
│                                     │  │ salary-api Pod │   │    │
│                                     │  └────────────────┘   │    │
│                                     └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  시나리오 C — IBM API Connect OVA + 별도 Linux VM               │
│                                                                  │
│   VM-1: APIC OVA          VM-2: API Server (Linux)              │
│   ┌──────────────┐         ┌──────────────────────────┐         │
│   │  IBM API     │  HTTP   │  library-api  (port 3000)│         │
│   │  Connect OVA │ ◄──────►│  salary-api   (port 8000)│         │
│   └──────────────┘         │  (systemd 서비스로 운영) │         │
│                             └──────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

### 시나리오 A — OpenShift 배포

#### 전체 파일 구조

```
api1-library/
├── Dockerfile
├── openshift/
│   ├── imagestream.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── route.yaml
...

api2-salary/
├── Dockerfile
├── openshift/
│   ├── imagestream-and-configmap.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── route.yaml
...
```

#### 순서대로 배포하기

```bash
# 1. 네임스페이스 생성
oc new-project sample-apis

# 2. API 2 Keycloak ConfigMap 적용 (URL/Realm 먼저 수정)
oc apply -f api2-salary/openshift/imagestream-and-configmap.yaml -n sample-apis

# 3. 이미지 빌드 (OpenShift 내부 빌드 사용 시)
oc new-build --name=library-api --binary --strategy=docker -n sample-apis
oc start-build library-api --from-dir=./api1-library --follow -n sample-apis

oc new-build --name=salary-api --binary --strategy=docker -n sample-apis
oc start-build salary-api --from-dir=./api2-salary --follow -n sample-apis

# 4. API 1 매니페스트 적용
oc apply -f api1-library/openshift/ -n sample-apis

# 5. API 2 매니페스트 적용
oc apply -f api2-salary/openshift/ -n sample-apis

# 6. Route 확인
oc get routes -n sample-apis
```

#### Route URL 수정 필요 항목

배포 전 아래 파일의 `host:` 값을 실제 클러스터 도메인으로 변경하세요.

| 파일 | 기본값 | 변경 예시 |
|------|--------|---------|
| `api1-library/openshift/route.yaml` | `library-api.apps.your-cluster.example.com` | `library-api.apps.ocp.corp.com` |
| `api2-salary/openshift/route.yaml` | `salary-api.apps.your-cluster.example.com` | `salary-api.apps.ocp.corp.com` |

또는 `host:` 항목을 삭제하면 OpenShift가 자동으로 도메인을 할당합니다.

#### OpenShift 컨테이너 보안 고려 사항

모든 Deployment는 다음 보안 정책을 준수합니다:
- `runAsNonRoot: true` — root 로 실행 금지
- `allowPrivilegeEscalation: false` — 권한 상승 금지
- `capabilities.drop: [ALL]` — 모든 Linux 캐퍼빌리티 제거
- `seccompProfile: RuntimeDefault` — 기본 syscall 필터 적용

---

### 시나리오 B — Kubernetes 배포

#### OpenShift vs Kubernetes 핵심 차이

| 항목 | OpenShift | Kubernetes |
|------|-----------|-----------|
| 외부 노출 | `Route` (자동 TLS) | `Ingress` (Controller 필요) |
| 이미지 관리 | `ImageStream` | 레지스트리 직접 참조 |
| 이미지 빌드 | `oc new-build` | 로컬/CI 빌드 후 push |
| 네임스페이스 | `oc new-project` | `kubectl create namespace` |
| 보안 정책 | SCC | PodSecurityAdmission |

#### 전체 파일 구조

```
api1-library/
├── Dockerfile
├── kubernetes/
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
...

api2-salary/
├── Dockerfile
├── kubernetes/
│   ├── namespace.yaml
│   ├── configmap.yaml        ← Keycloak 설정
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
...
```

#### 순서대로 배포하기

```bash
# 1. 네임스페이스 생성
kubectl apply -f api1-library/kubernetes/namespace.yaml

# 2. API 2 Keycloak ConfigMap 적용 (URL/Realm 먼저 수정)
# vi api2-salary/kubernetes/configmap.yaml  ← keycloak-url 등 수정
kubectl apply -f api2-salary/kubernetes/configmap.yaml -n sample-apis

# 3. 이미지 빌드 & Push
docker build -t your-registry.example.com/sample-apis/library-api:latest ./api1-library
docker push your-registry.example.com/sample-apis/library-api:latest

docker build -t your-registry.example.com/sample-apis/salary-api:latest ./api2-salary
docker push your-registry.example.com/sample-apis/salary-api:latest

# 4. deployment.yaml의 image: 경로를 위에서 push한 이미지로 수정 후 적용
kubectl apply -f api1-library/kubernetes/ -n sample-apis
kubectl apply -f api2-salary/kubernetes/ -n sample-apis

# 5. Ingress 확인 (ADDRESS 할당 대기)
kubectl get ingress -n sample-apis
```

#### Ingress host 수정 필요 항목

| 파일 | 기본값 | 변경 예시 |
|------|--------|---------|
| `api1-library/kubernetes/ingress.yaml` | `library-api.your-cluster.example.com` | `library-api.k8s.corp.com` |
| `api2-salary/kubernetes/ingress.yaml` | `salary-api.your-cluster.example.com` | `salary-api.k8s.corp.com` |

---

### 시나리오 C — Linux VM 배포

#### 전체 파일 구조

```
api1-library/
├── deploy/vm/
│   ├── install.sh            ← 자동 설치 스크립트
│   ├── library-api.service   ← systemd 유닛 파일
│   └── library-api.env       ← 환경변수 템플릿
...

api2-salary/
├── deploy/vm/
│   ├── install.sh            ← 자동 설치 스크립트
│   ├── salary-api.service    ← systemd 유닛 파일
│   └── salary-api.env        ← 환경변수 템플릿 (KEYCLOAK_URL 포함)
...
```

#### VM 사양 권장

| 항목 | 권장 사양 |
|------|---------|
| OS | RHEL 8/9, Rocky Linux 8/9, Ubuntu 22.04 LTS |
| CPU | 2 vCPU 이상 |
| Memory | 2 GB 이상 |
| Disk | 20 GB 이상 |
| 네트워크 | IBM API Connect VM과 동일 네트워크 세그먼트 또는 라우팅 가능 |

#### 설치 순서

```bash
# ── VM에 소스 전송 ────────────────────────────────────────────────
scp -r ./api1-library user@<VM_IP>:/tmp/
scp -r ./api2-salary  user@<VM_IP>:/tmp/
ssh user@<VM_IP>

# ── API 2: JWT Secret 먼저 설정 ───────────────────────────────────
vi /tmp/api2-salary/deploy/vm/salary-api.env
# JWT_SECRET_KEY= 값을 openssl rand -hex 32 결과로 교체

# ── API 1 설치 ────────────────────────────────────────────────────
cd /tmp/api1-library
chmod +x deploy/vm/install.sh
sudo ./deploy/vm/install.sh

# ── API 2 설치 ────────────────────────────────────────────────────
cd /tmp/api2-salary
chmod +x deploy/vm/install.sh
sudo ./deploy/vm/install.sh

# ── API 3 설치 ────────────────────────────────────────────────────
cd /tmp/api3-tours
chmod +x deploy/vm/install.sh
sudo ./deploy/vm/install.sh

# ── 설치 후 확인 ──────────────────────────────────────────────────
curl http://localhost:3000/health   # API 1
curl http://localhost:8001/health   # API 2
curl http://localhost:3002/health   # API 3
```

#### 방화벽 설정 (세 API 포트 모두)

```bash
# RHEL/Rocky (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8001/tcp
sudo firewall-cmd --permanent --add-port=3002/tcp
sudo firewall-cmd --reload

# Ubuntu (ufw)
sudo ufw allow 3000/tcp
sudo ufw allow 8001/tcp
sudo ufw allow 3002/tcp
```

#### IBM API Connect (OVA) 에서 Backend URL 설정

| API | Backend URL |
|-----|-------------|
| Library API | `http://<VM_IP>:3000` |
| Salary API | `http://<VM_IP>:8001` |
| Salary API (Keycloak Issuer) | Keycloak URL 별도 설정 필요 |
| Tours API | `http://<VM_IP>:3002` |

> API Connect OVA VM과 API 서버 VM이 서로 통신할 수 있는지 반드시 확인하세요.  
> `curl http://<VM_IP>:3000/health` 를 APIC VM에서 직접 실행해 연결을 검증하세요.

---

## 프로젝트 전체 파일 구조

```
.
├── README.md
├── .spectral.yaml                      ← Spectral OpenAPI Lint 룰셋
│
├── api1-library/                       ← Node.js Library API
│   ├── Dockerfile / .dockerignore
│   ├── package.json
│   ├── openapi.yaml                    ← OpenAPI 3.0 명세서 (Spectral ✓)
│   ├── EXAMPLES.md
│   ├── src/
│   ├── openshift/                      ← OCP 배포 매니페스트
│   ├── kubernetes/                     ← K8s 배포 매니페스트
│   └── deploy/vm/                      ← Linux VM 배포 파일
│
├── api2-salary/                        ← Python Salary API (Keycloak OIDC)
│   ├── Dockerfile / .dockerignore
│   ├── requirements.txt
│   ├── openapi.yaml                    ← OpenAPI 3.0 명세서 (Spectral ✓)
│   ├── EXAMPLES.md
│   ├── app/
│   │   ├── main.py
│   │   ├── auth/security.py            ← Keycloak JWKS 검증
│   │   ├── data/store.py
│   │   └── routers/                    ← auth, salaries, obo
│   ├── tests/                          ← pytest 66 passed
│   ├── openshift/                      ← OCP 배포 매니페스트
│   ├── kubernetes/                     ← K8s 배포 매니페스트
│   └── deploy/vm/                      ← Linux VM 배포 파일
│
├── api3-tours/                         ← Node.js Tours API (in-memory, 의존성 없음)
│   ├── Dockerfile / .dockerignore
│   ├── package.json
│   ├── openapi.yaml                    ← OpenAPI 3.0 명세서 (Spectral ✓)
│   ├── EXAMPLES.md
│   ├── src/
│   │   ├── index.js                    ← Express 서버 (PORT=3002)
│   │   ├── data/store.js               ← in-memory (cruises/customers/bookings)
│   │   └── routes/                     ← cruises, customers, bookings
│   ├── openshift/                      ← OCP 배포 매니페스트
│   ├── kubernetes/                     ← K8s 배포 매니페스트
│   └── deploy/vm/                      ← Linux VM 배포 파일
│
├── api5-odata/                         ← Node.js OData 4.0 API (in-memory, 의존성 없음)
│   ├── Dockerfile / .dockerignore
│   ├── package.json
│   ├── openapi.yaml                    ← OpenAPI 3.0 명세서
│   ├── EXAMPLES.md
│   ├── src/
│   │   ├── index.js                    ← Express 서버 (PORT=3003)
│   │   ├── data/store.js               ← in-memory (products/categories)
│   │   └── routes/                     ← products, categories, metadata
│   ├── openshift/                      ← OCP 배포 매니페스트
│   ├── kubernetes/                     ← K8s 배포 매니페스트
│   └── deploy/vm/                      ← Linux VM 배포 파일
│
├── local-dev/                          ← 로컬 개발 환경 (Docker Compose)
│   ├── docker-compose.yml              ← Keycloak + Salary API + Library API
│   ├── init-keycloak.sh                ← Realm 초기화 + UUID 자동 패치
│   ├── README.md
│   └── keycloak/realm-export/
│       └── corp-realm.json             ← Realm 자동 import
│
├── postman/                            ← Postman Collection
│   └── IBM-API-Connect-SampleAPIs.postman_collection.json
│
├── apic/                               ← IBM API Connect Assembly YAML
│   ├── api1-library-apic.yaml          ← Library API 정책 (set-variable + invoke)
│   ├── api2-salary-apic.yaml           ← Salary API 정책 (oauth + invoke)
│   └── README.md
│
└── .github/workflows/                  ← GitHub Actions CI/CD
    ├── ci-library-api.yml              ← ESLint + Docker Build + Push
    ├── ci-salary-api.yml               ← Ruff + pytest + Docker Build + Push
    ├── ci-tours-api.yml                ← ESLint + Docker Build + Push
    └── openapi-lint.yml                ← Spectral lint 통합 검사
```
