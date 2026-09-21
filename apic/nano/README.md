# IBM API Connect — DataPower Nano Gateway 배포 가이드

이 폴더에는 `api1` ~ `api5` 를 **IBM API Connect DataPower Nano Gateway**에 등록·배포하는 YAML 파일이 있습니다.

## ⚠️ 중요: Nano Gateway는 OpenAPI 3.0만 지원

Nano Gateway는 Swagger 2.0(OpenAPI 2.0) 명세를 지원하지 않습니다.  
이 폴더의 모든 파일은 **OpenAPI 3.0 명세만** 포함합니다.  
Swagger 2.0 명세가 필요하다면 `../datapower/` 또는 `../webmethods/` 폴더를 참조하세요.

---

## 파일 목록

| 파일 | 백엔드 | 포트 | 인증 | basePath |
|------|--------|------|------|----------|
| `api1-nano.yaml` | Library Management API | 3000 | 없음 | `/library/v1` |
| `api2-nano.yaml` | Salary Management API  | 8001 | Keycloak JWT (JWKS) | `/salary/v2` |
| `api3-nano.yaml` | Tours Management API   | 3002 | 없음 | `/tours/v1` |
| `api4-nano.yaml` | GraphQL Product API    | 4000 | 없음 | `/graphql/v1` |
| `api5-nano.yaml` | OData Product Catalog  | 3003 | 없음 | `/odata/v1` |

---

## Nano Gateway 핵심 정책

| 정책 (PascalCase) | DataPower 대응 | webMethods 대응 | 설명 |
|-------------------|----------------|-----------------|------|
| `RateLimit` | `rate-limit` | `rate-limiter` | count/interval/unit 지정 |
| `Cors` | cors 설정 섹션 | cors 설정 섹션 | **정책으로 추가** (Nano 특징) |
| `Set` | `set-variable` | `set-context-variable` + `request-transformation` | 헤더/변수 설정 |
| `Invoke` | `invoke` | `invoke` | 백엔드 호출 |
| `Parse` | `parse` | `validate-api-specification` | 페이로드 파싱 |
| `ExtractIdentity` | (oauth 내 포함) | (identify-and-authorize 내 포함) | 토큰 추출 |
| `Authenticate` | `oauth` | `identify-and-authorize` | 인증 |
| `Authorize` | (백엔드 처리) | `authorize-user` | 인가 |
| `LuaScript` | `gatewayscript` | 미지원 | 커스텀 스크립팅 |
| `If` | `if` | (없음) | 조건 분기 (JSONata) |
| `CircuitBreaker` | 미지원 | 미지원 | 장애 격리 **(Nano 전용)** |
| `Transform` | `map` | `request-transformation` | 메시지 변환 |

---

## Nano Gateway 주요 특징

1. **PascalCase 정책 이름**: `RateLimit`, `Set`, `Invoke` 등 (DataPower는 소문자 kebab-case)
2. **JSONata 표현식**: `$request.path`, `$jwt-claims.sub` 등 (`$(variable)` 아님)
3. **Cors가 정책**: DataPower/webMethods는 설정 섹션, Nano는 assembly 정책으로 추가
4. **인증 3단계 분리**: `ExtractIdentity` → `Authenticate` → `Authorize`
5. **CircuitBreaker 내장**: 백엔드 장애 자동 감지 및 fallback
6. **LuaScript**: GatewayScript(DataPower) 대신 Lua 사용

---

## 등록 방법

### IBM API Studio (권장)
1. IBM API Studio 실행 (Nano Gateway 연결 필요)
2. YAML 파일 열기 → **gateway: datapower-nano-gateway** 확인
3. **Deploy** 버튼으로 Nano Gateway에 배포

### 주의사항
- Nano Gateway와 DataPower API Gateway는 API를 서로 공유할 수 없습니다.
- 기존 DataPower API를 Nano로 마이그레이션하려면 전체 재작성이 필요합니다.
- `x-ibm-configuration.gateway: datapower-nano-gateway` 필드가 반드시 있어야 합니다.
