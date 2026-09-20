# IBM API Connect — Gateway 배포 가이드

이 폴더는 `api1` ~ `api5` 5개 샘플 API를 **IBM API Connect**의 각 Gateway 유형에 등록·배포하는 YAML 파일 모음입니다.  
각 Gateway의 정책 설정 방식과 Swagger 2.0 / OpenAPI 3.0 명세 방식을 비교하는 것이 주요 목적입니다.

---

## 폴더 구조

```
apic/
├── README.md                     ← 이 파일 (전체 가이드 및 비교 자료)
│
├── datapower/                    ← DataPower API Gateway 배포 파일
│   ├── README.md
│   ├── api1-datapower.yaml       ← Library API    (Swagger 2.0 + OAS 3.0)
│   ├── api2-datapower.yaml       ← Salary API     (Swagger 2.0 + OAS 3.0)
│   ├── api3-datapower.yaml       ← Tours API      (Swagger 2.0 + OAS 3.0)
│   ├── api4-datapower.yaml       ← GraphQL API    (Swagger 2.0 + OAS 3.0)
│   └── api5-datapower.yaml       ← OData API      (Swagger 2.0 + OAS 3.0)
│
├── webmethods/                   ← webMethods API Gateway 배포 파일
│   ├── README.md
│   ├── api1-webmethods.yaml      ← Library API    (Swagger 2.0 + OAS 3.0)
│   ├── api2-webmethods.yaml      ← Salary API     (Swagger 2.0 + OAS 3.0)
│   ├── api3-webmethods.yaml      ← Tours API      (Swagger 2.0 + OAS 3.0)
│   ├── api4-webmethods.yaml      ← GraphQL API    (Swagger 2.0 + OAS 3.0)
│   └── api5-webmethods.yaml      ← OData API      (Swagger 2.0 + OAS 3.0)
│
├── nano/                         ← DataPower Nano Gateway 배포 파일
│   ├── README.md
│   ├── api1-nano.yaml            ← Library API    (OAS 3.0 전용)
│   ├── api2-nano.yaml            ← Salary API     (OAS 3.0 전용)
│   ├── api3-nano.yaml            ← Tours API      (OAS 3.0 전용)
│   ├── api4-nano.yaml            ← GraphQL API    (OAS 3.0 전용)
│   └── api5-nano.yaml            ← OData API      (OAS 3.0 전용)
│
├── keycloak/                     ← Keycloak 3rd Party IdP 연동 구성
│   ├── README.md
│   ├── keycloak-idp-dev.yaml     ← OIDC User Registry + Third-Party OAuth Provider (개발)
│   ├── keycloak-idp-staging.yaml ← OIDC User Registry + Third-Party OAuth Provider (스테이징)
│   ├── keycloak-idp-prod.yaml    ← OIDC User Registry + Third-Party OAuth Provider (운영)
│   ├── keycloak-oauth-policy.yaml← DataPower Assembly JWT/OAuth 검증 정책 패턴
│   ├── keycloak-rbac-policy.yaml ← RBAC 역할별 접근 제어 GatewayScript 정책
│   └── keycloak-setup-guide.md  ← Keycloak Admin Console 단계별 설정 가이드
│
├── api1-library-apic.yaml        ← (레거시) 초기 DataPower 배포 파일
└── api2-salary-apic.yaml         ← (레거시) 초기 DataPower 배포 파일
```

---

## API 목록

| ID | 폴더 | 이름 | 포트 | 인증 | 특이사항 |
|----|------|------|------|------|----------|
| api1 | `api1-library/` | Library Management API | 3000 | 없음 | 도서/대출 CRUD, 페이징/필터 |
| api2 | `api2-salary/` | Salary Management API | 8001 | Keycloak OAuth2 | RBAC (employee/manager/hr_system) |
| api3 | `api3-tours/` | Tours Management API | 3002 | 없음 | 크루즈/고객/예약, id=emailAddress |
| api4 | `api4-graphql/` | GraphQL Product API | 4000 | 없음 | Apollo Server v4, 단일 엔드포인트 |
| api5 | `api5-odata/` | OData Product Catalog | 3003 | 없음 | OData 4.0, $filter/$expand/$count |

---

## Gateway 유형 비교

| 기능 | DataPower API GW | webMethods API GW | Nano Gateway |
|------|-----------------|-------------------|--------------|
| **OAS 버전** | Swagger 2.0 + OAS 3.0 | Swagger 2.0 + OAS 3.0 | **OAS 3.0 전용** |
| **설정 키워드** | `datapower-api-gateway` | `webmethods-api-gateway` | `datapower-nano-gateway` |
| **정책 이름 형식** | `kebab-case` | `kebab-case` | **PascalCase** |
| **Rate Limit** | `rate-limit` (plan) | `rate-limiter` (count/interval) | `RateLimit` (count/interval/unit) |
| **변수 설정** | `set-variable` | `set-context-variable` | `Set` |
| **헤더 주입** | `set-variable (actions)` | `request-transformation` | `Set (headers)` |
| **백엔드 호출** | `invoke` (target-url) | `invoke` (url 직접) | `Invoke` (JSONata URL) |
| **스크립팅** | `gatewayscript` (JS) | 미지원 (external-endpoint) | `LuaScript` (Lua) |
| **인증** | `oauth` (provider) | `identify-and-authorize` | `ExtractIdentity` → `Authenticate` → `Authorize` |
| **Outbound 인증** | `set-variable` | `set-authorization` | `Invoke (forward-headers)` |
| **CORS** | `cors: enabled: true` (설정 섹션) | `cors: enabled: true` (설정 섹션) | `Cors` (assembly 정책) |
| **에러 처리** | `catch` 블록 | `conditional-error-processing` | `catch` 블록 |
| **조건 분기** | `switch` / `if` | `content-based-routing` | `If` (JSONata) |
| **Circuit Breaker** | 미지원 | 미지원 | `CircuitBreaker` (Nano 전용) |
| **캐싱** | (별도 정책) | `service-result-cache` | `Cache` |
| **로깅** | Activity Log (설계 탭) | `log` 정책 | OpenTelemetry |
| **변수 참조 문법** | `$(variable)` | `$(variable)` | JSONata: `$variable` |

---

## Gateway별 Assembly 정책 비교 — 상세

### 인증 없는 API (api1, api3, api5) — 기본 프록시 패턴

```yaml
# ── DataPower API Gateway ────────────────────────────────────────
assembly:
  execute:
    - rate-limit:           # plan 기반
        source: plan
    - set-variable:         # 헤더 주입
        actions:
          - set: message.headers.X-API-Gateway
            value: IBM-DataPower-API-Gateway
    - invoke:               # target-url 변수 참조
        target-url: $(target-url)$(request.path)$(request.search)
        verb: keep

# ── webMethods API Gateway ───────────────────────────────────────
assembly:
  execute:
    - rate-limiter:         # count/interval 직접 지정
        rate:
          count: 100
          interval: 60
    - request-transformation:  # 헤더 주입 (별도 정책)
        transformations:
          - type: set-header
            name: X-API-Gateway
            value: IBM-webMethods-API-Gateway
    - invoke:               # url 직접 기재
        url: http://backend:port$(request.path)$(request.search)
        verb: keep

# ── Nano Gateway ────────────────────────────────────────────────
assembly:
  execute:
    - RateLimit:            # PascalCase, count/interval/unit
        count: 100
        interval: 60
        unit: second
    - Cors:                 # CORS를 정책으로 추가 (DataPower/webMethods와 차이)
        allow-origins: ["*"]
    - Set:                  # 헤더 설정
        headers:
          X-API-Gateway: "IBM-Nano-Gateway"
    - Invoke:               # JSONata URL 표현식
        url: "http://backend:port{$request.path}{$request.queryString ? '?' & $request.queryString : ''}"
        verb: keep
```

### Keycloak 연동 구성 (`keycloak/` 폴더)

`keycloak/` 폴더는 DataPower API Gateway에서 Keycloak을 3rd Party IdP로 사용할 때
필요한 모든 YAML 정책 파일과 설정 가이드를 포함합니다.

| 파일 | 내용 |
|------|------|
| `keycloak-idp-{env}.yaml` | OIDC User Registry + Third-Party OAuth Provider (환경별) |
| `keycloak-oauth-policy.yaml` | JWT 로컬 검증(JWKS), OAuth2 인트로스펙션, 전체 통합 패턴 |
| `keycloak-rbac-policy.yaml` | api2-salary, api1-library, api3-tours RBAC GatewayScript |
| `keycloak-setup-guide.md` | Realm/Client/역할/토큰 TTL 등 단계별 설정 가이드 |

자세한 내용은 [`keycloak/README.md`](keycloak/README.md)를 참조하세요.

---

### OAuth2 인증 API (api2) — Keycloak 연동 패턴

```yaml
# ── DataPower API Gateway ────────────────────────────────────────
assembly:
  execute:
    # 방법 A: API Connect oauth 정책 (주석 해제 시 활성화)
    # - oauth:
    #     provider: keycloak-corp
    #     output: decoded-token
    - set-variable:
        actions:
          - set: message.headers.Authorization    # Outbound Token 전달
            value: $(request.headers.authorization)

# ── webMethods API Gateway ───────────────────────────────────────
assembly:
  execute:
    - identify-and-authorize:   # 단일 정책으로 인증+인가
        auth-type: oauth2
        provider: keycloak-corp
        validation-method: introspect
        extract-claims:
          - claim: sub
            variable: user-sub
    - set-authorization:        # Outbound 인증 설정
        type: pass-through

# ── Nano Gateway ────────────────────────────────────────────────
assembly:
  execute:
    - ExtractIdentity:          # 1단계: 토큰 추출
        source: header
        header-name: Authorization
    - Authenticate:             # 2단계: JWKS 서명 검증
        auth-type: jwt
        jwt-validation:
          jwks-uri: http://keycloak:8080/realms/corp/...
    - Authorize:                # 3단계: 클레임 확인
        claims:
          - name: sub
            required: true
    - Invoke:                   # 토큰 포워딩
        forward-headers:
          - Authorization
```

---

## Swagger 2.0 vs OpenAPI 3.0 명세 비교

| 항목 | Swagger 2.0 | OpenAPI 3.0 |
|------|-------------|-------------|
| **버전 선언** | `swagger: "2.0"` | `openapi: "3.0.3"` |
| **서버 정의** | `host` + `basePath` + `schemes` | `servers: [{url: ...}]` |
| **요청 본문** | `parameters: [{in: body, schema: {...}}]` | `requestBody: {content: {...}}` |
| **컨텐츠 타입** | `consumes` / `produces` (전역) | `content` (각 operation/response 내) |
| **스키마 정의** | `definitions:` | `components/schemas:` |
| **인증 정의** | `securityDefinitions:` | `components/securitySchemes:` |
| **Nullable 필드** | `x-nullable: true` 또는 별도 처리 | `nullable: true` |
| **링크 참조** | `$ref: "#/definitions/Model"` | `$ref: "#/components/schemas/Model"` |
| **OAuth2 flows** | `flow: application` | `flows: {clientCredentials: {...}}` |
| **Nano 지원** | ❌ **미지원** | ✅ 지원 |
| **DataPower 지원** | ✅ 지원 | ✅ 지원 |
| **webMethods 지원** | ✅ 지원 | ✅ 지원 |

### 주요 변경 예시

```yaml
# ── Swagger 2.0 (요청 본문) ─────────────────────────────────────
parameters:
  - in: body
    name: body
    schema:
      $ref: "#/definitions/BookInput"
responses:
  "201":
    description: 등록된 도서

# ── OpenAPI 3.0 (요청 본문) ─────────────────────────────────────
requestBody:
  required: true
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/BookInput"
responses:
  "201":
    description: 등록된 도서
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/Book"
```

```yaml
# ── Swagger 2.0 (서버 정의) ─────────────────────────────────────
host: gateway.example.com
basePath: /library/v1
schemes:
  - https

# ── OpenAPI 3.0 (서버 정의) ─────────────────────────────────────
servers:
  - url: https://gateway.example.com/library/v1
    description: DataPower API Gateway (운영)
  - url: https://gateway-dev.example.com/library/v1
    description: DataPower API Gateway (개발)
```

```yaml
# ── Swagger 2.0 (스키마 정의 위치) ──────────────────────────────
definitions:
  Book:
    type: object

# ── OpenAPI 3.0 (스키마 정의 위치) ──────────────────────────────
components:
  schemas:
    Book:
      type: object
```

---

## 배포 방법

### DataPower / webMethods — API Connect 관리 콘솔 (UI)

1. API Connect Manager UI 접속
2. **Develop** → **Add** → **Import API or Smart Document**
3. YAML 파일 업로드  
   - 파일 내 `---` 구분자 앞(Swagger 2.0) 또는 뒤(OAS 3.0) 부분 중 하나를 선택
4. **Edit API** → Assembly 탭에서 정책 흐름 확인
5. **Activate** → Catalog에 배포

### DataPower / webMethods — apic CLI

```bash
# CLI 로그인
apic login \
  --server management.example.com \
  --username admin \
  --password <password> \
  --realm admin/default-idp-1

# API 초안 생성
apic drafts:create datapower/api1-datapower.yaml \
  --server management.example.com \
  --organization my-org

# Catalog에 Publish
apic publish datapower/api1-datapower.yaml \
  --server management.example.com \
  --organization my-org \
  --catalog sandbox
```

### Nano Gateway — IBM API Studio

Nano Gateway는 IBM API Studio를 통해서만 배포할 수 있습니다.

```
1. IBM API Studio 실행
2. Settings → Gateways에서 Nano Gateway 연결 설정
3. 대상 YAML 파일 열기 (nano/ 폴더의 파일)
4. x-ibm-configuration.gateway: datapower-nano-gateway 확인
5. Deploy 버튼으로 Nano Gateway에 배포
```

---

## Catalog Properties 환경별 설정

DataPower / webMethods API Connect 관리 콘솔 → **Manage** → 카탈로그 → **Settings** → **Properties**

| API | Property | Dev | Staging | Prod |
|-----|----------|-----|---------|------|
| api1 | `target-url` | `http://library-api:3000` | `http://library-api.staging:3000` | `https://library-api.corp.com` |
| api2 | `target-url` | `http://salary-api:8001` | `http://salary-api.staging:8001` | `https://salary-api.corp.com` |
| api2 | `keycloak-introspect-url` | `http://keycloak:8080/...` | `http://keycloak.staging:8080/...` | `https://keycloak.corp.com/...` |
| api3 | `target-url` | `http://tours-api:3002` | `http://tours-api.staging:3002` | `https://tours-api.corp.com` |
| api4 | `target-url` | `http://graphql-api:4000` | `http://graphql-api.staging:4000` | `https://graphql-api.corp.com` |
| api5 | `target-url` | `http://odata-api:3003` | `http://odata-api.staging:3003` | `https://odata-api.corp.com` |

---

## 빠른 테스트

```bash
# api1 — 도서 목록 조회
curl https://gateway.example.com/my-org/sandbox/library/v1/books

# api2 — Keycloak 토큰 발급 후 연봉 조회
TOKEN=$(curl -sf \
  -X POST http://keycloak:8080/realms/corp/protocol/openid-connect/token \
  -d "grant_type=password&client_id=postman-client&username=alice&password=alice1234" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -H "Authorization: Bearer $TOKEN" \
  https://gateway.example.com/my-org/sandbox/salary/v2/salaries/me

# api3 — 크루즈 목록 조회
curl https://gateway.example.com/my-org/sandbox/tours/v1/cruises

# api4 — GraphQL 쿼리
curl -X POST https://gateway.example.com/my-org/sandbox/graphql/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products { id name price } }"}'

# api5 — OData 제품 목록 (필터 + 정렬)
curl "https://gateway.example.com/my-org/sandbox/odata/v1/Products?\$filter=categoryId%20eq%201&\$orderby=price%20asc"
```

---

## 참고 문서

| 문서 | URL |
|------|-----|
| IBM API Connect 공식 문서 | https://www.ibm.com/docs/en/api-connect |
| DataPower API Gateway 정책 | https://www.ibm.com/docs/en/api-connect/software/12.1.1?topic=cli-datapower-api-policies-logic-constructs |
| webMethods API Gateway 정책 | https://www.ibm.com/docs/en/apiconnect-ipaas/12.1.1_saas?topic=policies-webmethods-api-gateway |
| Nano Gateway 정책 | https://www.ibm.com/docs/en/api-connect/software/12.1.1?topic=gateway-datapower-nano-api-assembly-policies |
| Keycloak OIDC 공식 문서 | https://www.keycloak.org/docs/latest/server_admin/#sso-protocols |
| Keycloak Token Introspection | https://www.keycloak.org/docs/latest/authorization_services/#_token_introspection_endpoint |
| IBM APIC Third-Party OAuth Provider | https://www.ibm.com/docs/en/api-connect/software/12.1.1?topic=securing-third-party-oauth-providers |
| Swagger 2.0 스펙 | https://swagger.io/specification/v2/ |
| OpenAPI 3.0 스펙 | https://spec.openapis.org/oas/v3.0.3 |
