# 🛍️ OData Product Catalog API — 상세 사용 예시

> 서버가 `http://localhost:3003` 에서 실행 중인 것을 전제합니다.  
> OData 쿼리 옵션의 `$` 는 셸에서 이스케이프가 필요합니다 (`\$` 또는 따옴표 사용).

---

## 목차

1. [Service Document & Metadata](#1-service-document--metadata)
2. [Health Check](#2-health-check)
3. [Products — 목록 조회 ($filter)](#3-products--목록-조회-filter)
4. [Products — $orderby 정렬](#4-products--orderby-정렬)
5. [Products — $top / $skip 페이징](#5-products--top--skip-페이징)
6. [Products — $select 필드 선택](#6-products--select-필드-선택)
7. [Products — $expand 카테고리 인라인](#7-products--expand-카테고리-인라인)
8. [Products — $count](#8-products--count)
9. [Products — 단건 조회](#9-products--단건-조회)
10. [Products — 생성 (POST)](#10-products--생성-post)
11. [Products — 부분 수정 (PATCH)](#11-products--부분-수정-patch)
12. [Products — 전체 교체 (PUT)](#12-products--전체-교체-put)
13. [Products — 삭제 (DELETE)](#13-products--삭제-delete)
14. [Categories — 목록 조회](#14-categories--목록-조회)
15. [Categories — 네비게이션 프로퍼티 (/$count, /Products)](#15-categories--네비게이션-프로퍼티)
16. [복합 쿼리 조합 예시](#16-복합-쿼리-조합-예시)
17. [에러 케이스 모음](#17-에러-케이스-모음)

---

## 1. Service Document & Metadata

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

### OData $metadata (CSDL XML)

```bash
curl http://localhost:3003/\$metadata
```

```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" ...>
  <edmx:DataServices>
    <Schema Namespace="ProductCatalog" ...>
      <EntityType Name="Product">
        <Key><PropertyRef Name="id"/></Key>
        <Property Name="id"    Type="Edm.Int32"  Nullable="false"/>
        <Property Name="name"  Type="Edm.String" Nullable="false"/>
        <Property Name="price" Type="Edm.Decimal"/>
        ...
      </EntityType>
      ...
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>
```

---

## 2. Health Check

```bash
curl http://localhost:3003/health
```

```json
{
  "status": "ok",
  "timestamp": "2024-11-15T09:00:00.000Z"
}
```

---

## 3. Products — 목록 조회 ($filter)

### 3-1. 전체 목록

```bash
curl http://localhost:3003/Products
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    {
      "id": 1,
      "name": "Wireless Bluetooth Headphones",
      "description": "Over-ear headphones with active noise cancellation",
      "price": 249.99,
      "stock": 120,
      "rating": 4.5,
      "categoryId": 1,
      "createdAt": "2024-01-10T08:00:00Z",
      "discontinued": false
    }
  ]
}
```

### 3-2. categoryId eq 1 (Electronics 제품만)

```bash
curl "http://localhost:3003/Products?\$filter=categoryId%20eq%201"
```

### 3-3. price lt 50 (50달러 미만)

```bash
curl "http://localhost:3003/Products?\$filter=price%20lt%2050"
```

### 3-4. 가격 범위 필터 (AND 조건)

```bash
curl "http://localhost:3003/Products?\$filter=price%20ge%2050%20and%20price%20le%20200"
```

### 3-5. 판매 중인 제품 (stock > 0, discontinued = false)

```bash
curl "http://localhost:3003/Products?\$filter=stock%20gt%200%20and%20discontinued%20eq%20false"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 1, "name": "Wireless Bluetooth Headphones", "price": 249.99, "stock": 120, "discontinued": false },
    { "id": 2, "name": "USB-C Laptop Charger",          "price": 49.99,  "stock": 350, "discontinued": false }
  ]
}
```

### 3-6. contains — 이름에 'Pro' 포함

```bash
curl "http://localhost:3003/Products?\$filter=contains(name,'Pro')"
```

### 3-7. startswith — 이름이 'Wire'로 시작

```bash
curl "http://localhost:3003/Products?\$filter=startswith(name,'Wire')"
```

### 3-8. OR 조건 — Electronics 또는 Books

```bash
curl "http://localhost:3003/Products?\$filter=categoryId%20eq%201%20or%20categoryId%20eq%202"
```

### 3-9. 평점 4.5 초과 제품

```bash
curl "http://localhost:3003/Products?\$filter=rating%20gt%204.5"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 3, "name": "4K Smart TV 55\"",          "rating": 4.7, "price": 699.99 },
    { "id": 5, "name": "The Pragmatic Programmer",  "rating": 4.9, "price": 44.99  },
    { "id": 4, "name": "Clean Code",                "rating": 4.8, "price": 39.99  }
  ]
}
```

---

## 4. Products — $orderby 정렬

### 4-1. 가격 오름차순

```bash
curl "http://localhost:3003/Products?\$orderby=price%20asc"
```

### 4-2. 평점 내림차순

```bash
curl "http://localhost:3003/Products?\$orderby=rating%20desc"
```

### 4-3. 복수 필드 정렬 (평점 내림차순, 이름 오름차순)

```bash
curl "http://localhost:3003/Products?\$orderby=rating%20desc,name%20asc"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 5, "name": "The Pragmatic Programmer", "rating": 4.9 },
    { "id": 4, "name": "Clean Code",               "rating": 4.8 },
    { "id": 3, "name": "4K Smart TV 55\"",         "rating": 4.7 }
  ]
}
```

---

## 5. Products — $top / $skip 페이징

### 5-1. 첫 번째 페이지 (5개씩)

```bash
curl "http://localhost:3003/Products?\$top=5&\$skip=0&\$count=true"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "@odata.count": 10,
  "value": [
    { "id": 1, "name": "Wireless Bluetooth Headphones", "price": 249.99 },
    { "id": 2, "name": "USB-C Laptop Charger",          "price": 49.99  },
    { "id": 3, "name": "4K Smart TV 55\"",              "price": 699.99 },
    { "id": 4, "name": "Clean Code",                    "price": 39.99  },
    { "id": 5, "name": "The Pragmatic Programmer",      "price": 44.99  }
  ]
}
```

### 5-2. 두 번째 페이지

```bash
curl "http://localhost:3003/Products?\$top=5&\$skip=5&\$count=true"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "@odata.count": 10,
  "value": [
    { "id": 6,  "name": "Running Shoes Pro",    "price": 129.99 },
    { "id": 7,  "name": "Yoga Mat Premium",     "price": 34.99  },
    { "id": 8,  "name": "Smart Coffee Maker",   "price": 89.99  },
    { "id": 9,  "name": "Winter Parka Jacket",  "price": 189.99 },
    { "id": 10, "name": "Mechanical Keyboard",  "price": 109.99 }
  ]
}
```

---

## 6. Products — $select 필드 선택

### 6-1. id, name, price 만 반환

```bash
curl "http://localhost:3003/Products?\$select=id,name,price"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 1, "name": "Wireless Bluetooth Headphones", "price": 249.99 },
    { "id": 2, "name": "USB-C Laptop Charger",          "price": 49.99  }
  ]
}
```

### 6-2. $filter + $select 조합

```bash
curl "http://localhost:3003/Products?\$filter=categoryId%20eq%202&\$select=id,name,price,rating"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 4, "name": "Clean Code",               "price": 39.99, "rating": 4.8 },
    { "id": 5, "name": "The Pragmatic Programmer",  "price": 44.99, "rating": 4.9 }
  ]
}
```

---

## 7. Products — $expand 카테고리 인라인

### 7-1. 전체 목록 + Category 인라인

```bash
curl "http://localhost:3003/Products?\$expand=Category"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    {
      "id": 1,
      "name": "Wireless Bluetooth Headphones",
      "price": 249.99,
      "categoryId": 1,
      "discontinued": false,
      "Category": {
        "id": 1,
        "name": "Electronics",
        "description": "Electronic devices and accessories"
      }
    }
  ]
}
```

### 7-2. 단건 + $expand=Category

```bash
curl "http://localhost:3003/Products/4?\$expand=Category"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products/$entity",
  "@odata.id": "http://localhost:3003/Products(4)",
  "id": 4,
  "name": "Clean Code",
  "price": 39.99,
  "categoryId": 2,
  "Category": {
    "id": 2,
    "name": "Books",
    "description": "Physical and digital books"
  }
}
```

---

## 8. Products — $count

### 8-1. 전체 제품 수

```bash
curl http://localhost:3003/Products/\$count
```

```
10
```

### 8-2. 필터 적용 후 제품 수

```bash
curl "http://localhost:3003/Products/\$count?\$filter=categoryId%20eq%201"
```

```
4
```

### 8-3. $count=true — 응답 본문 내 포함

```bash
curl "http://localhost:3003/Products?\$filter=discontinued%20eq%20false&\$count=true&\$top=3"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "@odata.count": 9,
  "value": [...]
}
```

---

## 9. Products — 단건 조회

### 기본 조회

```bash
curl http://localhost:3003/Products/1
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products/$entity",
  "@odata.id": "http://localhost:3003/Products(1)",
  "id": 1,
  "name": "Wireless Bluetooth Headphones",
  "description": "Over-ear headphones with active noise cancellation",
  "price": 249.99,
  "stock": 120,
  "rating": 4.5,
  "categoryId": 1,
  "createdAt": "2024-01-10T08:00:00Z",
  "discontinued": false
}
```

---

## 10. Products — 생성 (POST)

```bash
curl -X POST http://localhost:3003/Products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Mouse",
    "description": "Ergonomic wireless mouse with silent click",
    "price": 29.99,
    "stock": 200,
    "rating": 4.3,
    "categoryId": 1,
    "discontinued": false
  }'
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products/$entity",
  "@odata.id": "http://localhost:3003/Products(11)",
  "id": 11,
  "name": "Wireless Mouse",
  "description": "Ergonomic wireless mouse with silent click",
  "price": 29.99,
  "stock": 200,
  "rating": 4.3,
  "categoryId": 1,
  "createdAt": "2024-11-15T09:00:00.000Z",
  "discontinued": false
}
```

응답 헤더에 `Location: http://localhost:3003/Products(11)` 포함.

---

## 11. Products — 부분 수정 (PATCH)

### 가격 변경

```bash
curl -X PATCH http://localhost:3003/Products/1 \
  -H "Content-Type: application/json" \
  -d '{ "price": 219.99 }'
```

응답: `204 No Content`

### 단종 처리

```bash
curl -X PATCH http://localhost:3003/Products/9 \
  -H "Content-Type: application/json" \
  -d '{ "discontinued": true, "stock": 0 }'
```

응답: `204 No Content`

### 재고 보충

```bash
curl -X PATCH http://localhost:3003/Products/3 \
  -H "Content-Type: application/json" \
  -d '{ "stock": 15 }'
```

응답: `204 No Content`

---

## 12. Products — 전체 교체 (PUT)

```bash
curl -X PUT http://localhost:3003/Products/10 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mechanical Keyboard TKL (2nd Gen)",
    "description": "TKL mechanical keyboard with RGB and red switches",
    "price": 119.99,
    "stock": 80,
    "rating": 4.7,
    "categoryId": 1,
    "discontinued": false
  }'
```

응답: `204 No Content`

---

## 13. Products — 삭제 (DELETE)

```bash
curl -X DELETE http://localhost:3003/Products/11
```

응답: `204 No Content`

---

## 14. Categories — 목록 조회

### 전체 카테고리

```bash
curl http://localhost:3003/Categories
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Categories",
  "value": [
    { "id": 1, "name": "Electronics",   "description": "Electronic devices and accessories" },
    { "id": 2, "name": "Books",         "description": "Physical and digital books" },
    { "id": 3, "name": "Clothing",      "description": "Apparel and accessories" },
    { "id": 4, "name": "Home & Garden", "description": "Home appliances and garden supplies" },
    { "id": 5, "name": "Sports",        "description": "Sports equipment and outdoor gear" }
  ]
}
```

### $expand=Products — 제품 목록 인라인

```bash
curl "http://localhost:3003/Categories?\$expand=Products"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Categories",
  "value": [
    {
      "id": 2,
      "name": "Books",
      "description": "Physical and digital books",
      "Products": [
        { "id": 4, "name": "Clean Code",               "price": 39.99, "stock": 200 },
        { "id": 5, "name": "The Pragmatic Programmer",  "price": 44.99, "stock": 150 }
      ]
    }
  ]
}
```

---

## 15. Categories — 네비게이션 프로퍼티

### 카테고리별 제품 목록

```bash
curl http://localhost:3003/Categories/1/Products
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Categories(1)/Products",
  "value": [
    { "id": 1,  "name": "Wireless Bluetooth Headphones", "price": 249.99 },
    { "id": 2,  "name": "USB-C Laptop Charger",          "price": 49.99  },
    { "id": 3,  "name": "4K Smart TV 55\"",              "price": 699.99 },
    { "id": 10, "name": "Mechanical Keyboard",           "price": 109.99 }
  ]
}
```

### 카테고리별 제품 수

```bash
curl http://localhost:3003/Categories/\$count
```

```
5
```

---

## 16. 복합 쿼리 조합 예시

### Electronics 카테고리에서 100달러 미만, 평점 순 정렬, 상위 3개

```bash
curl "http://localhost:3003/Products?\$filter=categoryId%20eq%201%20and%20price%20lt%20100&\$orderby=rating%20desc&\$top=3&\$select=id,name,price,rating"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 2,  "name": "USB-C Laptop Charger", "price": 49.99,  "rating": 4.2 }
  ]
}
```

### 재고 있는 Sports 제품 — 이름과 가격만, 가격 오름차순

```bash
curl "http://localhost:3003/Products?\$filter=categoryId%20eq%205%20and%20stock%20gt%200&\$orderby=price%20asc&\$select=id,name,price,stock"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "value": [
    { "id": 7, "name": "Yoga Mat Premium", "price": 34.99,  "stock": 220 },
    { "id": 6, "name": "Running Shoes Pro", "price": 129.99, "stock": 80  }
  ]
}
```

### 2페이지 (3개씩) — 총 건수 포함 + Category 확장

```bash
curl "http://localhost:3003/Products?\$top=3&\$skip=3&\$count=true&\$expand=Category&\$orderby=id%20asc"
```

```json
{
  "@odata.context": "http://localhost:3003/$metadata#Products",
  "@odata.count": 10,
  "value": [
    {
      "id": 4, "name": "Clean Code", "price": 39.99,
      "Category": { "id": 2, "name": "Books" }
    },
    {
      "id": 5, "name": "The Pragmatic Programmer", "price": 44.99,
      "Category": { "id": 2, "name": "Books" }
    },
    {
      "id": 6, "name": "Running Shoes Pro", "price": 129.99,
      "Category": { "id": 5, "name": "Sports" }
    }
  ]
}
```

---

## 17. 에러 케이스 모음

### 존재하지 않는 제품 조회

```bash
curl http://localhost:3003/Products/999
```

```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "No Product with id 999",
    "target": "Products(999)"
  }
}
```

### 필수 필드 누락 (POST)

```bash
curl -X POST http://localhost:3003/Products \
  -H "Content-Type: application/json" \
  -d '{ "name": "Incomplete Product" }'
```

```json
{
  "error": {
    "code": "BadRequest",
    "message": "name, price, and categoryId are required fields"
  }
}
```

### 존재하지 않는 카테고리로 제품 생성

```bash
curl -X POST http://localhost:3003/Products \
  -H "Content-Type: application/json" \
  -d '{ "name": "Test", "price": 9.99, "categoryId": 999 }'
```

```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "No Category with id 999",
    "target": "Categories(999)"
  }
}
```

### 연결된 제품이 있는 카테고리 삭제

```bash
curl -X DELETE http://localhost:3003/Categories/1
```

```json
{
  "error": {
    "code": "Conflict",
    "message": "Cannot delete a Category that has associated Products",
    "linkedProducts": 4
  }
}
```

### 중복 카테고리 이름으로 생성

```bash
curl -X POST http://localhost:3003/Categories \
  -H "Content-Type: application/json" \
  -d '{ "name": "Electronics" }'
```

```json
{
  "error": {
    "code": "Conflict",
    "message": "A Category with this name already exists",
    "name": "Electronics"
  }
}
```

### 키 변경 시도 (PATCH)

```bash
curl -X PATCH http://localhost:3003/Products/1 \
  -H "Content-Type: application/json" \
  -d '{ "id": 999, "price": 199.99 }'
```

```json
{
  "error": {
    "code": "BadRequest",
    "message": "Cannot modify the entity key (id)"
  }
}
```
