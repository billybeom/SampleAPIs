# IBM API Connect — webMethods API Gateway 배포 가이드

이 폴더에는 `api1` ~ `api5` 를 **IBM webMethods API Gateway**에 등록·배포하는 YAML 파일이 있습니다.

## 파일 목록

| 파일 | 백엔드 | 포트 | 인증 | basePath |
|------|--------|------|------|----------|
| `api1-webmethods.yaml` | Library Management API | 3000 | 없음 | `/library/v1` |
| `api2-webmethods.yaml` | Salary Management API  | 8001 | Keycloak OAuth2 | `/salary/v2` |
| `api3-webmethods.yaml` | Tours Management API   | 3002 | 없음 | `/tours/v1` |
| `api4-webmethods.yaml` | GraphQL Product API    | 4000 | 없음 | `/graphql/v1` |
| `api5-webmethods.yaml` | OData Product Catalog  | 3003 | 없음 | `/odata/v1` |

---

## webMethods API Gateway 핵심 정책

| 카테고리 | 정책 | DataPower 대응 정책 | 설명 |
|----------|------|---------------------|------|
| 트래픽 제어 | `rate-limiter` | `rate-limit` | count/interval/burst 직접 지정 |
| 인증/인가 | `identify-and-authorize` | `oauth` | OAuth2/JWT 검증 + 클레임 추출 |
| 인증 | `set-authorization` | `set-variable` | Outbound 인증 헤더 설정 |
| 요청 변환 | `request-transformation` | `set-variable` | 헤더 추가/수정 |
| 응답 변환 | `response-transformation` | `set-variable` | 에러 응답 구성 |
| 라우팅 | `invoke` | `invoke` | 백엔드 서비스 호출 |
| 조건 라우팅 | `content-based-routing` | `switch` | 조건별 백엔드 분기 |
| 검증 | `validate-api-specification` | `parse` | 스키마 기반 요청 검증 |
| 캐싱 | `service-result-cache` | (없음) | 응답 캐싱 |
| 모니터링 | `monitor-traffic` | (없음) | 요청 크기/속도 모니터링 |
| 로깅 | `log` | (별도 정책 없음) | 요청/응답 로깅 |
| 에러 처리 | `conditional-error-processing` | `catch` | 조건별 에러 처리 |

---

## 등록 방법

### 방법 1 — IBM API Studio (권장)
1. IBM API Studio 실행
2. **Gateway** 탭에서 webMethods API Gateway 연결 설정
3. 대상 API YAML 파일 열기
4. **Deploy** 버튼 클릭 → webMethods Gateway에 즉시 배포

### 방법 2 — webMethods API Gateway 관리 콘솔 (UI)
1. webMethods API Gateway 관리 콘솔 접속
2. **API** → **Import API** → YAML 파일 업로드
3. 정책 검토 후 **Activate**

---

## DataPower와의 주요 차이점

| 항목 | DataPower | webMethods |
|------|-----------|-----------|
| 변수 참조 | `$(variable)` | `$(variable)` (동일) |
| 백엔드 URL | `$(target-url)$(request.path)` | `http://backend:port$(request.path)` |
| 스크립팅 | GatewayScript (`gatewayscript`) | 지원 없음 (외부 엔드포인트 활용) |
| Rate Limit | `source: plan` | `count: N, interval: N` 직접 지정 |
| 인증 | `oauth` + `set-variable` | `identify-and-authorize` 단일 정책 |
| 에러 처리 | `catch` 블록 | `conditional-error-processing` |
| 캐싱 | (별도 정책) | `service-result-cache` |
| 로깅 | Activity Log (설계에서 설정) | `log` 정책 |
