"""
Auth router — Keycloak 연동 진단/정보 엔드포인트.

자체 토큰 발급 기능 없음.
토큰 발급은 Keycloak이 담당합니다.

엔드포인트:
  GET  /auth/me          → 현재 토큰의 사용자 정보 반환 (토큰 검증 포함)
  GET  /auth/jwks-status → Keycloak JWKS 연결 상태 확인
  POST /auth/jwks-refresh → JWKS 캐시 강제 갱신 (키 롤오버 시 사용)
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth.security import (
    get_current_user,
    fetch_jwks,
    invalidate_jwks_cache,
    KEYCLOAK_ISSUER,
    KEYCLOAK_JWKS_URL,
    KEYCLOAK_AUDIENCE,
    TOKEN_HEADER_NAME,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class AuthConfig(BaseModel):
    keycloak_issuer: str
    keycloak_jwks_url: str
    keycloak_audience: str
    token_header_name: str


class UserInfo(BaseModel):
    id: str
    username: str
    email: str | None
    full_name: str | None
    role: str
    team: str | None


@router.get(
    "/me",
    response_model=UserInfo,
    summary="현재 토큰의 사용자 정보 반환",
    description="""
Keycloak Access Token을 검증하고, 해당 토큰에서 추출한 사용자 정보를 반환합니다.

**사용법:**
```
Authorization: Bearer <keycloak_access_token>
```

Keycloak 토큰 → 이 API의 사용자 객체 변환 규칙:
- `sub` → `id`
- `preferred_username` → `username`
- `realm_access.roles` 또는 `resource_access.salary-api.roles` → `role`
- `department` (Keycloak User Attribute) → `team`
""",
)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserInfo(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user.get("email"),
        full_name=current_user.get("full_name"),
        role=current_user["role"],
        team=current_user.get("team"),
    )


@router.get(
    "/config",
    response_model=AuthConfig,
    summary="현재 Keycloak 연동 설정 확인",
    description="이 API가 사용 중인 Keycloak 설정(환경변수 기반)을 반환합니다.",
)
async def get_auth_config():
    return AuthConfig(
        keycloak_issuer=KEYCLOAK_ISSUER,
        keycloak_jwks_url=KEYCLOAK_JWKS_URL,
        keycloak_audience=KEYCLOAK_AUDIENCE,
        token_header_name=TOKEN_HEADER_NAME,
    )


@router.get(
    "/jwks-status",
    summary="Keycloak JWKS 연결 상태 확인",
    description="""
Keycloak JWKS 엔드포인트에 실제로 연결해 공개키 목록을 가져올 수 있는지 확인합니다.
배포 후 Keycloak 연결 검증 시 사용하세요.
""",
)
async def check_jwks_status():
    try:
        jwks = await fetch_jwks()
        keys = jwks.get("keys", [])
        return {
            "status": "ok",
            "jwks_url": KEYCLOAK_JWKS_URL,
            "key_count": len(keys),
            "key_ids": [k.get("kid") for k in keys],
        }
    except HTTPException as e:
        return {
            "status": "error",
            "jwks_url": KEYCLOAK_JWKS_URL,
            "detail": e.detail,
        }


@router.post(
    "/jwks-refresh",
    summary="JWKS 캐시 강제 갱신",
    description="""
Keycloak 키 롤오버(Key Rotation) 발생 시, 캐시된 JWKS를 강제로 갱신합니다.
정상적으로는 kid 미일치 시 자동 갱신되지만, 수동으로 갱신이 필요한 경우 사용합니다.
""",
)
async def refresh_jwks():
    invalidate_jwks_cache()
    try:
        jwks = await fetch_jwks()
        keys = jwks.get("keys", [])
        return {
            "status": "refreshed",
            "key_count": len(keys),
            "key_ids": [k.get("kid") for k in keys],
        }
    except HTTPException as e:
        return {"status": "error", "detail": e.detail}
