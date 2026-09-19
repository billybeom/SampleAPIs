# 💰 API 2 — Salary Management API

> **IBM API Connect 등록용 샘플 REST API**  
> Python + FastAPI · 외부 IdP **Keycloak** OIDC 연동 · RBAC 역할 기반 권한 관리

---

## 개요

| 항목 | 내용 |
|------|------|
| 런타임 | Python 3.11+ |
| 프레임워크 | FastAPI + Uvicorn |
| 포트 | 8000 (기본값) |
| 인증 방식 | Keycloak 외부 IdP — OIDC / JWKS 검증 (RS256) |
| 권한 모델 | RBAC (employee / manager / hr_system) |
| 데이터 저장 | In-memory (재시작 시 초기화) |
| API 문서 | `/docs` (Swagger UI 자동 제공), `/redoc` |

---

## 인증 아키텍처

### 전체 흐름

```
                        ① 토큰 발급 요청
  ┌──────────┐ ────────────────────────────► ┌─────────────────┐
  │ Client   │                               │   Keycloak      │
  │          │ ◄──────────────────────────── │   (외부 IdP)    │
  └────┬─────┘  ② RS256 서명 JWT 발급        └─────────────────┘
       │                                             ▲
       │ ③ API 호출                                  │ ⑤ JWKS 조회
       │  Authorization: Bearer <token>              │  (공개키)
       ▼                                             │
  ┌──────────────────────────┐                       │
  │    IBM API Connect       │                       │
  │  (OpenShift 또는 OVA)    │                       │
  │                          │                       │
  │  • 클라이언트 인증       │                       │
  │  • 요청 정책 적용        │                       │
  │  • Outbound 토큰을       │                       │
  │    헤더에 담아 전달 ──►  │                       │
  └──────────┬───────────────┘                       │
             │ ④ 토큰 포함 호출                      │
             │  Authorization: Bearer <token>        │
             ▼                                       │
  ┌──────────────────────────┐                       │
  │    Salary API (이 서비스)│                       │
  │                          ├───────────────────────┘
  │  • JWKS로 서명 재검증    │
  │  • 클레임에서 역할 추출  │
  │  • 역할/팀 기반 권한 결정│
  └──────────────────────────┘
```

### 핵심 포인트

| 단계 | 주체 | 설명 |
|------|------|------|
| 토큰 발급 | Keycloak | Password Grant / Client Credentials로 JWT 발급 |
| 1차 검증 | API Connect | 클라이언트 ID/Secret 검증, 정책 적용 |
| Outbound 토큰 전달 | API Connect | 원본 토큰 또는 재가공 토큰을 헤더로 전달 |
| 2차 검증 (재검증) | Salary API | Keycloak JWKS 엔드포인트로 서명 직접 검증 |
| 권한 판단 | Salary API | `realm_access.roles` 클레임 기반 RBAC |

> **왜 재검증을 하는가?**  
> API Connect를 통과했더라도, 백엔드 API가 토큰을 독립적으로 검증함으로써  
> API Connect 우회 시도, 토큰 위조, 키 롤오버 대응이 가능합니다. (Defense in Depth)

---

## 권한 매트릭스

```
┌───────────┬──────────────────────┬──────────────────────┬────────────┐
│ Role      │ GET (읽기)           │ PATCH (수정)         │ DELETE     │
├───────────┼──────────────────────┼──────────────────────┼────────────┤
│ employee  │ 본인 연봉만          │ 본인 연봉만          │ 불가       │
│ manager   │ 본인 팀 전체         │ 본인 팀 전체         │ 불가       │
│ hr_system │ 전체                 │ 전체                 │ 가능 (전체)│
└───────────┴──────────────────────┴──────────────────────┴────────────┘
```

### 유즈케이스 예시
- **Alice (사원)** → 자신의 연봉만 조회 가능. 다른 사람 조회 시 `403 Forbidden`
- **Dave (engineering 팀장)** → engineering 팀 전체 연봉 조회 및 수정 가능. marketing 팀 접근 시 `403`
- **hr_system** → 전 사원 조회/수정/삭제 가능. 퇴사 처리 시 `DELETE /salaries/:id` 호출

---

## 빠른 시작

```bash
cd api2-salary

# 가상환경 생성 및 의존성 설치
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Keycloak 설정 (환경변수)
export KEYCLOAK_URL=http://localhost:8080
export KEYCLOAK_REALM=corp
export KEYCLOAK_AUDIENCE=salary-api

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

서버 시작 후:
- Swagger UI: http://localhost:8000/docs
- JWKS 연결 확인: http://localhost:8000/auth/jwks-status

---

## 환경변수

| 변수명 | 필수 | 기본값 | 설명 |
|--------|------|--------|------|
| `KEYCLOAK_URL` | ✅ | `http://localhost:8080` | Keycloak 서버 URL |
| `KEYCLOAK_REALM` | ✅ | `corp` | Keycloak Realm 이름 |
| `KEYCLOAK_AUDIENCE` | | `salary-api` | 토큰 aud 클레임 검증값 (Keycloak Client ID) |
| `TOKEN_HEADER_NAME` | | `Authorization` | API Connect가 토큰을 전달하는 헤더 이름 |

---

## Keycloak 설정 가이드

### 1. Realm 생성

```
Keycloak Admin Console → Create Realm
  Realm name: corp
```

### 2. Client 생성 (`salary-api`)

```
Realm: corp → Clients → Create client
  Client ID:         salary-api
  Client Protocol:   openid-connect
  Access Type:       confidential  (또는 public — 테스트 시)
  Valid Redirect URIs: *
```

**Client Scopes → salary-api → Mappers 에서 아래 추가:**

```
Mapper 1: department (User Attribute → Token Claim)
  Mapper Type:       User Attribute
  User Attribute:    department
  Token Claim Name:  department
  Claim JSON Type:   String
  Add to access token: ON
```

### 3. Realm Roles 생성

```
Realm: corp → Realm roles → Create role
  Role 이름을 각각 생성:
  - employee
  - manager
  - hr_system
```

### 4. 테스트 사용자 생성

| Username | Password | Realm Role | department (User Attribute) |
|----------|----------|------------|-----------------------------|
| alice | alice123 | employee | engineering |
| bob | bob123 | employee | engineering |
| carol | carol123 | employee | marketing |
| dave | dave123 | manager | engineering |
| eve | eve123 | manager | marketing |
| hr_system | hrsecret | hr_system | — |

사용자 설정 방법:
```
Users → Create user → Attributes 탭 → department: engineering
Users → <user> → Role Mappings → Realm Roles → Assign role: employee
```

### 5. SALARY 레코드의 employee_id 업데이트

Keycloak 사용자 생성 후, 각 사용자의 **User ID(sub)** 를 확인해 [`app/data/store.py`](app/data/store.py) 의 `employee_id` 를 교체하세요.

```
Keycloak Admin → Users → <user> → 상단 ID(UUID) 복사
```

```python
# app/data/store.py
SALARIES = [
    {
        "id": "s001",
        "employee_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",  # Alice의 실제 Keycloak sub
        ...
    },
]
```

---

## 인증 흐름 — curl 예시

> 📖 **더 많은 예시는 [EXAMPLES.md](EXAMPLES.md) 를 참고하세요.**
> 토큰 발급 · 역할별 조회/수정/삭제 · 403/401/503 에러 케이스 · 연속 시나리오 · Python/JS · Postman 설정 포함

### Step 1 — Keycloak에서 Access Token 발급

```bash
# Password Grant (테스트/개발용)
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=salary-api" \
  -d "client_secret=<client_secret>" \
  -d "username=alice" \
  -d "password=alice123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: ${TOKEN:0:50}..."
```

### Step 2 — 토큰 정보 확인 (Salary API)

```bash
# Keycloak 토큰으로 /auth/me 호출 → 역할/팀 정보 반환
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "username": "alice",
  "email": "alice@corp.com",
  "full_name": "Alice Kim",
  "role": "employee",
  "team": "engineering"
}
```

### Step 3 — 본인 연봉 조회

```bash
curl http://localhost:8000/salaries/me \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4 — 권한 없는 접근 시도 (403 예시)

```bash
# alice(employee)가 다른 사람 레코드 조회 시도
curl http://localhost:8000/salaries/s002 \
  -H "Authorization: Bearer $TOKEN"
# → 403 Forbidden: "You do not have permission to view this salary record."
```

### Step 5 — 팀장 권한으로 팀 전체 조회 (dave)

```bash
TOKEN_DAVE=$(curl -s -X POST \
  http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -d "grant_type=password&client_id=salary-api&client_secret=<secret>&username=dave&password=dave123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl http://localhost:8000/salaries \
  -H "Authorization: Bearer $TOKEN_DAVE"
```

### Step 6 — hr_system 으로 퇴사 처리 (삭제)

```bash
TOKEN_HR=$(curl -s -X POST \
  http://localhost:8080/realms/corp/protocol/openid-connect/token \
  -d "grant_type=password&client_id=salary-api&client_secret=<secret>&username=hr_system&password=hrsecret" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -X DELETE http://localhost:8000/salaries/s001 \
  -H "Authorization: Bearer $TOKEN_HR"
```

---

## 엔드포인트

### 🔐 Authentication

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/auth/me` | 현재 토큰의 사용자 정보 반환 (토큰 검증 포함) |
| `GET` | `/auth/config` | 현재 Keycloak 연동 설정 확인 |
| `GET` | `/auth/jwks-status` | Keycloak JWKS 연결 상태 확인 |
| `POST` | `/auth/jwks-refresh` | JWKS 캐시 강제 갱신 (키 롤오버 시 사용) |

### 💰 Salaries

| Method | Path | 설명 | employee | manager | hr_system |
|--------|------|------|:---:|:---:|:---:|
| `GET` | `/salaries/me` | 본인 연봉 조회 | ✅ | ✅ | ✅ |
| `GET` | `/salaries` | 연봉 목록 (권한에 따라 범위 다름) | 본인만 | 팀 전체 | 전체 |
| `GET` | `/salaries/:id` | 특정 연봉 레코드 조회 | 본인만 | 팀만 | ✅ |
| `PATCH` | `/salaries/:id` | 연봉 수정 | 본인만 | 팀만 | ✅ |
| `DELETE` | `/salaries/:id` | 연봉 레코드 삭제 (퇴사 처리) | ❌ | ❌ | ✅ |

---

## IBM API Connect 등록 가이드

### OpenAPI 스펙 추출

```bash
curl http://localhost:8000/openapi.json -o salary-api-openapi.json
```

이 파일을 IBM API Connect의 **Import API** 기능으로 바로 가져올 수 있습니다.

### API Connect — Keycloak OAuth2 Provider 설정

#### 시나리오: API Connect가 Keycloak 토큰을 백엔드로 그대로 전달

```
API Connect Assembly 구성:
  1. Security Definition: OAuth2 (External IdP — Keycloak)
       Token URL : http://keycloak.example.com/realms/corp/protocol/openid-connect/token
       JWKS URL  : http://keycloak.example.com/realms/corp/protocol/openid-connect/certs
       Issuer    : http://keycloak.example.com/realms/corp

  2. Invoke 정책 설정:
       URL: http://<salary-api-host>:8000$(request.path)
       헤더 전달: Authorization 헤더 그대로 전달 (기본 동작)
```

#### 시나리오: API Connect가 커스텀 헤더로 토큰 전달 (Set-Variable 정책)

API Connect Assembly에서 Set-Variable 정책으로 토큰을 별도 헤더에 복사:

```yaml
# API Connect Assembly — Set-Variable 정책 예시
- set-variable:
    actions:
      - set: message.headers.X-Forwarded-Access-Token
        value: $(request.headers.Authorization)
```

이 경우 Salary API 환경변수 설정:
```
TOKEN_HEADER_NAME=X-Forwarded-Access-Token
```

#### Keycloak 토큰 클레임 → API Connect Scope 매핑

| Keycloak 클레임 | API Connect 활용 | Salary API 활용 |
|----------------|-----------------|----------------|
| `realm_access.roles` | OAuth2 scope 매핑 가능 | RBAC 역할 결정 |
| `sub` | 사용자 식별 | 연봉 레코드 조회 키 |
| `department` | 로그/감사 | 팀 기반 권한 |
| `aud` | audience 검증 | audience 검증 |

---

## 배포 가이드

### 배포 시나리오 선택

```
시나리오 A — OpenShift 배포 (IBM API Connect on OCP)
시나리오 B — Kubernetes 배포 (표준 K8s 클러스터)
시나리오 C — Linux VM 배포 (IBM API Connect OVA)
```

---

### 시나리오 A — OpenShift 배포

#### 사전 요건
- `oc` CLI 로그인 완료
- Keycloak이 OCP 내부 또는 외부에서 접근 가능한 상태
- `sample-apis` 네임스페이스 생성

#### 1. 네임스페이스 생성

```bash
oc new-project sample-apis
```

#### 2. ConfigMap 적용 (Keycloak 설정)

> 배포 전 [`openshift/imagestream-and-configmap.yaml`](openshift/imagestream-and-configmap.yaml) 의 Keycloak URL/Realm 값을 수정하세요.

```bash
cd api2-salary
oc apply -f openshift/imagestream-and-configmap.yaml -n sample-apis
```

#### 3. 컨테이너 이미지 빌드 & Push

```bash
# 방법 A: oc new-build
oc new-build --name=salary-api --binary --strategy=docker -n sample-apis
oc start-build salary-api --from-dir=. --follow -n sample-apis

# 방법 B: Podman 빌드 후 내부 레지스트리 Push
REGISTRY=$(oc get route default-route -n openshift-image-registry \
  --template='{{ .spec.host }}')
podman build -t ${REGISTRY}/sample-apis/salary-api:latest .
podman push ${REGISTRY}/sample-apis/salary-api:latest --tls-verify=false
```

#### 4. 매니페스트 적용

```bash
oc apply -f openshift/deployment.yaml -n sample-apis
oc apply -f openshift/service.yaml -n sample-apis
oc apply -f openshift/route.yaml -n sample-apis
```

#### 5. 배포 확인

```bash
oc get pods -n sample-apis -l app=salary-api

# JWKS 연결 상태 확인
ROUTE=$(oc get route salary-api -n sample-apis --template='{{ .spec.host }}')
curl https://${ROUTE}/auth/jwks-status
```

#### 6. Keycloak 연결 문제 해결

Keycloak이 OCP 클러스터 외부에 있는 경우, Pod에서 접근 가능한지 확인:

```bash
# Pod에서 직접 Keycloak 연결 테스트
oc exec -n sample-apis deploy/salary-api -- \
  curl -s http://keycloak.example.com/realms/corp/protocol/openid-connect/certs | head -c 100
```

Keycloak이 OCP 내부에 있는 경우 Service DNS 사용:
```
KEYCLOAK_URL=http://keycloak.keycloak-ns.svc.cluster.local:8080
```

#### OpenShift 매니페스트 구조

```
openshift/
├── imagestream-and-configmap.yaml  ← ImageStream + Keycloak 설정 ConfigMap
├── deployment.yaml                  ← Deployment (ConfigMap 환경변수 주입)
├── service.yaml                     ← ClusterIP Service (port 8000)
└── route.yaml                       ← Route (TLS edge)
```

---

### 시나리오 B — Kubernetes 배포

#### 사전 요건
- `kubectl` CLI 설치 및 클러스터 연결 완료
- Container Registry 접근 권한 (Docker Hub, GHCR, ECR 등)
- nginx Ingress Controller 설치 (HTTP 외부 노출 시)
- Keycloak이 K8s 내부 또는 외부에서 접근 가능한 상태

#### OpenShift와의 주요 차이점

| 항목 | OpenShift | Kubernetes |
|------|-----------|-----------|
| 외부 노출 | `Route` (자동 TLS) | `Ingress` (Ingress Controller 필요) |
| 이미지 관리 | `ImageStream` | 레지스트리 직접 참조 |
| 설정 관리 | `ConfigMap` (동일) | `ConfigMap` (동일) |
| 네임스페이스 생성 | `oc new-project` | `kubectl create namespace` |
| 보안 정책 | SCC | PodSecurityAdmission |

#### 1. 네임스페이스 생성

```bash
kubectl apply -f kubernetes/namespace.yaml
```

#### 2. ConfigMap 적용 (Keycloak 설정)

> 배포 전 [`kubernetes/configmap.yaml`](kubernetes/configmap.yaml) 의 Keycloak URL/Realm 값을 수정하세요.

```bash
cd api2-salary
kubectl apply -f kubernetes/configmap.yaml -n sample-apis
```

#### 3. 컨테이너 이미지 빌드 & Push

```bash
cd api2-salary

# Docker 빌드
docker build -t your-registry.example.com/sample-apis/salary-api:latest .
docker push your-registry.example.com/sample-apis/salary-api:latest

# Podman 빌드
podman build -t your-registry.example.com/sample-apis/salary-api:latest .
podman push your-registry.example.com/sample-apis/salary-api:latest
```

#### 4. (선택) 프라이빗 레지스트리 인증 Secret 생성

```bash
kubectl create secret docker-registry registry-credentials \
  --docker-server=your-registry.example.com \
  --docker-username=<username> \
  --docker-password=<password> \
  -n sample-apis
```

[`kubernetes/deployment.yaml`](kubernetes/deployment.yaml) 의 `imagePullSecrets` 주석을 해제하세요.

#### 5. 매니페스트 적용

> 배포 전 [`kubernetes/deployment.yaml`](kubernetes/deployment.yaml) 의 `image:` 경로를 실제 레지스트리로 교체하세요.

```bash
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

#### 6. 배포 확인

```bash
# Pod 상태 확인
kubectl get pods -n sample-apis -l app=salary-api

# Ingress 확인
kubectl get ingress -n sample-apis

# JWKS 연결 확인 (포트 포워딩)
kubectl port-forward svc/salary-api 8000:8000 -n sample-apis
curl http://localhost:8000/auth/jwks-status
```

#### 7. Ingress host 설정

[`kubernetes/ingress.yaml`](kubernetes/ingress.yaml) 의 `host:` 값을 실제 도메인으로 변경하세요:

```yaml
host: salary-api.k8s.corp.com
```

도메인 없이 테스트 시:

```bash
INGRESS_IP=$(kubectl get ingress salary-api -n sample-apis \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "${INGRESS_IP}  salary-api.your-cluster.example.com" | sudo tee -a /etc/hosts
```

#### 8. Keycloak 연결 확인 (K8s 내부 Keycloak 사용 시)

Keycloak이 같은 클러스터 내에 있다면 Service DNS를 사용하세요:

```bash
# kubernetes/configmap.yaml 수정
keycloak-url: "http://keycloak.keycloak-ns.svc.cluster.local:8080"

# 변경 후 ConfigMap 재적용
kubectl apply -f kubernetes/configmap.yaml -n sample-apis
kubectl rollout restart deployment/salary-api -n sample-apis
```

#### 9. 로그 확인

```bash
kubectl logs -l app=salary-api -n sample-apis --follow
```

#### Kubernetes 매니페스트 구조

```
kubernetes/
├── namespace.yaml   ← Namespace (sample-apis)
├── configmap.yaml   ← Keycloak 설정 ConfigMap
├── deployment.yaml  ← Deployment (ConfigMap 환경변수 주입, non-root)
├── service.yaml     ← ClusterIP Service (port 8000)
└── ingress.yaml     ← Ingress (nginx, TLS 선택적)
```

---

### 시나리오 C — Linux VM 배포

#### 사전 요건
- RHEL 8/9, Rocky Linux 8/9, Ubuntu 22.04 LTS
- Python 3.11+ (설치 스크립트가 자동 처리)
- Keycloak VM 또는 서버가 이미 운영 중

#### 1. 소스 전송

```bash
scp -r ./api2-salary user@<VM_IP>:/tmp/api2-salary
ssh user@<VM_IP>
```

#### 2. Keycloak 설정 편집

```bash
vi /tmp/api2-salary/deploy/vm/salary-api.env
# 아래 값 수정:
# KEYCLOAK_URL=http://<keycloak-vm-ip>:8080
# KEYCLOAK_REALM=corp
# KEYCLOAK_AUDIENCE=salary-api
# TOKEN_HEADER_NAME=Authorization
```

#### 3. 설치 스크립트 실행

```bash
cd /tmp/api2-salary
chmod +x deploy/vm/install.sh
sudo ./deploy/vm/install.sh
```

#### 4. 서비스 관리

```bash
sudo systemctl status salary-api
journalctl -u salary-api -f

# Keycloak 설정 변경 후 재시작
sudo vi /etc/sample-apis/salary-api.env
sudo systemctl restart salary-api
```

#### 5. 방화벽 설정

```bash
# RHEL/Rocky
sudo firewall-cmd --permanent --add-port=8000/tcp && sudo firewall-cmd --reload
# Ubuntu
sudo ufw allow 8000/tcp
```

#### 6. API Connect (OVA) 에서 연결

| 설정 항목 | 값 |
|---------|-----|
| Backend URL | `http://<VM_IP>:8000` |
| OAuth2 Token URL (Keycloak) | `http://<keycloak-ip>:8080/realms/corp/protocol/openid-connect/token` |
| JWKS URL (Keycloak) | `http://<keycloak-ip>:8080/realms/corp/protocol/openid-connect/certs` |

#### VM 배포 파일 구조

```
deploy/vm/
├── install.sh         ← 자동 설치 스크립트
├── salary-api.service ← systemd 유닛 파일
└── salary-api.env     ← 환경변수 템플릿 (KEYCLOAK_URL 등)
```

---

## 에러 코드

| HTTP Status | 의미 |
|-------------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 (토큰 없음, 만료, 서명 오류) |
| 403 | 권한 없음 (역할 불충분 또는 유효한 역할 없음) |
| 404 | 리소스를 찾을 수 없음 |
| 422 | 요청 바디 유효성 검사 실패 |
| 503 | Keycloak JWKS 엔드포인트 연결 실패 |
