# Keycloak IdP 연동 구성

IBM API Connect 12.1.1.2 + Keycloak 21.x 연동을 위한 YAML 정책 파일 모음입니다.

---

## 파일 목록

| 파일 | 목적 |
|------|------|
| [`keycloak-idp-dev.yaml`](keycloak-idp-dev.yaml) | 개발 환경 — OIDC User Registry + Third-Party OAuth Provider |
| [`keycloak-idp-staging.yaml`](keycloak-idp-staging.yaml) | 스테이징 환경 — OIDC User Registry + Third-Party OAuth Provider |
| [`keycloak-idp-prod.yaml`](keycloak-idp-prod.yaml) | 운영 환경 — OIDC User Registry + Third-Party OAuth Provider |
| [`keycloak-oauth-policy.yaml`](keycloak-oauth-policy.yaml) | DataPower Assembly 정책 패턴 (JWT 검증, OAuth2 인트로스펙션) |
| [`keycloak-rbac-policy.yaml`](keycloak-rbac-policy.yaml) | DataPower RBAC 역할 검증 GatewayScript 정책 |
| [`keycloak-setup-guide.md`](keycloak-setup-guide.md) | Keycloak Admin Console 단계별 설정 가이드 |

---

## 구성 요소 개요

```
IBM API Connect 12.1.1.2
│
├── API Manager (OIDC User Registry)
│     └── Keycloak OIDC → 관리자/개발자 포털 로그인
│
└── DataPower API Gateway
      ├── Third-Party OAuth Provider → Keycloak 인트로스펙션
      └── Assembly 정책
            ├── jwt-validate  → RS256 서명 검증 (JWKS)
            ├── gatewayscript → RBAC 역할 검사
            └── set-variable  → 클레임 → 백엔드 헤더 매핑
```

---

## 환경별 설정 비교

| 항목 | 개발 (dev) | 스테이징 (staging) | 운영 (prod) |
|------|-----------|-------------------|-------------|
| Keycloak Realm | `dev-corp` | `staging-corp` | `corp` |
| APIC Client ID | `apic-dev` | `apic-staging` | `apic-prod` |
| Introspect 캐시 | no-cache | TTL 60초 | TTL 300초 |
| PKCE 강제 | ❌ | ✅ | ✅ |
| Password Grant | ✅ (테스트용) | ✅ (부하 테스트용) | ❌ |
| Implicit Grant | ✅ (레거시) | ❌ | ❌ |
| TLS 검증 | 완화 | ✅ | ✅ (공인 CA) |
| Access Token TTL | 30분 | 10분 | 5분 |

---

## Assembly 정책 패턴

[`keycloak-oauth-policy.yaml`](keycloak-oauth-policy.yaml)에 4가지 패턴이 정의되어 있습니다:

### Pattern A — JWT 로컬 검증 (고성능)
- DataPower가 Keycloak JWKS에서 공개키를 가져와 JWT 서명 직접 검증
- Keycloak 서버 호출 없음 → 최저 지연
- 토큰 폐기 즉시 반영 불가 (TTL 내 유효)
- **적합**: 공개 API, 읽기 전용, 성능 우선

```
rate-limit → jwt-validate (JWKS) → set-variable (헤더 매핑) → invoke
```

### Pattern B — OAuth2 인트로스펙션 (실시간)
- DataPower가 Keycloak 인트로스펙션 엔드포인트를 실시간 호출
- 토큰 폐기 즉각 반영
- **적합**: 금융/개인정보 API, 쓰기 권한 API (api2-salary)

```
rate-limit → parse → oauth(인트로스펙션) → set-variable → invoke
```

### Pattern C — GatewayScript RBAC 검증
- Pattern A 또는 B 이후 역할 검사 추가
- Keycloak `realm_access.roles` + `resource_access.<client>.roles` 병합
- **적합**: api2-salary (employee/manager/hr_system), api1-library, api3-tours

### Pattern D — 전체 통합 흐름
- Pattern A + Pattern C 조합
- api2-salary 수준의 완전한 Keycloak 연동 흐름
- assembly 섹션에 그대로 복사 적용 가능

---

## RBAC 역할 정책

[`keycloak-rbac-policy.yaml`](keycloak-rbac-policy.yaml)에 API별 RBAC 정책이 정의되어 있습니다:

### api2-salary 권한 매트릭스

| 엔드포인트 | employee | manager | hr_system |
|-----------|----------|---------|-----------|
| GET /salaries/me | ✅ | ✅ | ✅ |
| GET /salaries | ❌ | ✅ | ✅ |
| GET /salaries/{id} | ❌ | ✅ | ✅ |
| POST /salaries | ❌ | ❌ | ✅ |
| PUT /salaries/{id} | ❌ | ✅ | ✅ |
| DELETE /salaries/{id} | ❌ | ❌ | ✅ |

### Keycloak 역할 구조
```
hr_system (최고 권한)
  └── manager (중간 권한)
        └── employee (기본 권한)
```

역할 우선순위: `hr_system > manager > employee`

---

## 빠른 시작

### 1. Keycloak 설정

[`keycloak-setup-guide.md`](keycloak-setup-guide.md) 참조:
1. Realm 생성 (`dev-corp` / `staging-corp` / `corp`)
2. Client `apic-{env}` 생성 (Confidential, Service Accounts 활성화)
3. 역할 생성 및 사용자 할당
4. Client Secret 복사 → Kubernetes Secret 저장

### 2. API Manager 등록

```bash
# 환경별 로그인
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
```

### 3. DataPower Assembly에 정책 적용

API YAML (`apic/datapower/api2-datapower.yaml` 등)의 `x-ibm-configuration.assembly.execute`에
[`keycloak-oauth-policy.yaml`](keycloak-oauth-policy.yaml)의 **Pattern D** 블록을 복사합니다.

---

## 관련 파일

- [`../datapower/`](../datapower/) — DataPower 배포 YAML (api1~api5, Swagger 2.0 + OAS 3.0)
- [`../webmethods/`](../webmethods/) — webMethods 배포 YAML
- [`../nano/`](../nano/) — Nano Gateway 배포 YAML (OAS 3.0 전용)
- [`../../api2-salary/`](../../api2-salary/) — Keycloak JWKS 검증 FastAPI 백엔드 소스
