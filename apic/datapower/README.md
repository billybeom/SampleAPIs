# IBM API Connect — DataPower API Gateway 배포 가이드

이 폴더에는 `api1` ~ `api5` 를 **IBM API Connect DataPower API Gateway**에 등록·배포하는 YAML 파일이 있습니다.

## 파일 목록

| 파일 | 백엔드 | 포트 | 인증 | basePath |
|------|--------|------|------|----------|
| `api1-datapower.yaml` | Library Management API | 3000 | 없음 | `/library/v1` |
| `api2-datapower.yaml` | Salary Management API  | 8001 | Keycloak OAuth2 | `/salary/v2` |
| `api3-datapower.yaml` | Tours Management API   | 3002 | 없음 | `/tours/v1` |
| `api4-datapower.yaml` | GraphQL Product API    | 4000 | 없음 | `/graphql/v1` |
| `api5-datapower.yaml` | OData Product Catalog  | 3003 | 없음 | `/odata/v1` |

각 파일은 **Swagger 2.0 명세**와 **OpenAPI 3.0 명세**를 함께 포함하여 두 버전을 비교할 수 있습니다.

---

## DataPower API Gateway 핵심 Assembly 정책

| 정책 | 키워드 | 역할 |
|------|--------|------|
| `rate-limit` | `source: plan` | Plan 기반 호출 횟수 제한 |
| `parse` | `apic-default-parsesettings` | 페이로드 파싱 + 위협 탐지 |
| `set-variable` | `message.headers.*` | 헤더/변수 주입 |
| `gatewayscript` | `apim.getvariable()` | JavaScript 커스텀 로직 |
| `invoke` | `target-url: $(target-url)` | 백엔드 서비스 호출 |
| `oauth` | `provider: keycloak-corp` | Third-Party OAuth 검증 |
| `graphql-cost-analysis` | `max-cost: 1000` | GraphQL 복잡도 제한 |

---

## 등록 방법

### 방법 1 — API Connect 관리 콘솔 (UI)
1. **Develop** → **Add** → **Import API or Smart Document**
2. YAML 파일 업로드 (Swagger 2.0 또는 OpenAPI 3.0 섹션 중 하나 선택)
3. **Edit API** → Assembly 탭에서 정책 확인
4. **Activate** → Catalog에 배포

### 방법 2 — apic CLI
```bash
# Swagger 2.0 명세로 등록 (파일 내 --- 구분자 앞 부분 추출 후 사용)
apic drafts:create api1-datapower.yaml \
  --server management.example.com \
  --organization my-org

apic publish api1-datapower.yaml \
  --server management.example.com \
  --organization my-org \
  --catalog sandbox
```

---

## Catalog Properties 설정

| API | Property | 기본값 |
|-----|----------|--------|
| api1 | `target-url` | `http://library-api:3000` |
| api2 | `target-url` | `http://salary-api:8001` |
| api2 | `keycloak-introspect-url` | `http://keycloak:8080/realms/corp/...` |
| api3 | `target-url` | `http://tours-api:3002` |
| api4 | `target-url` | `http://graphql-api:4000` |
| api5 | `target-url` | `http://odata-api:3003` |

> API Connect 관리 콘솔 → **Manage** → 카탈로그 → **Settings** → **Properties** 에서 환경별로 재정의하세요.
