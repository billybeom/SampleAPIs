# Keycloak Admin Console 설정 가이드

IBM API Connect 12.1.1.2 + Keycloak 21.x 연동을 위한 단계별 설정 가이드입니다.

---

## 목차

1. [Realm 생성](#1-realm-생성)
2. [Client 생성 (APIC 전용)](#2-client-생성-apic-전용)
3. [Client Scope 설정](#3-client-scope-설정)
4. [역할(Role) 생성](#4-역할role-생성)
5. [사용자 생성 및 역할 할당](#5-사용자-생성-및-역할-할당)
6. [Service Account (M2M) 설정](#6-service-account-m2m-설정)
7. [Token 설정 (TTL, 클레임)](#7-token-설정-ttl-클레임)
8. [IBM API Connect 연동 확인](#8-ibm-api-connect-연동-확인)
9. [환경별 체크리스트](#9-환경별-체크리스트)
10. [트러블슈팅](#10-트러블슈팅)

---

## 1. Realm 생성

Keycloak Admin Console (`https://keycloak.example.com/admin`) 에 `admin` 계정으로 로그인합니다.

### 1-1. Realm 생성

| 환경       | Realm 이름    |
|------------|---------------|
| 개발       | `dev-corp`    |
| 스테이징   | `staging-corp`|
| 운영       | `corp`        |

**Admin Console 경로:**
1. 좌측 상단 Realm 드롭다운 → **Create Realm** 클릭
2. **Realm name**: `corp` (환경에 맞게 변경)
3. **Enabled**: ON
4. **Save** 클릭

### 1-2. Realm 설정

**Realm Settings → General:**
- Display name: `CORP Identity Provider`
- HTML Display name: `<b>CORP</b>`

**Realm Settings → Login:**
- User registration: OFF (관리자가 직접 생성)
- Forgot password: ON
- Remember me: OFF

**Realm Settings → Sessions:**
- SSO Session Idle: `30 Minutes`
- SSO Session Max: `10 Hours`
- Access Token Lifespan: `5 Minutes` (운영 기준; 개발은 30분 허용)

---

## 2. Client 생성 (APIC 전용)

IBM API Connect가 Keycloak과 통신할 전용 Client를 생성합니다.

### 2-1. Client 생성

**Admin Console 경로:** Clients → **Create client**

| 항목               | 값                            |
|--------------------|-------------------------------|
| Client type        | `OpenID Connect`              |
| Client ID          | `apic-prod` (환경별로 변경)   |
| Name               | `IBM API Connect`             |
| Always display in UI | OFF                         |

**Next** 클릭

### 2-2. Capability config

| 항목                   | 값               | 설명                              |
|------------------------|------------------|-----------------------------------|
| Client authentication  | **ON**           | Confidential Client (client_secret 필요) |
| Authorization          | OFF              | Keycloak 자체 authz 미사용        |
| Standard flow          | **ON**           | Authorization Code Flow           |
| Direct access grants   | OFF (운영) / ON (개발) | Resource Owner Password Grant |
| Service accounts roles | **ON**           | Client Credentials Grant (M2M)    |

**Next** 클릭

### 2-3. Login settings

| 항목                    | 값                                                      |
|-------------------------|---------------------------------------------------------|
| Root URL                | `https://mgmt.prod.example.com`                        |
| Valid redirect URIs     | `https://mgmt.prod.example.com/oauth2/redirect*`       |
|                         | `https://portal.prod.example.com/oauth2/redirect*`     |
| Valid post logout URIs  | `https://mgmt.prod.example.com/*`                      |
| Web origins             | `https://mgmt.prod.example.com`                        |
|                         | `https://portal.prod.example.com`                      |

> ⚠️ `+` (wildcard) 사용은 개발 환경에만 허용. 운영은 반드시 명시적 URL 지정.

**Save** 클릭

### 2-4. Client Secret 확인

1. Client 상세 페이지 → **Credentials** 탭
2. **Client secret** 값 복사
3. Kubernetes Secret 또는 Vault에 `KEYCLOAK_CLIENT_SECRET_PROD` 로 저장

```bash
# Kubernetes Secret 생성 예시
kubectl create secret generic keycloak-apic-secret \
  --from-literal=client-secret="<복사한_시크릿_값>" \
  --namespace apic-system
```

---

## 3. Client Scope 설정

API Connect에서 사용할 커스텀 스코프를 추가합니다.

### 3-1. Client Scope 생성

**Admin Console 경로:** Client scopes → **Create client scope**

| Scope 이름     | Type     | 설명                          |
|----------------|----------|-------------------------------|
| `salary:read`  | Optional | 연봉 조회 (api2-salary)       |
| `salary:write` | Optional | 연봉 수정 (api2-salary)       |
| `library:read` | Optional | 도서관 조회 (api1-library)    |
| `tours:read`   | Optional | 여행 패키지 조회 (api3-tours) |
| `tours:book`   | Optional | 여행 예약 (api3-tours)        |

각 Scope 생성 시:
- **Include in token scope**: ON
- **Display on consent screen**: ON

### 3-2. Client에 Scope 추가

1. Clients → `apic-prod` → **Client scopes** 탭
2. **Add client scope** 클릭
3. 위에서 생성한 스코프 모두 추가 (Type: Optional)

---

## 4. 역할(Role) 생성

### 4-1. Realm 역할 생성

**Admin Console 경로:** Realm roles → **Create role**

| 역할 이름   | 설명                                    | 사용 API              |
|-------------|------------------------------------------|----------------------|
| `employee`  | 연봉 조회 (본인만)                       | api2-salary          |
| `manager`   | 연봉 조회 (부서원), 연봉 수정            | api2-salary          |
| `hr_system` | 연봉 전체 관리 (조회/수정/삭제)          | api2-salary          |
| `librarian` | 도서 전체 관리                            | api1-library         |
| `member`    | 도서 대출/반납                            | api1-library         |
| `agent`     | 여행 패키지/예약 관리                    | api3-tours           |
| `customer`  | 여행 예약 (본인)                         | api3-tours           |

### 4-2. 역할 계층 설정 (Composite Role)

`hr_system`이 `manager` 역할을 포함하도록 설정:
1. Realm roles → `hr_system` → **Action** → Edit
2. **Associated roles** 탭 → `manager` 추가

`manager`가 `employee` 역할을 포함하도록 설정:
1. Realm roles → `manager` → **Associated roles** → `employee` 추가

---

## 5. 사용자 생성 및 역할 할당

### 5-1. 테스트 사용자 생성

**Admin Console 경로:** Users → **Create new user**

| Username    | Email                    | 역할        | 비고                    |
|-------------|--------------------------|-------------|-------------------------|
| `alice`     | alice@example.com        | `employee`  | 본인 연봉 조회만 가능   |
| `bob`       | bob@example.com          | `manager`   | 부서원 연봉 조회/수정   |
| `hr-admin`  | hr-admin@example.com     | `hr_system` | 전체 연봉 관리          |
| `librarian` | librarian@example.com    | `librarian` | 도서 전체 관리          |
| `agent`     | agent@example.com        | `agent`     | 여행 패키지 관리        |

### 5-2. 비밀번호 설정

1. Users → 사용자 선택 → **Credentials** 탭
2. **Set password** 클릭
3. **Temporary**: OFF (테스트용; 운영은 ON으로 초기 변경 강제)

### 5-3. 역할 할당

1. Users → 사용자 선택 → **Role mapping** 탭
2. **Assign role** → **Filter by realm roles** 선택
3. 해당 역할 체크 → **Assign**

---

## 6. Service Account (M2M) 설정

백엔드 서비스 간 통신(Client Credentials Grant)에 사용합니다.

### 6-1. Service Account 역할 부여

1. Clients → `apic-prod` → **Service accounts roles** 탭
2. **Assign role** → 서비스 계정에 필요한 역할 할당
   - 예: Salary API 백그라운드 작업 → `hr_system`

### 6-2. Client Credentials 토큰 테스트

```bash
# Client Credentials Grant 테스트
curl -X POST \
  https://keycloak.prod.example.com/realms/corp/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=apic-prod" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET_PROD}" \
  -d "scope=openid salary:read"
```

---

## 7. Token 설정 (TTL, 클레임)

### 7-1. Token Lifespan 설정

**Admin Console 경로:** Realm Settings → **Tokens** 탭

| 토큰 종류                 | 개발    | 스테이징 | 운영    |
|---------------------------|---------|----------|---------|
| Access Token Lifespan     | 30분    | 10분     | **5분** |
| Refresh Token Lifespan    | 30일    | 1일      | **1시간** |
| ID Token Lifespan         | 30분    | 10분     | **5분** |
| Client Session Idle       | 30분    | 30분     | **30분** |

> ⚠️ `introspect_cache_ttl`은 Access Token Lifespan보다 짧거나 같게 설정  
> (예: TTL 300초 = 5분 → Access Token도 5분)

### 7-2. 커스텀 클레임 추가 (Protocol Mapper)

IBM API Connect + DataPower가 사용하는 추가 클레임을 설정합니다.

**Admin Console 경로:** Clients → `apic-prod` → **Client scopes** → 기본 스코프 → **Mappers** 탭 → **Add mapper** → **By configuration**

#### preferred_username 매퍼 (이미 존재, 확인만)
- Mapper type: `User Property`
- Name: `username`
- Property: `username`
- Token Claim Name: `preferred_username`
- Claim JSON Type: `String`
- Add to ID token: ON
- Add to access token: ON

#### realm_access.roles 매퍼 (기본 포함, 확인)
Keycloak은 기본적으로 `realm_access.roles` 클레임을 포함합니다.  
**Client scopes → roles → Mappers → realm roles** 에서 확인하세요:
- Add to access token: **ON** ← 반드시 확인

#### email 매퍼 (기본 포함, 확인)
- **Client scopes → email → Mappers → email** → Add to access token: **ON**

---

## 8. IBM API Connect 연동 확인

### 8-1. OIDC Well-Known 엔드포인트 확인

```bash
# Keycloak OIDC 설정 조회
curl https://keycloak.prod.example.com/realms/corp/.well-known/openid-configuration | jq .
```

주요 확인 항목:
- `authorization_endpoint`
- `token_endpoint`
- `introspection_endpoint`
- `jwks_uri`
- `issuer` → `keycloak-oauth-policy.yaml`의 `iss-claim`과 일치해야 함

### 8-2. 토큰 인트로스펙션 테스트

```bash
# 1. 먼저 Access Token 발급
ACCESS_TOKEN=$(curl -s -X POST \
  https://keycloak.prod.example.com/realms/corp/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=apic-prod" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET_PROD}" \
  -d "username=alice" \
  -d "password=${TEST_PASSWORD}" \
  -d "scope=openid profile email salary:read" \
  | jq -r '.access_token')

# 2. 인트로스펙션으로 토큰 유효성 확인
curl -X POST \
  https://keycloak.prod.example.com/realms/corp/protocol/openid-connect/token/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=${ACCESS_TOKEN}" \
  -d "client_id=apic-prod" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET_PROD}" \
  | jq '{active, sub, preferred_username, realm_access, scope}'
```

### 8-3. API Manager에서 User Registry 등록

```bash
# apic CLI 로그인
apic login \
  --server mgmt.prod.example.com \
  --username admin \
  --password "${ADMIN_PASSWORD}" \
  --realm admin/default-idp-1

# OIDC User Registry 등록
apic user-registries:create \
  --server mgmt.prod.example.com \
  --org admin \
  --yaml apic/keycloak/keycloak-idp-prod.yaml

# Third-Party OAuth Provider 등록
apic oauth-providers:create \
  --server mgmt.prod.example.com \
  --org admin \
  --yaml apic/keycloak/keycloak-idp-prod.yaml

# 등록 확인
apic user-registries:list --server mgmt.prod.example.com --org admin
apic oauth-providers:list  --server mgmt.prod.example.com --org admin
```

### 8-4. DataPower Gateway 배포 YAML에 OAuth Provider 참조

각 API의 `x-ibm-configuration.security`에 등록된 OAuth Provider를 참조합니다:

```yaml
# API YAML 예시 (api2-salary-apic.yaml)
securityDefinitions:
  keycloak-oauth2:
    type: oauth2
    x-ibm-oauth-provider: keycloak-oauth-prod   # 등록한 Provider 이름
    flow: accessCode
    authorizationUrl: "https://auth.example.com/realms/corp/protocol/openid-connect/auth"
    tokenUrl: "https://auth.example.com/realms/corp/protocol/openid-connect/token"
    scopes:
      openid: "OpenID 기본 스코프"
      salary:read: "연봉 조회"
      salary:write: "연봉 수정"
```

---

## 9. 환경별 체크리스트

### 개발 환경 (dev)
- [ ] Realm `dev-corp` 생성
- [ ] Client `apic-dev` 생성 (Direct access grants: ON)
- [ ] 테스트 사용자 생성 (alice, bob, hr-admin 등)
- [ ] `KEYCLOAK_CLIENT_SECRET_DEV` Secret 설정
- [ ] `keycloak-idp-dev.yaml` API Manager 적용

### 스테이징 환경 (staging)
- [ ] Realm `staging-corp` 생성
- [ ] Client `apic-staging` 생성 (Direct access grants: OFF 권장)
- [ ] PKCE 강제 설정 확인
- [ ] TLS 인증서 유효성 확인
- [ ] `KEYCLOAK_CLIENT_SECRET_STAGING` Secret 설정
- [ ] `keycloak-idp-staging.yaml` API Manager 적용
- [ ] 인트로스펙션 캐시 TTL 60초 동작 확인

### 운영 환경 (prod)
- [ ] Realm `corp` 생성 및 HA 구성
- [ ] Client `apic-prod` 생성 (Confidential, PKCE 강제)
- [ ] Password grant 비활성화 확인
- [ ] 공인 CA 또는 사내 CA TLS 인증서 적용
- [ ] `KEYCLOAK_CLIENT_SECRET_PROD` Vault/Secret 저장
- [ ] `keycloak-idp-prod.yaml` API Manager 적용
- [ ] 인트로스펙션 캐시 TTL 300초 동작 확인
- [ ] Access Token TTL ≤ 5분 확인
- [ ] Keycloak 키 롤오버 주기 확인 (30일)
- [ ] JWKS URL DataPower 접근 가능 여부 확인

---

## 10. 트러블슈팅

### 증상: 401 Unauthorized — "JWT 클레임을 읽을 수 없습니다"

**원인**: `jwt-validate` 정책이 실행되지 않았거나 `decoded.jwt` context 변수가 비어 있음

**해결**:
1. API assembly에 `jwt-validate` 정책이 포함되어 있는지 확인
2. `jwk-url` 값이 Keycloak JWKS URI와 일치하는지 확인:
   ```
   https://keycloak.example.com/realms/corp/protocol/openid-connect/certs
   ```
3. `iss-claim` 값이 Keycloak issuer와 일치하는지 확인:
   ```bash
   curl https://keycloak.example.com/realms/corp/.well-known/openid-configuration | jq .issuer
   ```

### 증상: 403 Forbidden — "역할이 없습니다"

**원인**: Keycloak JWT에 `realm_access.roles` 클레임이 없거나 역할 미할당

**해결**:
1. 토큰 디코딩으로 역할 확인:
   ```bash
   echo "${ACCESS_TOKEN}" | cut -d. -f2 | base64 -d | jq '.realm_access.roles'
   ```
2. Keycloak Admin Console → Users → Role mapping 에서 역할 할당 확인
3. Client Scope의 **realm roles** 매퍼가 `Add to access token: ON` 인지 확인

### 증상: 인트로스펙션 오류 — DataPower가 Keycloak에 연결 실패

**원인**: TLS 인증서 문제 또는 네트워크 정책

**해결**:
1. DataPower에서 Keycloak URL 접근 가능 여부 확인
2. TLS Profile이 올바른 CA 인증서를 포함하는지 확인
3. 개발 환경에서 임시로 TLS 검증 비활성화:
   - API Manager → Resources → TLS Client Profiles → 해당 프로파일 → **Verify server certificate**: OFF

### 증상: 토큰 캐시로 인해 폐기된 토큰이 유효하게 처리됨

**원인**: `introspect_cache_ttl` 내에 토큰이 폐기되었으나 캐시된 결과 반환

**해결**:
- 개발 환경: `introspect_cache_type: no-cache` 설정
- 운영 환경: `introspect_cache_ttl` 값을 줄이되 성능과 균형 조정
- 즉시 반영이 필요한 경우: DataPower 캐시 수동 플러시

### 증상: "aud claim mismatch" 오류

**원인**: `jwt-validate`의 `aud-claim`이 토큰의 `aud` 클레임과 불일치

**해결**:
1. 토큰의 `aud` 확인:
   ```bash
   echo "${ACCESS_TOKEN}" | cut -d. -f2 | base64 -d | jq '.aud'
   ```
2. Keycloak Client → Settings → **Audiences** 탭에서 audience 확인
3. `keycloak-oauth-policy.yaml`의 `aud-claim` 값을 실제 `aud`와 맞춤
