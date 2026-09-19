"""
Salary Management API — entry point.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.security import KEYCLOAK_ISSUER, KEYCLOAK_AUDIENCE, TOKEN_HEADER_NAME
from app.routers import auth, salaries, obo

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Salary Management API",
    version="2.0.0",
    description=f"""
## Overview
연봉 정보를 관리하는 RBAC(역할 기반 접근제어) REST API입니다.  
**IBM API Connect** 샘플로 설계되었으며, 외부 IdP **Keycloak** 과의 OAuth2/OIDC 연동 및
API Connect Outbound 토큰 전달 패턴을 시연합니다.

---

## 인증 흐름 (Keycloak + API Connect)

```
┌──────────┐   ①토큰요청   ┌───────────┐   ②Access Token   ┌──────────────┐
│  Client  │ ────────────► │ Keycloak  │ ────────────────► │   Client     │
└──────────┘               └───────────┘                   └──────┬───────┘
                                                                   │③ API 호출
                                                                   ▼
                                                          ┌──────────────────┐
                                                          │   API Connect    │
                                                          │  (OCP or OVA)    │
                                                          └────────┬─────────┘
                                                                   │④ Outbound 토큰
                                                                   │  헤더에 담아 전달
                                                                   ▼
                                                          ┌──────────────────┐
                                                          │  Salary API      │
                                                          │  (이 서비스)     │
                                                          │                  │
                                                          │  ⑤ JWKS 검증     │
                                                          │  ────────────►  │◄── Keycloak
                                                          │                  │    JWKS
                                                          └──────────────────┘
```

① 클라이언트가 Keycloak에 Access Token 요청  
② Keycloak이 RS256 서명된 JWT 발급 (`realm_access.roles`, `department` 클레임 포함)  
③ 클라이언트가 API Connect에 Bearer Token으로 API 호출  
④ API Connect가 정책 처리 후 **Outbound 토큰을 헤더에 그대로 전달**  
⑤ Salary API가 Keycloak JWKS로 토큰 서명을 **직접 재검증** → 역할/팀 기반 권한 판단

---

## 역할 & 권한 매트릭스

| Role       | Read              | Update            | Delete    |
|------------|-------------------|-------------------|-----------|
| employee   | 본인 레코드만     | 본인 레코드만     | ✗         |
| manager    | 소속 팀 전체      | 소속 팀 전체      | ✗         |
| hr\\_system | 전체              | 전체              | ✓ (전체)  |

---

## Keycloak 토큰 클레임 매핑

| Keycloak 클레임 | 이 API 필드 | 설명 |
|----------------|------------|------|
| `sub` | `id` | 사용자 고유 ID (연봉 레코드 매핑 키) |
| `preferred_username` | `username` | 사용자명 |
| `realm_access.roles` | `role` | employee / manager / hr\\_system |
| `department` | `team` | Keycloak User Attribute → Token Claim Mapper |

---

## 현재 설정

| 항목 | 값 |
|------|----|
| Keycloak Issuer | `{KEYCLOAK_ISSUER}` |
| Keycloak Audience | `{KEYCLOAK_AUDIENCE}` |
| Token Header | `{TOKEN_HEADER_NAME}` |

> 설정 변경: 환경변수 `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_AUDIENCE`, `TOKEN_HEADER_NAME`

---

## API 사용 방법

1. Keycloak에서 Access Token 발급 (`POST /realms/{{realm}}/protocol/openid-connect/token`)
2. 발급된 토큰을 헤더에 포함:  
   `{TOKEN_HEADER_NAME}: Bearer <access_token>`
3. `/auth/me` 로 토큰 검증 및 사용자 정보 확인
4. `/salaries/me` 로 본인 연봉 조회
""",
    contact={
        "name": "IBM API Connect Sample",
        "url": "https://www.ibm.com/products/api-connect",
    },
    license_info={"name": "MIT"},
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(salaries.router)
app.include_router(obo.router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "Salary Management API",
        "version": "2.0.0",
        "auth_mode": "Keycloak External IdP (JWKS)",
        "keycloak_issuer": KEYCLOAK_ISSUER,
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
    }


@app.get("/health", tags=["Health"])
async def health():
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "keycloak_issuer": KEYCLOAK_ISSUER,
    }
