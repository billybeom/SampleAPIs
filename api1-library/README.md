# 📚 API 1 — Library Management API

> **IBM API Connect 등록용 샘플 REST API**  
> Node.js + Express 기반의 직관적인 도서관 관리 API

---

## 개요

| 항목 | 내용 |
|------|------|
| 런타임 | Node.js 18+ |
| 프레임워크 | Express 4 |
| 포트 | 3000 (기본값) |
| 인증 | 없음 (공개 API 시연용) |
| 데이터 저장 | In-memory (재시작 시 초기화) |

---

## 빠른 시작

```bash
cd api1-library
npm install
npm start
# 또는 개발 모드 (파일 변경 시 자동 재시작)
npm run dev
```

서버가 시작되면 `http://localhost:3000` 에서 API Info를 확인할 수 있습니다.

---

## 엔드포인트

### 📖 Books

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/books` | 전체 도서 목록 조회 (필터링/페이징 지원) |
| `GET` | `/books/:id` | 특정 도서 조회 |
| `POST` | `/books` | 신규 도서 등록 |
| `PUT` | `/books/:id` | 도서 전체 업데이트 |
| `PATCH` | `/books/:id` | 도서 부분 업데이트 (예: 재고 조정) |
| `DELETE` | `/books/:id` | 도서 삭제 |

#### GET /books 쿼리 파라미터

| 파라미터 | 타입 | 예시 | 설명 |
|----------|------|------|------|
| `genre` | string | `Technology` | 장르 필터 |
| `available` | boolean | `true` | 대출 가능 여부 |
| `author` | string | `Martin` | 저자 부분 검색 |
| `page` | number | `1` | 페이지 번호 |
| `limit` | number | `5` | 페이지당 결과 수 |

### 📋 Loans (대출/반납)

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/loans` | 전체 대출 기록 조회 |
| `GET` | `/loans/:id` | 특정 대출 기록 조회 |
| `POST` | `/loans` | 도서 대출 신청 |
| `PATCH` | `/loans/:id/return` | 도서 반납 처리 |

---

## 요청/응답 예시

> 📖 **더 많은 예시는 [EXAMPLES.md](EXAMPLES.md) 를 참고하세요.**
> curl · Python requests · JavaScript fetch · 연속 시나리오 · 에러 케이스 모음 포함

### 도서 목록 조회

```bash
curl http://localhost:3000/books?genre=Technology&available=true
```

```json
{
  "total": 2,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    {
      "id": "b001",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "isbn": "978-0132350884",
      "genre": "Technology",
      "publishedYear": 2008,
      "available": true,
      "stock": 3
    }
  ]
}
```

### 도서 등록

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Refactoring",
    "author": "Martin Fowler",
    "isbn": "978-0134757599",
    "genre": "Technology",
    "publishedYear": 2018,
    "stock": 2
  }'
```

### 도서 대출

```bash
curl -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "b001",
    "borrowerName": "홍길동",
    "borrowerEmail": "hong@example.com",
    "daysToLoan": 14
  }'
```

### 도서 반납

```bash
curl -X PATCH http://localhost:3000/loans/l001/return
```

---

## IBM API Connect 등록 가이드

1. `GET /` 또는 `GET /health` 로 API 연결 확인
2. OpenAPI 스펙은 서버 실행 후 자동 생성이 필요하다면 `swagger-jsdoc` 패키지 추가
3. 포트 `3000` 으로 Catalog에 등록 (또는 환경변수 `PORT` 변경)
4. 인증이 필요한 경우 `X-IBM-Client-Id` 헤더를 미들웨어에서 검증하도록 확장 가능

---

## 배포 가이드

### 배포 시나리오 선택

```
시나리오 A — OpenShift 배포 (IBM API Connect on OCP)
  API Connect가 OpenShift 위에 구성된 경우.
  API 서버도 동일한 OCP 클러스터 또는 별도 네임스페이스에 배포합니다.

시나리오 B — Kubernetes 배포 (표준 K8s 클러스터)
  EKS, GKE, AKS, 온프레미스 Kubernetes 등 표준 K8s 환경에 배포합니다.

시나리오 C — Linux VM 배포 (IBM API Connect OVA)
  IBM API Connect가 OVA 형태의 별도 VM으로 구성된 경우.
  API 서버는 별도 Linux VM에 systemd 서비스로 배포합니다.
```

---

### 시나리오 A — OpenShift 배포

#### 사전 요건
- `oc` CLI 로그인 완료
- Container Registry 접근 권한 (내부 레지스트리 또는 Quay.io)
- `sample-apis` 네임스페이스 생성

#### 1. 네임스페이스 생성

```bash
oc new-project sample-apis
```

#### 2. 컨테이너 이미지 빌드 & Push

```bash
cd api1-library

# 방법 A: oc new-build (OpenShift 내부 빌드)
oc new-build --name=library-api \
  --binary=true \
  --strategy=docker \
  -n sample-apis
oc start-build library-api --from-dir=. --follow -n sample-apis

# 방법 B: 로컬 Docker/Podman 빌드 후 내부 레지스트리 Push
REGISTRY=$(oc get route default-route -n openshift-image-registry \
  --template='{{ .spec.host }}')
podman build -t ${REGISTRY}/sample-apis/library-api:latest .
podman push ${REGISTRY}/sample-apis/library-api:latest \
  --tls-verify=false
```

#### 3. 매니페스트 적용

> 배포 전 [`openshift/deployment.yaml`](openshift/deployment.yaml) 의 `image:` 경로를 확인하세요.

```bash
cd api1-library
oc apply -f openshift/imagestream.yaml
oc apply -f openshift/deployment.yaml
oc apply -f openshift/service.yaml
oc apply -f openshift/route.yaml
```

#### 4. 배포 확인

```bash
# Pod 상태 확인
oc get pods -n sample-apis -l app=library-api

# Route URL 확인
oc get route library-api -n sample-apis

# Health check
curl https://$(oc get route library-api -n sample-apis \
  --template='{{ .spec.host }}')/health
```

#### 5. 로그 확인

```bash
oc logs -l app=library-api -n sample-apis --follow
```

#### OpenShift 매니페스트 구조

```
openshift/
├── imagestream.yaml   ← 이미지 스트림 (내부 레지스트리 참조)
├── deployment.yaml    ← Deployment (replicas=2, 헬스체크, non-root)
├── service.yaml       ← ClusterIP Service (port 3000)
└── route.yaml         ← Route (TLS edge, HTTPS → HTTP)
```

---

### 시나리오 B — Kubernetes 배포

#### 사전 요건
- `kubectl` CLI 설치 및 클러스터 연결 완료
- Container Registry 접근 권한 (Docker Hub, GHCR, ECR 등)
- nginx Ingress Controller 설치 (HTTP 외부 노출 시)
- `sample-apis` 네임스페이스 생성

#### OpenShift와의 주요 차이점

| 항목 | OpenShift | Kubernetes |
|------|-----------|-----------|
| 외부 노출 | `Route` (자동 TLS) | `Ingress` (Ingress Controller 필요) |
| 이미지 관리 | `ImageStream` | 레지스트리 직접 참조 |
| 이미지 빌드 | `oc new-build` | 로컬/CI 빌드 후 push |
| 네임스페이스 생성 | `oc new-project` | `kubectl create namespace` |
| 보안 정책 | SCC (Security Context Constraints) | PodSecurityAdmission |

#### 1. 네임스페이스 생성

```bash
kubectl apply -f kubernetes/namespace.yaml
# 또는
kubectl create namespace sample-apis
```

#### 2. 컨테이너 이미지 빌드 & Push

```bash
cd api1-library

# Docker 빌드
docker build -t your-registry.example.com/sample-apis/library-api:latest .
docker push your-registry.example.com/sample-apis/library-api:latest

# Podman 빌드
podman build -t your-registry.example.com/sample-apis/library-api:latest .
podman push your-registry.example.com/sample-apis/library-api:latest
```

#### 3. (선택) 프라이빗 레지스트리 인증 Secret 생성

```bash
kubectl create secret docker-registry registry-credentials \
  --docker-server=your-registry.example.com \
  --docker-username=<username> \
  --docker-password=<password> \
  -n sample-apis
```

[`kubernetes/deployment.yaml`](kubernetes/deployment.yaml) 의 `imagePullSecrets` 주석을 해제하세요.

#### 4. 매니페스트 적용

> 배포 전 [`kubernetes/deployment.yaml`](kubernetes/deployment.yaml) 의 `image:` 경로를 실제 레지스트리로 교체하세요.

```bash
cd api1-library
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

#### 5. nginx Ingress Controller 설치 (미설치 시)

```bash
# 클라우드 환경 (LoadBalancer 지원)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml

# 베어메탈 / 온프레미스
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/baremetal/deploy.yaml
```

#### 6. 배포 확인

```bash
# Pod 상태 확인
kubectl get pods -n sample-apis -l app=library-api

# Service 확인
kubectl get svc -n sample-apis

# Ingress 확인 (ADDRESS가 할당될 때까지 대기)
kubectl get ingress -n sample-apis

# Health check (도메인 설정 전 포트 포워딩으로 테스트)
kubectl port-forward svc/library-api 3000:3000 -n sample-apis
curl http://localhost:3000/health
```

#### 7. Ingress host 설정

[`kubernetes/ingress.yaml`](kubernetes/ingress.yaml) 의 `host:` 값을 실제 도메인으로 변경하세요:

```yaml
# 변경 전
host: library-api.your-cluster.example.com
# 변경 후 (예시)
host: library-api.k8s.corp.com
```

도메인 없이 테스트 시 `/etc/hosts` 에 Ingress IP를 등록하세요:

```bash
# Ingress 외부 IP 확인
kubectl get ingress library-api -n sample-apis -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# /etc/hosts 등록 예시
echo "<INGRESS_IP>  library-api.your-cluster.example.com" | sudo tee -a /etc/hosts
```

#### 8. 로그 확인

```bash
kubectl logs -l app=library-api -n sample-apis --follow
```

#### Kubernetes 매니페스트 구조

```
kubernetes/
├── namespace.yaml    ← Namespace (sample-apis)
├── deployment.yaml   ← Deployment (replicas=2, 헬스체크, non-root)
├── service.yaml      ← ClusterIP Service (port 3000)
└── ingress.yaml      ← Ingress (nginx, TLS 선택적)
```

---

### 시나리오 C — Linux VM 배포

#### 사전 요건
- RHEL 8/9, Rocky Linux 8/9, Ubuntu 22.04 LTS
- sudo 또는 root 권한
- 외부 인터넷 연결 (Node.js 설치 필요 시)

#### 1. 소스 전송

```bash
# VM으로 소스 복사 (bastion 또는 직접 SCP)
scp -r ./api1-library user@<VM_IP>:/tmp/api1-library
ssh user@<VM_IP>
```

#### 2. 설치 스크립트 실행

```bash
cd /tmp/api1-library
chmod +x deploy/vm/install.sh
sudo ./deploy/vm/install.sh
```

설치 스크립트가 자동으로 수행하는 작업:
1. Node.js 20 LTS 설치 (없는 경우)
2. `svcapi` 서비스 계정 생성
3. `/opt/sample-apis/api1-library` 에 애플리케이션 배포
4. `/etc/sample-apis/library-api.env` 환경변수 파일 생성
5. systemd 서비스 등록 및 자동 시작 설정

#### 3. 수동 설치 (스크립트 없이)

```bash
# 1. Node.js 설치 (RHEL/Rocky)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 2. 서비스 계정 생성
sudo useradd --system --no-create-home --shell /sbin/nologin svcapi

# 3. 파일 배포
sudo mkdir -p /opt/sample-apis/api1-library
sudo cp -r src package*.json /opt/sample-apis/api1-library/
cd /opt/sample-apis/api1-library && sudo npm ci --omit=dev
sudo chown -R svcapi:svcapi /opt/sample-apis/api1-library

# 4. 환경변수 파일
sudo mkdir -p /etc/sample-apis
sudo cp deploy/vm/library-api.env /etc/sample-apis/library-api.env
sudo chown root:svcapi /etc/sample-apis/library-api.env
sudo chmod 640 /etc/sample-apis/library-api.env

# 5. systemd 서비스 등록
sudo cp deploy/vm/library-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now library-api
```

#### 4. 서비스 관리

```bash
# 상태 확인
sudo systemctl status library-api

# 로그 실시간 확인
journalctl -u library-api -f

# 재시작
sudo systemctl restart library-api

# 중지
sudo systemctl stop library-api
```

#### 5. 방화벽 설정

```bash
# RHEL/Rocky (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Ubuntu (ufw)
sudo ufw allow 3000/tcp
```

#### 6. API Connect 에서 연결

IBM API Connect (OVA VM)에서 이 API를 등록할 때 Backend URL:

```
http://<VM_IP>:3000
```

> **TIP:** API Connect와 동일 네트워크 세그먼트에 있는 경우 VM의 내부 IP를 사용하세요.
> 방화벽/보안그룹에서 API Connect VM → 이 VM의 3000 포트 허용이 필요합니다.

#### VM 배포 파일 구조

```
deploy/vm/
├── install.sh          ← 자동 설치 스크립트 (RHEL/Rocky/Ubuntu)
├── library-api.service ← systemd 서비스 유닛 파일
└── library-api.env     ← 환경변수 템플릿
```

---

## 에러 코드

| HTTP Status | 의미 |
|-------------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (필수 필드 누락) |
| 404 | 리소스를 찾을 수 없음 |
| 409 | 충돌 (중복 ISBN, 대출 중인 도서 삭제 시도 등) |
| 500 | 서버 내부 오류 |
