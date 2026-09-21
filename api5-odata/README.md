# 🛍️ API 5 — OData 4.0 Product Catalog API

> **IBM API Connect 등록용 샘플 OData 4.0 API**  
> Node.js + Express 기반의 제품 카탈로그 API — OData 핵심 쿼리 옵션 시연

---

## 개요

| 항목 | 내용 |
|------|------|
| 런타임 | Node.js 18+ |
| 프레임워크 | Express 4 |
| 포트 | 3003 (기본값) |
| 인증 | 없음 (공개 API 시연용) |
| 데이터 저장 | In-memory (재시작 시 초기화) |
| OData 버전 | OData 4.0 |
| CSDL 메타데이터 | `GET /$metadata` (EDMX 4.0 XML) |
| 서비스 문서 | `GET /` (`application/json`) |
| 표준 헤더 | `OData-Version: 4.0`, `OData-MaxVersion: 4.0` |

---

## OData 4.0 지원 기능

| 쿼리 옵션 | 설명 | 예시 |
|-----------|------|------|
| `$filter` | 조건 필터링 | `$filter=price lt 100` |
| `$select` | 반환 필드 선택 | `$select=id,name,price` |
| `$orderby` | 정렬 | `$orderby=price desc` |
| `$top` | 최대 반환 개수 | `$top=5` |
| `$skip` | 건너뛸 항목 수 | `$skip=10` |
| `$count` | 총 건수 포함 | `$count=true` |
| `$expand` | 연관 엔티티 인라인 | `$expand=Category` |
| `/$count` | 엔티티 셋 카운트 | `/Products/$count` |
| `/$metadata` | CSDL XML 문서 | `/$metadata` |

### $filter 지원 연산자

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `eq` | 같음 | `categoryId eq 1` |
| `ne` | 다름 | `discontinued ne true` |
| `gt` | 초과 | `price gt 100` |
| `ge` | 이상 | `rating ge 4.0` |
| `lt` | 미만 | `stock lt 10` |
| `le` | 이하 | `price le 50` |
| `and` | AND 조건 | `price ge 50 and price le 200` |
| `or` | OR 조건 | `categoryId eq 1 or categoryId eq 2` |
| `contains()` | 포함 | `contains(name,'Pro')` |
| `startswith()` | 시작 | `startswith(name,'Wire')` |
| `endswith()` | 끝 | `endswith(name,'Kit')` |

---

## 빠른 시작

```bash
cd api5-odata
npm install
npm start
# 또는 개발 모드
npm run dev
```

서버가 시작되면 `http://localhost:3003` 에서 OData 서비스 문서를 확인할 수 있습니다.

---

## 엔드포인트

### 🔧 Service / Metadata

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/` | OData 서비스 문서 (엔티티 셋 목록) |
| `GET` | `/$metadata` | CSDL XML 메타데이터 문서 |
| `GET` | `/health` | 서버 헬스체크 |

### 📦 Products

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/Products` | 제품 목록 (OData 쿼리 옵션 지원) |
| `GET` | `/Products/{id}` | 제품 단건 조회 |
| `POST` | `/Products` | 제품 생성 |
| `PATCH` | `/Products/{id}` | 제품 부분 수정 |
| `PUT` | `/Products/{id}` | 제품 전체 교체 |
| `DELETE` | `/Products/{id}` | 제품 삭제 |
| `GET` | `/Products/$count` | 제품 수 조회 |

### 📂 Categories

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/Categories` | 카테고리 목록 (OData 쿼리 옵션 지원) |
| `GET` | `/Categories/{id}` | 카테고리 단건 조회 |
| `POST` | `/Categories` | 카테고리 생성 |
| `PATCH` | `/Categories/{id}` | 카테고리 부분 수정 |
| `DELETE` | `/Categories/{id}` | 카테고리 삭제 |
| `GET` | `/Categories/$count` | 카테고리 수 조회 |
| `GET` | `/Categories/{id}/Products` | 카테고리별 제품 목록 (네비게이션 프로퍼티) |

---

## 요청/응답 예시

> 📖 **더 많은 예시는 [EXAMPLES.md](EXAMPLES.md) 를 참고하세요.**

### OData 서비스 문서

```bash
curl http://localhost:3003/
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata",
  "value": [
    { "name": "Products",   "kind": "EntitySet", "url": "Products"   },
    { "name": "Categories", "kind": "EntitySet", "url": "Categories" }
  ]
}
```

### 제품 목록 — $filter + $orderby + $top

```bash
curl "http://localhost:3003/Products?\$filter=categoryId%20eq%201%20and%20discontinued%20eq%20false&\$orderby=price%20asc&\$top=3"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 2, "name": "USB-C Laptop Charger", "price": 49.99, "categoryId": 1 },
    { "id": 10, "name": "Mechanical Keyboard",  "price": 109.99, "categoryId": 1 },
    { "id": 1, "name": "Wireless Bluetooth Headphones", "price": 249.99, "categoryId": 1 }
  ]
}
```

### 카테고리 + 제품 인라인 ($expand)

```bash
curl "http://localhost:3003/Categories/2?\$expand=Products"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Categories/$entity",
  "@odata.id": "http://localhost:3003/Categories(2)",
  "id": 2,
  "name": "Books",
  "description": "Physical and digital books",
  "Products": [
    { "id": 4, "name": "Clean Code", "price": 39.99, "stock": 200 },
    { "id": 5, "name": "The Pragmatic Programmer", "price": 44.99, "stock": 150 }
  ]
}
```

### 페이징 ($top + $skip + $count)

```bash
curl "http://localhost:3003/Products?\$top=3&\$skip=0&\$count=true"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "@odata.count": 10,
  "value": [...]
}
```

---

## 데이터 모델

### Product

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | integer | 고유 키 (자동 생성) |
| `name` | string | 제품명 |
| `description` | string | 제품 설명 |
| `price` | decimal | 가격 (USD) |
| `stock` | integer | 재고 수량 |
| `rating` | decimal | 평점 (1.0–5.0) |
| `categoryId` | integer | 카테고리 외래키 |
| `createdAt` | DateTimeOffset | 생성 일시 |
| `discontinued` | boolean | 단종 여부 |

### Category

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | integer | 고유 키 (자동 생성) |
| `name` | string | 카테고리명 |
| `description` | string | 카테고리 설명 |

### 네비게이션 프로퍼티

| 관계 | 설명 |
|------|------|
| `Product → Category` | `$expand=Category` 또는 `/Products(1)?$expand=Category` |
| `Category → Products` | `$expand=Products` 또는 `/Categories(1)/Products` |

---

## OData 4.0 CSDL 메타데이터 및 명세서

이 API는 OASIS OData 4.0 표준 프로토콜을 완벽하게 준수하며, 다음 두 가지 형식의 명세를 제공합니다.

- **EDMX CSDL XML 메타데이터**: [`src/odata/metadata.js`](./src/odata/metadata.js) (`GET /$metadata`)
- **OpenAPI 3.0.3 명세서**: [`openapi.yaml`](./openapi.yaml)

### 메타데이터 구조 (EDMX 4.0)

1. **Entity Types & Keys**:
   - `Product` (Key: `id` [Edm.Int32]) — `name`, `price`, `stock`, `rating`, `categoryId`, `createdAt`, `discontinued`
   - `Category` (Key: `id` [Edm.Int32]) — `name`, `description`
2. **Navigation Properties & Constraints**:
   - `Product.Category` ↔ `Category.Products` (1:N 양방향 관계, `categoryId` 외래키 제약조건)
3. **Entity Container**:
   - `DefaultContainer` 내 `Products`, `Categories` EntitySet 및 `Capabilities` 필터/정렬 어노테이션 정의

---

## IBM API Connect 등록 가이드

1. `GET /` 또는 `GET /health` 로 API 연결 확인
2. `GET /$metadata` 로 OData CSDL XML 스키마 확인
3. **Gateway 등록 방식**:
   - **webMethods API Gateway**: 네이티브 OData 지원을 통해 `/$metadata` URL 또는 EDMX 파일 직접 임포트
   - **DataPower API Gateway / Nano Gateway**: `openapi.yaml` 파일을 통해 REST 프록시 API로 등록 및 어셈블리 정책 연동
4. `$` 가 포함된 OData 쿼리 파라미터는 URL 인코딩 필요: `%24filter`, `%24select` 등
5. API Connect의 Assembly에서 `invoke` 정책으로 이 API를 백엔드로 연결 가능

---

## 에러 코드

모든 에러는 OData 4.0 형식으로 반환됩니다:

```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "No Product with id 99",
    "target": "Products(99)"
  }
}
```

| HTTP Status | 코드 | 의미 |
|-------------|------|------|
| 400 | `BadRequest` | 필수 필드 누락 또는 키 변경 시도 |
| 404 | `ResourceNotFound` | 리소스를 찾을 수 없음 |
| 409 | `Conflict` | 중복 이름 또는 연결된 리소스 존재 |
| 500 | `InternalServerError` | 서버 내부 오류 |

---

## 배포 가이드

### 배포 시나리오 선택

```
시나리오 A — OpenShift 배포 (IBM API Connect on OCP)
시나리오 B — Kubernetes 배포 (표준 K8s 클러스터)
시나리오 C — Linux VM 배포 (IBM API Connect OVA)
```

### 시나리오 A — OpenShift 배포

```bash
oc new-project sample-apis

# 이미지 빌드
oc new-build --name=odata-api --binary=true --strategy=docker -n sample-apis
oc start-build odata-api --from-dir=. --follow -n sample-apis

# 매니페스트 적용
oc apply -f openshift/imagestream.yaml
oc apply -f openshift/deployment.yaml
oc apply -f openshift/service.yaml
oc apply -f openshift/route.yaml

# 확인
oc get route odata-api -n sample-apis
curl https://$(oc get route odata-api -n sample-apis --template='{{ .spec.host }}')/health
```

### 시나리오 B — Kubernetes 배포

```bash
kubectl apply -f kubernetes/namespace.yaml

# 이미지 빌드 & Push
docker build -t your-registry.example.com/sample-apis/odata-api:latest .
docker push your-registry.example.com/sample-apis/odata-api:latest

# 매니페스트 적용
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml

# 확인
kubectl port-forward svc/odata-api 3003:3003 -n sample-apis
curl http://localhost:3003/health
```

### 시나리오 C — Linux VM 배포

```bash
scp -r ./api5-odata user@<VM_IP>:/tmp/api5-odata
ssh user@<VM_IP>
cd /tmp/api5-odata
chmod +x deploy/vm/install.sh
sudo ./deploy/vm/install.sh

# 확인
curl http://localhost:3003/health
```
