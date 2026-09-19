# 💰 Salary Management API — 상세 사용 예시

> 서버가 `http://localhost:8000` 에서 실행 중이고,  
> Keycloak이 `http://localhost:8080` 에서 운영 중인 것을 전제합니다.

---

## 목차

1. [Keycloak 토큰 발급](#1-keycloak-토큰-발급)
2. [인증 정보 확인 — /auth/me](#2-인증-정보-확인--authme)
3. [Keycloak 연결 상태 확인](#3-keycloak-연결-상태-확인)
4. [본인 연봉 조회 — /salaries/me](#4-본인-연봉-조회--salariesme)
5. [연봉 목록 조회 — 역할별 범위 차이](#5-연봉-목록-조회--역할별-범위-차이)
6. [특정 연봉 레코드 조회](#6-특정-연봉-레코드-조회)
7. [연봉 수정 — 역할별 권한 차이](#7-연봉-수정--역할별-권한-차이)
8. [연봉 레코드 삭제 — 퇴사 처리](#8-연봉-레코드-삭제--퇴사-처리)
9. [권한 없음 — 403 케이스 모음](#9-권한-없음--403-케이스-모음)
10. [인증 실패 — 401 케이스 모음](#10-인증-실패--401-케이스-모음)
11. [JWKS 캐시 관리](#11-jwks-캐시-관리)
12. [연속 시나리오 — 신입 입사부터 퇴사 처리까지](#12-연속-시나리오--신입-입사부터-퇴사-처리까지)
13. [Python requests 예시](#13-python-requests-예시)
14. [JavaScript fetch 예시](#14-javascript-fetch-예시)

---

## 공통 설정

```bash
# 서버 URL 변수 설정
SALARY_API=http://localhost:8000
KEYCLOAK=http://localhost:8080
REALM=corp
CLIENT_ID=salary-api
CLIENT_SECRET=<your-client-secret>   # Keycloak에서 발급받은 값
```

---

## 1. Keycloak 토큰 발급

### 1-1. alice (사원, engineering 팀) 토큰 발급

```bash
TOKEN_ALICE=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "username=alice" \
  -d "password=alice123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Alice 토큰 앞 50자: ${TOKEN_ALICE:0:50}..."
```

### 1-2. bob (사원, engineering 팀) 토큰 발급

```bash
TOKEN_BOB=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&username=bob&password=bob123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 1-3. carol (사원, marketing 팀) 토큰 발급

```bash
TOKEN_CAROL=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&username=carol&password=carol123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 1-4. dave (팀장, engineering 팀) 토큰 발급

```bash
TOKEN_DAVE=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&username=dave&password=dave123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 1-5. eve (팀장, marketing 팀) 토큰 발급

```bash
TOKEN_EVE=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&username=eve&password=eve123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 1-6. hr_system (인사 시스템) 토큰 발급

```bash
TOKEN_HR=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -d "grant_type=password&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&username=hr_system&password=hrsecret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 1-7. Client Credentials Grant (서비스 계정 방식)

시스템 간 통신 시 사용자 없이 서비스 계정으로 토큰 발급:

```bash
# Keycloak에서 hr-service 서비스 계정에 hr_system 역할 할당 필요
TOKEN_SVC=$(curl -s -X POST \
  "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=hr-service" \
  -d "client_secret=${CLIENT_SECRET}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

---

## 2. 인증 정보 확인 — /auth/me

토큰이 올바르게 설정되었는지, Salary API가 어떻게 역할을 해석하는지 확인합니다.

### 2-1. alice (employee) 토큰 확인

```bash
curl -s ${SALARY_API}/auth/me \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "id": "sub-alice-0001",
  "username": "alice",
  "email": "alice@corp.com",
  "full_name": "Alice Kim",
  "role": "employee",
  "team": "engineering"
}
```

### 2-2. dave (manager, engineering) 토큰 확인

```bash
curl -s ${SALARY_API}/auth/me \
  -H "Authorization: Bearer ${TOKEN_DAVE}"
```

```json
{
  "id": "sub-dave-0004",
  "username": "dave",
  "email": "dave@corp.com",
  "full_name": "Dave Choi",
  "role": "manager",
  "team": "engineering"
}
```

### 2-3. hr_system 토큰 확인

```bash
curl -s ${SALARY_API}/auth/me \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "id": "sub-hr-0006",
  "username": "hr_system",
  "email": "hr@corp.com",
  "full_name": "HR System",
  "role": "hr_system",
  "team": null
}
```

### 2-4. Keycloak 연동 설정 확인

```bash
curl -s ${SALARY_API}/auth/config
```

```json
{
  "keycloak_issuer": "http://localhost:8080/realms/corp",
  "keycloak_jwks_url": "http://localhost:8080/realms/corp/protocol/openid-connect/certs",
  "keycloak_audience": "salary-api",
  "token_header_name": "Authorization"
}
```

---

## 3. Keycloak 연결 상태 확인

### 3-1. JWKS 연결 확인

```bash
curl -s ${SALARY_API}/auth/jwks-status
```

```json
{
  "status": "ok",
  "jwks_url": "http://localhost:8080/realms/corp/protocol/openid-connect/certs",
  "key_count": 2,
  "key_ids": ["abc123def", "xyz789uvw"]
}
```

### 3-2. Keycloak 미접속 시 상태

```bash
# Keycloak이 중단된 경우
curl -s ${SALARY_API}/auth/jwks-status
```

```json
{
  "status": "error",
  "jwks_url": "http://localhost:8080/realms/corp/protocol/openid-connect/certs",
  "detail": "Unable to reach Keycloak JWKS endpoint. ..."
}
```

### 3-3. 키 롤오버 후 JWKS 캐시 강제 갱신

```bash
curl -s -X POST ${SALARY_API}/auth/jwks-refresh
```

```json
{
  "status": "refreshed",
  "key_count": 2,
  "key_ids": ["new456key", "xyz789uvw"]
}
```

---

## 4. 본인 연봉 조회 — /salaries/me

역할에 관계없이 **본인 연봉**을 조회하는 가장 기본적인 엔드포인트입니다.

### 4-1. alice (사원) — 본인 연봉

```bash
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "id": "s001",
  "employee_id": "sub-alice-0001",
  "employee_name": "Alice Kim",
  "team": "engineering",
  "base_salary": 72000000,
  "bonus": 5000000,
  "currency": "KRW",
  "effective_date": "2024-01-01",
  "status": "active"
}
```

> 총 연봉: 72,000,000 + 5,000,000 = **77,000,000원**

### 4-2. dave (팀장) — 본인 연봉

```bash
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_DAVE}"
```

```json
{
  "id": "s004",
  "employee_id": "sub-dave-0004",
  "employee_name": "Dave Choi",
  "team": "engineering",
  "base_salary": 95000000,
  "bonus": 10000000,
  "currency": "KRW",
  "effective_date": "2024-01-01",
  "status": "active"
}
```

### 4-3. hr_system — 본인 연봉 조회 (레코드 없음)

```bash
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "detail": "No salary record found for this user"
}
```

**HTTP Status: `404 Not Found`** (hr_system은 사원이 아니므로 레코드 없음)

---

## 5. 연봉 목록 조회 — 역할별 범위 차이

`GET /salaries` 는 **같은 엔드포인트**이지만 역할에 따라 반환 범위가 달라집니다.

### 5-1. alice (employee) — 본인 것만 반환

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "total": 1,
  "data": [
    {
      "id": "s001",
      "employee_name": "Alice Kim",
      "team": "engineering",
      "base_salary": 72000000,
      "bonus": 5000000,
      "currency": "KRW",
      "effective_date": "2024-01-01",
      "status": "active"
    }
  ]
}
```

### 5-2. bob (employee) — 본인 것만 반환

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_BOB}"
```

```json
{
  "total": 1,
  "data": [
    {
      "id": "s002",
      "employee_name": "Bob Lee",
      "team": "engineering",
      "base_salary": 68000000,
      "bonus": 4000000,
      "currency": "KRW",
      "effective_date": "2024-01-01",
      "status": "active"
    }
  ]
}
```

### 5-3. dave (manager, engineering) — engineering 팀 전체 반환

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_DAVE}"
```

```json
{
  "total": 3,
  "data": [
    {
      "id": "s001",
      "employee_name": "Alice Kim",
      "team": "engineering",
      "base_salary": 72000000,
      "bonus": 5000000
    },
    {
      "id": "s002",
      "employee_name": "Bob Lee",
      "team": "engineering",
      "base_salary": 68000000,
      "bonus": 4000000
    },
    {
      "id": "s004",
      "employee_name": "Dave Choi",
      "team": "engineering",
      "base_salary": 95000000,
      "bonus": 10000000
    }
  ]
}
```

> Dave(팀장)는 engineering 팀 3명의 연봉 전체를 볼 수 있습니다.  
> carol(marketing)은 다른 팀이므로 포함되지 않습니다.

### 5-4. eve (manager, marketing) — marketing 팀 전체 반환

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_EVE}"
```

```json
{
  "total": 2,
  "data": [
    {
      "id": "s003",
      "employee_name": "Carol Park",
      "team": "marketing",
      "base_salary": 65000000,
      "bonus": 3500000
    },
    {
      "id": "s005",
      "employee_name": "Eve Jung",
      "team": "marketing",
      "base_salary": 90000000,
      "bonus": 9000000
    }
  ]
}
```

### 5-5. hr_system — 전체 5명 모두 반환

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "total": 5,
  "data": [
    { "id": "s001", "employee_name": "Alice Kim",  "team": "engineering", "base_salary": 72000000 },
    { "id": "s002", "employee_name": "Bob Lee",    "team": "engineering", "base_salary": 68000000 },
    { "id": "s003", "employee_name": "Carol Park", "team": "marketing",   "base_salary": 65000000 },
    { "id": "s004", "employee_name": "Dave Choi",  "team": "engineering", "base_salary": 95000000 },
    { "id": "s005", "employee_name": "Eve Jung",   "team": "marketing",   "base_salary": 90000000 }
  ]
}
```

---

## 6. 특정 연봉 레코드 조회

### 6-1. alice가 본인 레코드 조회 (s001) — 성공

```bash
curl -s ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "id": "s001",
  "employee_id": "sub-alice-0001",
  "employee_name": "Alice Kim",
  "team": "engineering",
  "base_salary": 72000000,
  "bonus": 5000000,
  "currency": "KRW",
  "effective_date": "2024-01-01",
  "status": "active"
}
```

### 6-2. dave(팀장)가 팀원 alice 레코드 조회 — 성공

```bash
curl -s ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_DAVE}"
```

```json
{
  "id": "s001",
  "employee_name": "Alice Kim",
  "team": "engineering",
  "base_salary": 72000000,
  "bonus": 5000000,
  "currency": "KRW",
  "effective_date": "2024-01-01",
  "status": "active"
}
```

### 6-3. hr_system이 임의 레코드 조회 — 성공

```bash
curl -s ${SALARY_API}/salaries/s003 \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "id": "s003",
  "employee_name": "Carol Park",
  "team": "marketing",
  "base_salary": 65000000,
  "bonus": 3500000,
  "currency": "KRW",
  "effective_date": "2024-01-01",
  "status": "active"
}
```

---

## 7. 연봉 수정 — 역할별 권한 차이

### 7-1. alice(사원)가 본인 연봉 수정

```bash
curl -s -X PATCH ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_ALICE}" \
  -H "Content-Type: application/json" \
  -d '{
    "base_salary": 74000000,
    "effective_date": "2024-07-01"
  }'
```

```json
{
  "message": "Salary record updated successfully",
  "updated_by": "alice",
  "updated_by_role": "employee",
  "record": {
    "id": "s001",
    "employee_name": "Alice Kim",
    "team": "engineering",
    "base_salary": 74000000,
    "bonus": 5000000,
    "currency": "KRW",
    "effective_date": "2024-07-01",
    "status": "active"
  }
}
```

### 7-2. dave(팀장)가 팀원 alice 연봉 수정 (연봉 인상)

```bash
curl -s -X PATCH ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_DAVE}" \
  -H "Content-Type: application/json" \
  -d '{
    "base_salary": 78000000,
    "bonus": 7000000,
    "effective_date": "2025-01-01"
  }'
```

```json
{
  "message": "Salary record updated successfully",
  "updated_by": "dave",
  "updated_by_role": "manager",
  "record": {
    "id": "s001",
    "employee_name": "Alice Kim",
    "base_salary": 78000000,
    "bonus": 7000000,
    "effective_date": "2025-01-01",
    "status": "active"
  }
}
```

### 7-3. dave(팀장)가 팀원 bob 보너스 수정

```bash
curl -s -X PATCH ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_DAVE}" \
  -H "Content-Type: application/json" \
  -d '{ "bonus": 6000000 }'
```

```json
{
  "message": "Salary record updated successfully",
  "updated_by": "dave",
  "updated_by_role": "manager",
  "record": {
    "id": "s002",
    "employee_name": "Bob Lee",
    "base_salary": 68000000,
    "bonus": 6000000,
    "effective_date": "2024-01-01",
    "status": "active"
  }
}
```

### 7-4. hr_system이 전 팀 연봉 일괄 수정

```bash
# alice 연봉 수정
curl -s -X PATCH ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_HR}" \
  -H "Content-Type: application/json" \
  -d '{"base_salary": 80000000, "effective_date": "2025-01-01"}'

# carol 연봉 수정 (다른 팀이지만 hr_system은 가능)
curl -s -X PATCH ${SALARY_API}/salaries/s003 \
  -H "Authorization: Bearer ${TOKEN_HR}" \
  -H "Content-Type: application/json" \
  -d '{"base_salary": 68000000, "bonus": 4500000, "effective_date": "2025-01-01"}'
```

---

## 8. 연봉 레코드 삭제 — 퇴사 처리

`DELETE /salaries/:id` 는 **hr_system 역할만** 호출할 수 있습니다.  
일반적인 사용 사례: 퇴사 처리 워크플로우에서 HR 시스템이 자동 호출합니다.

### 8-1. hr_system이 alice 레코드 삭제 (퇴사 처리)

```bash
curl -s -X DELETE ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "message": "Salary record deleted successfully (employee offboarded)",
  "deleted_by": "hr_system",
  "deleted_record": {
    "id": "s001",
    "employee_id": "sub-alice-0001",
    "employee_name": "Alice Kim",
    "team": "engineering",
    "base_salary": 78000000,
    "bonus": 7000000,
    "currency": "KRW",
    "effective_date": "2025-01-01",
    "status": "active"
  }
}
```

### 8-2. 삭제 후 목록 확인 (4명으로 감소)

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "total": 4,
  "data": [
    { "id": "s002", "employee_name": "Bob Lee" },
    { "id": "s003", "employee_name": "Carol Park" },
    { "id": "s004", "employee_name": "Dave Choi" },
    { "id": "s005", "employee_name": "Eve Jung" }
  ]
}
```

### 8-3. 삭제 후 이미 없는 레코드 재삭제 → 404

```bash
curl -s -X DELETE ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

```json
{
  "detail": "Salary record not found"
}
```

**HTTP Status: `404 Not Found`**

---

## 9. 권한 없음 — 403 케이스 모음

### 9-1. alice(사원)가 타인 레코드 조회 시도

```bash
# alice가 bob의 연봉 조회 시도
curl -s ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "detail": "You do not have permission to view this salary record."
}
```

**HTTP Status: `403 Forbidden`**

### 9-2. dave(engineering 팀장)가 타 팀 carol 레코드 조회 시도

```bash
# dave는 marketing 팀에 접근 불가
curl -s ${SALARY_API}/salaries/s003 \
  -H "Authorization: Bearer ${TOKEN_DAVE}"
```

```json
{
  "detail": "You do not have permission to view this salary record."
}
```

**HTTP Status: `403 Forbidden`**

> dave는 engineering 팀 전체를 볼 수 있지만, marketing 팀(carol, eve)은 접근 불가합니다.

### 9-3. alice(사원)가 타인 연봉 수정 시도

```bash
curl -s -X PATCH ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_ALICE}" \
  -H "Content-Type: application/json" \
  -d '{"base_salary": 999999999}'
```

```json
{
  "detail": "You do not have permission to update this salary record."
}
```

**HTTP Status: `403 Forbidden`**

### 9-4. dave(팀장)가 타 팀 연봉 수정 시도

```bash
curl -s -X PATCH ${SALARY_API}/salaries/s003 \
  -H "Authorization: Bearer ${TOKEN_DAVE}" \
  -H "Content-Type: application/json" \
  -d '{"base_salary": 50000000}'
```

```json
{
  "detail": "You do not have permission to update this salary record."
}
```

**HTTP Status: `403 Forbidden`**

### 9-5. alice(사원)가 삭제 시도

```bash
curl -s -X DELETE ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "detail": "Only the HR system role may delete salary records."
}
```

**HTTP Status: `403 Forbidden`**

### 9-6. dave(팀장)가 삭제 시도

```bash
curl -s -X DELETE ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_DAVE}"
```

```json
{
  "detail": "Only the HR system role may delete salary records."
}
```

**HTTP Status: `403 Forbidden`**

### 9-7. 역할 없는 토큰으로 접근

Keycloak에서 아무 역할도 부여받지 않은 사용자의 토큰:

```bash
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_NO_ROLE}"
```

```json
{
  "detail": "No valid role found in token. Expected one of: employee, manager, hr_system. Found roles: ['default-roles-corp']"
}
```

**HTTP Status: `403 Forbidden`**

---

## 10. 인증 실패 — 401 케이스 모음

### 10-1. 토큰 없이 요청

```bash
curl -s ${SALARY_API}/salaries/me
```

```json
{
  "detail": "Missing token. Expected header: 'Authorization: Bearer <token>'"
}
```

**HTTP Status: `401 Unauthorized`**

### 10-2. 만료된 토큰으로 요청

```bash
# 만료된 토큰 사용 (exp 초과)
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.EXPIRED..."
```

```json
{
  "detail": "Token validation failed: Signature has expired."
}
```

**HTTP Status: `401 Unauthorized`**

### 10-3. 잘못된 형식의 토큰

```bash
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer not-a-valid-jwt"
```

```json
{
  "detail": "Token validation failed: Not enough segments"
}
```

**HTTP Status: `401 Unauthorized`**

### 10-4. 다른 Realm의 토큰 사용 (issuer 불일치)

```bash
# 다른 Keycloak Realm(예: test-realm)에서 발급된 토큰
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_FROM_OTHER_REALM}"
```

```json
{
  "detail": "Token validation failed: Invalid issuer"
}
```

**HTTP Status: `401 Unauthorized`**

### 10-5. Audience 불일치 토큰

```bash
# aud 클레임이 'salary-api'가 아닌 다른 값
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_WRONG_AUDIENCE}"
```

```json
{
  "detail": "Token validation failed: Audience validation failed"
}
```

**HTTP Status: `401 Unauthorized`**

### 10-6. Keycloak 미접속 상태에서 첫 요청 → 503

```bash
# Keycloak이 중단된 경우 JWKS를 가져올 수 없음
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_ALICE}"
```

```json
{
  "detail": "Unable to reach Keycloak JWKS endpoint. Check KEYCLOAK_URL and KEYCLOAK_REALM."
}
```

**HTTP Status: `503 Service Unavailable`**

---

## 11. JWKS 캐시 관리

### 11-1. 현재 캐시된 공개키 목록 확인

```bash
curl -s ${SALARY_API}/auth/jwks-status
```

```json
{
  "status": "ok",
  "jwks_url": "http://localhost:8080/realms/corp/protocol/openid-connect/certs",
  "key_count": 2,
  "key_ids": ["abc123keyid", "def456keyid"]
}
```

### 11-2. 키 롤오버 후 수동 갱신

Keycloak에서 키를 롤오버(새 키 생성 후 이전 키 폐기)한 경우:

```bash
# 강제 캐시 갱신
curl -s -X POST ${SALARY_API}/auth/jwks-refresh
```

```json
{
  "status": "refreshed",
  "key_count": 2,
  "key_ids": ["ghi789newkeyid", "def456keyid"]
}
```

> **참고:** 정상적인 키 롤오버 상황에서는 API가 자동으로 캐시를 무효화하고 재조회합니다.  
> 수동 갱신은 즉시 반영이 필요한 경우에만 사용하세요.

---

## 12. 연속 시나리오 — 신입 입사부터 퇴사 처리까지

```bash
SALARY_API=http://localhost:8000
KEYCLOAK=http://localhost:8080
REALM=corp
CLIENT_ID=salary-api
CLIENT_SECRET=<secret>

# ── 토큰 발급 ─────────────────────────────────────────────────────────────────
get_token() {
  curl -s -X POST "${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token" \
    -d "grant_type=password&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&username=$1&password=$2" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
}

TOKEN_ALICE=$(get_token alice alice123)
TOKEN_DAVE=$(get_token dave dave123)
TOKEN_HR=$(get_token hr_system hrsecret)

# ── Step 1: 신입 frank 입사 — HR이 연봉 레코드 추가 ─────────────────────────
# (이 예시에서는 store.py에 직접 추가하는 방식 — 실제는 DB INSERT)
echo "=== Step 1: frank 입사 처리 ==="
echo "Keycloak에서 frank 사용자 생성 후 sub(UUID) 확인 필요"
echo "store.py에 frank의 연봉 레코드를 employee_id=<frank_sub>로 추가"

# ── Step 2: frank 본인이 첫 연봉 확인 ────────────────────────────────────────
echo ""
echo "=== Step 2: frank 본인 연봉 조회 ==="
TOKEN_FRANK=$(get_token frank frank123)
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_FRANK}"

# ── Step 3: dave(팀장)가 신입 frank 환영하며 팀 연봉 현황 파악 ───────────────
echo ""
echo "=== Step 3: dave가 engineering 팀 전체 연봉 조회 ==="
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_DAVE}"

# ── Step 4: 연말 인사 — dave가 alice 연봉 인상 ───────────────────────────────
echo ""
echo "=== Step 4: alice 연봉 인상 (72M → 78M) ==="
curl -s -X PATCH ${SALARY_API}/salaries/s001 \
  -H "Authorization: Bearer ${TOKEN_DAVE}" \
  -H "Content-Type: application/json" \
  -d '{"base_salary": 78000000, "bonus": 7000000, "effective_date": "2025-01-01"}'

# ── Step 5: alice가 인상된 본인 연봉 확인 ────────────────────────────────────
echo ""
echo "=== Step 5: alice 연봉 인상 확인 ==="
curl -s ${SALARY_API}/salaries/me \
  -H "Authorization: Bearer ${TOKEN_ALICE}"

# ── Step 6: alice가 동료 bob 연봉 엿보기 시도 → 403 ─────────────────────────
echo ""
echo "=== Step 6: alice가 bob 연봉 조회 시도 → 403 ==="
curl -s ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_ALICE}"

# ── Step 7: HR이 전체 연봉 감사 ──────────────────────────────────────────────
echo ""
echo "=== Step 7: hr_system 전체 연봉 감사 ==="
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_HR}"

# ── Step 8: bob 퇴사 처리 — HR이 연봉 레코드 삭제 ────────────────────────────
echo ""
echo "=== Step 8: bob 퇴사 처리 (DELETE) ==="
curl -s -X DELETE ${SALARY_API}/salaries/s002 \
  -H "Authorization: Bearer ${TOKEN_HR}"

# ── Step 9: 퇴사 후 bob이 접속 시도 (Keycloak에서 계정 비활성화 필요) ─────────
echo ""
echo "=== Step 9: 퇴사 후 bob 토큰으로 접근 시도 ==="
echo "Keycloak에서 계정 비활성화 또는 세션 만료 후에는 토큰 발급 자체가 차단됩니다."

# ── Step 10: HR이 삭제 후 최종 인원 확인 ─────────────────────────────────────
echo ""
echo "=== Step 10: 최종 연봉 현황 ==="
curl -s ${SALARY_API}/salaries \
  -H "Authorization: Bearer ${TOKEN_HR}"
```

---

## 13. Python requests 예시

```python
import requests

SALARY_API = "http://localhost:8000"
KEYCLOAK   = "http://localhost:8080"
REALM      = "corp"
CLIENT_ID  = "salary-api"
CLIENT_SECRET = "<your-secret>"


def get_token(username: str, password: str) -> str:
    """Keycloak Password Grant로 Access Token 발급"""
    resp = requests.post(
        f"{KEYCLOAK}/realms/{REALM}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "username": username,
            "password": password,
        },
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── 1. 토큰 발급 ──────────────────────────────────────────────────────────────
alice_token = get_token("alice", "alice123")
dave_token  = get_token("dave",  "dave123")
hr_token    = get_token("hr_system", "hrsecret")

# ── 2. 본인 정보 확인 ──────────────────────────────────────────────────────────
me = requests.get(f"{SALARY_API}/auth/me", headers=auth_header(alice_token)).json()
print(f"Alice 역할: {me['role']}, 팀: {me['team']}")

# ── 3. 본인 연봉 조회 ──────────────────────────────────────────────────────────
salary = requests.get(f"{SALARY_API}/salaries/me", headers=auth_header(alice_token)).json()
total = salary["base_salary"] + salary["bonus"]
print(f"Alice 총연봉: {total:,}원 (기본 {salary['base_salary']:,} + 보너스 {salary['bonus']:,})")

# ── 4. 팀장이 팀 연봉 목록 조회 ───────────────────────────────────────────────
team_salaries = requests.get(
    f"{SALARY_API}/salaries", headers=auth_header(dave_token)
).json()
print(f"\nDave 팀 ({team_salaries['total']}명):")
for s in team_salaries["data"]:
    print(f"  {s['employee_name']:15} 기본급: {s['base_salary']:,}원")

# ── 5. 팀장이 팀원 연봉 인상 ──────────────────────────────────────────────────
result = requests.patch(
    f"{SALARY_API}/salaries/s001",
    headers=auth_header(dave_token),
    json={"base_salary": 78_000_000, "effective_date": "2025-01-01"},
).json()
print(f"\n연봉 인상 결과: {result['record']['base_salary']:,}원 ({result['updated_by']})")

# ── 6. 권한 없는 접근 처리 ──────────────────────────────────────────────────────
resp = requests.get(
    f"{SALARY_API}/salaries/s002",  # alice가 bob 조회 시도
    headers=auth_header(alice_token),
)
if resp.status_code == 403:
    print(f"\n403 Forbidden: {resp.json()['detail']}")

# ── 7. 퇴사 처리 ──────────────────────────────────────────────────────────────
del_resp = requests.delete(
    f"{SALARY_API}/salaries/s002",
    headers=auth_header(hr_token),
)
deleted = del_resp.json()
print(f"\n퇴사 처리: {deleted['deleted_record']['employee_name']} 레코드 삭제 완료")

# ── 8. 전체 현황 확인 ──────────────────────────────────────────────────────────
all_salaries = requests.get(
    f"{SALARY_API}/salaries", headers=auth_header(hr_token)
).json()
print(f"\n현재 재직 인원: {all_salaries['total']}명")
```

---

## 14. JavaScript fetch 예시

```javascript
const SALARY_API  = "http://localhost:8000";
const KEYCLOAK    = "http://localhost:8080";
const REALM       = "corp";
const CLIENT_ID   = "salary-api";
const CLIENT_SECRET = "<your-secret>";

// ── 토큰 발급 헬퍼 ─────────────────────────────────────────────────────────────
async function getToken(username, password) {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username,
    password,
  });
  const res = await fetch(
    `${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token`,
    { method: "POST", body }
  );
  const data = await res.json();
  return data.access_token;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  // 1. 토큰 발급
  const aliceToken = await getToken("alice", "alice123");
  const daveToken  = await getToken("dave",  "dave123");
  const hrToken    = await getToken("hr_system", "hrsecret");

  // 2. alice 본인 정보 확인
  const me = await fetch(`${SALARY_API}/auth/me`, {
    headers: authHeader(aliceToken),
  }).then(r => r.json());
  console.log(`Alice: role=${me.role}, team=${me.team}`);

  // 3. alice 본인 연봉
  const mySalary = await fetch(`${SALARY_API}/salaries/me`, {
    headers: authHeader(aliceToken),
  }).then(r => r.json());
  console.log(`Alice 총연봉: ${(mySalary.base_salary + mySalary.bonus).toLocaleString()}원`);

  // 4. dave 팀 전체 조회
  const team = await fetch(`${SALARY_API}/salaries`, {
    headers: authHeader(daveToken),
  }).then(r => r.json());
  console.log(`\nDave 팀 (${team.total}명):`);
  team.data.forEach(s => {
    console.log(`  ${s.employee_name}: ${s.base_salary.toLocaleString()}원`);
  });

  // 5. alice(사원)가 bob 조회 시도 → 403
  const forbidden = await fetch(`${SALARY_API}/salaries/s002`, {
    headers: authHeader(aliceToken),
  });
  if (forbidden.status === 403) {
    const err = await forbidden.json();
    console.log(`\n403 Forbidden: ${err.detail}`);
  }

  // 6. 팀장이 팀원 연봉 수정
  const updated = await fetch(`${SALARY_API}/salaries/s001`, {
    method: "PATCH",
    headers: { ...authHeader(daveToken), "Content-Type": "application/json" },
    body: JSON.stringify({ base_salary: 78_000_000, effective_date: "2025-01-01" }),
  }).then(r => r.json());
  console.log(`\n연봉 인상: ${updated.record.base_salary.toLocaleString()}원`);

  // 7. hr_system 퇴사 처리
  const deleted = await fetch(`${SALARY_API}/salaries/s002`, {
    method: "DELETE",
    headers: authHeader(hrToken),
  }).then(r => r.json());
  console.log(`\n퇴사: ${deleted.deleted_record.employee_name} 삭제 완료`);

  // 8. 최종 현황
  const all = await fetch(`${SALARY_API}/salaries`, {
    headers: authHeader(hrToken),
  }).then(r => r.json());
  console.log(`\n현재 재직: ${all.total}명`);
}

main().catch(console.error);
```

---

## Postman Collection 설정 (참고)

Postman을 사용하는 경우 다음 환경 변수를 설정하세요:

| Variable | Value |
|----------|-------|
| `salary_api` | `http://localhost:8000` |
| `keycloak_url` | `http://localhost:8080` |
| `realm` | `corp` |
| `client_id` | `salary-api` |
| `client_secret` | `<your-secret>` |

**Pre-request Script (토큰 자동 발급):**

```javascript
const keycloak  = pm.environment.get("keycloak_url");
const realm     = pm.environment.get("realm");
const clientId  = pm.environment.get("client_id");
const secret    = pm.environment.get("client_secret");

// 현재 요청의 username/password 변수 사용
const username  = pm.variables.get("username") || "alice";
const password  = pm.variables.get("password") || "alice123";

pm.sendRequest({
  url: `${keycloak}/realms/${realm}/protocol/openid-connect/token`,
  method: "POST",
  header: { "Content-Type": "application/x-www-form-urlencoded" },
  body: {
    mode: "urlencoded",
    urlencoded: [
      { key: "grant_type",    value: "password" },
      { key: "client_id",     value: clientId },
      { key: "client_secret", value: secret },
      { key: "username",      value: username },
      { key: "password",      value: password },
    ],
  },
}, (err, res) => {
  if (!err) {
    pm.environment.set("access_token", res.json().access_token);
  }
});
```

이후 모든 요청의 Authorization 헤더에:
```
Bearer {{access_token}}
```
