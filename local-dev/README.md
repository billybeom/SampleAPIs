# 로컬 개발 환경 가이드

Keycloak + Salary API + Library API를 **한 번의 명령으로** 로컬에서 실행합니다.

## 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
|------|-----------|-----------|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 (Compose V2) | `docker compose version` |
| jq | 1.6+ | `jq --version` |
| curl | 7.x+ | `curl --version` |

---

## 빠른 시작

```bash
# 1. 이 디렉터리로 이동
cd local-dev

# 2. 전체 서비스 기동 (첫 실행 시 이미지 빌드 포함)
docker compose up --build

# 3. 다른 터미널에서 — Keycloak 초기화 + store.py UUID 자동 업데이트
chmod +x init-keycloak.sh
./init-keycloak.sh

# 4. salary-api 재시작 (store.py 변경 반영)
docker compose restart salary-api
```

---

## 서비스 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| Keycloak Admin | http://localhost:8080/admin | admin / admin |
| Keycloak OIDC | http://localhost:8080/realms/corp/.well-known/openid-configuration | OIDC Discovery |
| Salary API | http://localhost:8001/docs | FastAPI Swagger UI |
| Library API | http://localhost:3000 | Express API Info (JSON) |

---

## 테스트 계정

| 사용자명 | 비밀번호 | 역할 | 부서 |
|----------|----------|------|------|
| `alice` | `alice1234` | employee | engineering |
| `bob` | `bob1234` | employee | engineering |
| `carol` | `carol1234` | manager | engineering |
| `dave` | `dave1234` | employee | marketing |
| `hr-system` | `hrsystem1234` | hr_system | hr |

---

## 토큰 발급 방법

### curl (Resource Owner Password Grant)

```bash
# alice 토큰 발급
TOKEN=$(curl -sf \
  -X POST http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=postman-client" \
  -d "username=alice" \
  -d "password=alice1234" \
  | jq -r '.access_token')

echo $TOKEN
```

### Python

```python
import requests

resp = requests.post(
    "http://localhost:8080/realms/corp/protocol/openid-connect/token",
    data={
        "grant_type": "password",
        "client_id": "postman-client",
        "username": "alice",
        "password": "alice1234",
    }
)
token = resp.json()["access_token"]
print(token)
```

---

## API 테스트 예시

```bash
# 토큰 발급
TOKEN=$(curl -sf \
  -X POST http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=postman-client&username=alice&password=alice1234" \
  | jq -r '.access_token')

# alice — 본인 연봉 조회
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/salaries/me

# alice — 토큰 정보 확인
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/auth/me

# carol(manager) — 팀 전체 연봉 조회
CAROL_TOKEN=$(curl -sf \
  -X POST http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=postman-client&username=carol&password=carol1234" \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $CAROL_TOKEN" http://localhost:8001/salaries/team

# hr-system — 전체 연봉 목록 조회
HR_TOKEN=$(curl -sf \
  -X POST http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=postman-client&username=hr-system&password=hrsystem1234" \
  | jq -r '.access_token')

curl -H "Authorization: Bearer $HR_TOKEN" http://localhost:8001/salaries

# Library API — 도서 목록 조회 (인증 불필요)
curl http://localhost:3000/books
```

---

## 디렉터리 구조

```
local-dev/
├── docker-compose.yml          ← 전체 서비스 정의
├── init-keycloak.sh            ← Keycloak 초기화 + store.py UUID 자동 업데이트
├── README.md                   ← 이 파일
└── keycloak/
    └── realm-export/
        └── corp-realm.json     ← Realm 자동 import 설정
            ├── clients: salary-api, postman-client
            ├── roles:   employee, manager, hr_system
            └── users:   alice, bob, carol, dave, hr-system
```

---

## Keycloak Client 설정 설명

### `salary-api` (Confidential Client)

| 항목 | 값 | 설명 |
|------|----|------|
| Client ID | `salary-api` | `KEYCLOAK_AUDIENCE` 환경변수와 일치 |
| Client Secret | `salary-api-secret` | Client Credentials 사용 시 필요 |
| Direct Access Grants | ✓ | curl/Postman Password Grant |
| Mapper: department | `department` attribute → JWT claim | 팀/부서 정보 주입 |

### `postman-client` (Public Client)

개발/테스트용 퍼블릭 클라이언트. 비밀번호 없이 바로 토큰 발급 가능.

---

## JWT 클레임 예시

alice 토큰을 디코딩하면 다음과 같은 페이로드를 확인할 수 있습니다:

```json
{
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "preferred_username": "alice",
  "email": "alice@corp.com",
  "name": "Alice Kim",
  "department": "engineering",
  "realm_access": {
    "roles": ["employee", "default-roles-corp"]
  },
  "resource_access": {
    "salary-api": {
      "roles": ["employee"]
    }
  },
  "iss": "http://localhost:8080/realms/corp",
  "aud": ["salary-api", "account"],
  "exp": 1714567890,
  "iat": 1714564290
}
```

---

## 중지 및 초기화

```bash
# 서비스 중지 (데이터 유지)
docker compose down

# 서비스 중지 + 볼륨(Keycloak 데이터) 삭제
docker compose down -v

# 전체 재빌드
docker compose up --build --force-recreate
```

---

## 문제 해결

### "JWKS endpoint unreachable" 오류

```bash
# salary-api 컨테이너에서 Keycloak 연결 확인
docker compose exec salary-api curl -sf http://keycloak:8080/health/ready
```

→ Docker 네트워크 `sample-net` 으로 연결되어 있어야 합니다.

### Keycloak 로그 확인

```bash
docker compose logs keycloak -f
```

### store.py UUID 수동 확인

```bash
# Keycloak에서 alice UUID 조회
ADMIN_TOKEN=$(curl -sf \
  -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=admin&password=admin" \
  | jq -r '.access_token')

curl -sf \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/realms/corp/users?search=alice \
  | jq '.[0].id'
```
