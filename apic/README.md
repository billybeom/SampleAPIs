# IBM API Connect — Assembly 파일 가이드

이 디렉터리에는 두 샘플 API를 **IBM API Connect**에 등록할 때 사용하는 API 정의 YAML 파일이 있습니다.

## 파일 목록

| 파일 | API | 설명 |
|------|-----|------|
| `api1-library-apic.yaml` | Library Management API | 인증 없음, 직관적 CRUD |
| `api2-salary-apic.yaml` | Salary Management API | Keycloak OAuth2 + RBAC |

---

## IBM API Connect에 등록하는 방법

### 방법 1 — API Connect 관리 콘솔 (UI)

1. API Connect Manager UI 접속
2. **Develop** > **Add** > **Import API or Smart Document**
3. YAML 파일 업로드 (`api1-library-apic.yaml` 또는 `api2-salary-apic.yaml`)
4. **Next** > **Next** > **Edit API** 또는 바로 **Activate API**

### 방법 2 — apic CLI

```bash
# CLI 로그인
apic login \
  --server management.example.com \
  --username admin \
  --password <password> \
  --realm admin/default-idp-1

# API 초안 생성 (Draft)
apic drafts:create api1-library-apic.yaml \
  --server management.example.com \
  --organization my-org

apic drafts:create api2-salary-apic.yaml \
  --server management.example.com \
  --organization my-org

# Catalog에 Publish
apic publish api1-library-apic.yaml \
  --server management.example.com \
  --organization my-org \
  --catalog sandbox

apic publish api2-salary-apic.yaml \
  --server management.example.com \
  --organization my-org \
  --catalog sandbox
```

---

## API 1 — Library API Assembly 설명

```
[Client] → [API Connect] → [invoke] → [library-api:3000]
                ↑
         set-variable:
           X-API-Gateway: IBM-API-Connect
           X-Request-ID:  (전달)
```

**Assembly 정책:**
1. `set-variable` — 요청 식별 헤더 주입
2. `invoke` — `$(target-url)$(request.path)$(request.search)` 로 백엔드 호출

**Catalog Property:**
- `target-url`: 백엔드 URL (기본값: `http://library-api:3000`)
  - 카탈로그별로 dev/staging/prod 백엔드를 다르게 지정 가능

---

## API 2 — Salary API Assembly 설명

### 토큰 흐름 (Outbound Token 패턴)

```
[Client]
   │  ① Keycloak에서 Access Token 발급
   ▼
[API Connect]
   │  ② (선택) oauth 정책으로 토큰 검증 (Introspect)
   │  ③ set-variable: Authorization 헤더를 백엔드로 복사
   │  ④ invoke: salary-api:8001 호출
   ▼
[Salary API (salary-api:8001)]
   │  ⑤ Keycloak JWKS로 토큰 재검증 → RBAC 수행
```

### 방법 A: API Connect가 토큰 검증 (Introspect)

API Connect 관리 콘솔에서 **OAuth Provider** 등록 필요:

| 항목 | 값 |
|------|----|
| Provider Type | Third Party |
| Token URL | `http://keycloak:8080/realms/corp/protocol/openid-connect/token` |
| Introspect URL | `http://keycloak:8080/realms/corp/protocol/openid-connect/token/introspect` |
| JWKS URL | `http://keycloak:8080/realms/corp/protocol/openid-connect/certs` |
| Client ID | `salary-api` |
| Client Secret | `salary-api-secret` |

Assembly YAML에서 `oauth` 정책 주석 해제:
```yaml
- oauth:
    version: 2.0.0
    title: Validate Keycloak Token
    provider: keycloak-corp
    output: decoded-token
```

### 방법 B: 백엔드(Salary API)가 토큰 직접 검증 (JWKS)

API Connect는 토큰을 그대로 전달하고, Salary API가 Keycloak JWKS로 재검증합니다.  
이 샘플의 기본 설정 (별도 API Connect 설정 불필요).

---

## Catalog Properties 설정 방법

### API Connect 관리 콘솔

1. **Manage** > 카탈로그 선택 > **Settings** > **Properties**
2. 다음 속성 추가/수정:

| Property | Dev | Staging | Prod |
|----------|-----|---------|------|
| `target-url` (API 1) | `http://library-api:3000` | `http://library-api.staging:3000` | `https://library-api.corp.com` |
| `target-url` (API 2) | `http://salary-api:8001` | `http://salary-api.staging:8001` | `https://salary-api.corp.com` |
| `keycloak-introspect-url` | `http://keycloak:8080/...` | `http://keycloak.staging:8080/...` | `https://keycloak.corp.com/...` |

### apic CLI

```bash
apic catalog-settings:update \
  --server management.example.com \
  --organization my-org \
  --catalog sandbox \
  properties:
    target-url: "http://salary-api:8001"
```

---

## 빠른 테스트 (apic CLI)

```bash
# API 1 — 도서 목록 조회
curl https://gateway.example.com/my-org/sandbox/library/v1/books

# API 2 — 토큰 발급 후 연봉 조회
TOKEN=$(curl -sf \
  -X POST http://keycloak:8080/realms/corp/protocol/openid-connect/token \
  -d "grant_type=password&client_id=postman-client&username=alice&password=alice1234" \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" \
  https://gateway.example.com/my-org/sandbox/salary/v2/salaries/me
```

---

## 참고

- [IBM API Connect — API Assembly 정책 참고](https://www.ibm.com/docs/en/api-connect)
- [set-variable 정책](https://www.ibm.com/docs/en/api-connect/10.0.x?topic=policies-set-variable)
- [invoke 정책](https://www.ibm.com/docs/en/api-connect/10.0.x?topic=policies-invoke)
- [oauth 정책 (Third-Party)](https://www.ibm.com/docs/en/api-connect/10.0.x?topic=policies-oauth)
