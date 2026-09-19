"""
Authentication & Authorization — Keycloak External IdP Integration
==================================================================

토큰 흐름 (외부 IdP 연동):
  1. 클라이언트가 Keycloak에서 Access Token을 발급받음
  2. API Connect가 해당 토큰을 outbound 헤더로 전달
     - 기본 헤더: Authorization: Bearer <keycloak_access_token>
     - 또는 커스텀 헤더: X-Forwarded-Access-Token: <token>
  3. 이 API가 Keycloak JWKS 엔드포인트로 토큰 서명을 직접 검증
  4. Keycloak 토큰 내 realm_access.roles 클레임으로 권한 판단

Keycloak JWT 클레임 매핑:
  sub              → 사용자 고유 ID (employee_id 매핑에 사용)
  preferred_username → 사용자명
  realm_access.roles → 역할 목록 ["employee"], ["manager"], ["hr_system"]
  department (custom attribute) → 팀/부서 정보

권한 매트릭스:
  ┌───────────┬────────┬────────┬────────┐
  │ Role      │ READ   │ UPDATE │ DELETE │
  ├───────────┼────────┼────────┼────────┤
  │ employee  │ own    │ own    │ ✗      │
  │ manager   │ team   │ team   │ ✗      │
  │ hr_system │ all    │ all    │ all    │
  └───────────┴────────┴────────┴────────┘
"""

import os
import logging
from functools import lru_cache
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt, jwk
from jose.utils import base64url_decode

logger = logging.getLogger(__name__)

# ── Keycloak 설정 (환경변수로 주입) ──────────────────────────────────────────
# 필수 환경변수:
#   KEYCLOAK_URL      : Keycloak 서버 URL (예: http://keycloak.example.com)
#   KEYCLOAK_REALM    : Realm 이름 (예: corp)
# 선택 환경변수:
#   KEYCLOAK_AUDIENCE : 토큰의 aud 클레임 검증값 (기본값: salary-api)
#   TOKEN_HEADER_NAME : API Connect가 전달하는 토큰 헤더 이름
#                       (기본값: Authorization, 커스텀 시 X-Forwarded-Access-Token 등)

KEYCLOAK_URL   = os.environ.get("KEYCLOAK_URL",   "http://localhost:8080")
KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "corp")
KEYCLOAK_AUDIENCE = os.environ.get("KEYCLOAK_AUDIENCE", "salary-api")
TOKEN_HEADER_NAME = os.environ.get("TOKEN_HEADER_NAME", "Authorization")

# Keycloak OIDC 엔드포인트 (자동 구성)
KEYCLOAK_ISSUER  = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"
KEYCLOAK_JWKS_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/certs"

# ── JWKS 캐시 (프로세스 내 캐싱, 재시작 시 갱신) ─────────────────────────────
_jwks_cache: Optional[dict] = None


async def fetch_jwks() -> dict:
    """Keycloak JWKS 엔드포인트에서 공개키 목록을 가져옵니다."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(KEYCLOAK_JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            logger.info(f"JWKS fetched from {KEYCLOAK_JWKS_URL}: "
                        f"{len(_jwks_cache.get('keys', []))} key(s)")
            return _jwks_cache
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch JWKS from {KEYCLOAK_JWKS_URL}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach Keycloak JWKS endpoint. "
                   f"Check KEYCLOAK_URL and KEYCLOAK_REALM. ({e})",
        )


def invalidate_jwks_cache():
    """키 롤오버 시 캐시를 비웁니다 (테스트 및 관리용)."""
    global _jwks_cache
    _jwks_cache = None


# ── 토큰 추출 헬퍼 ────────────────────────────────────────────────────────────

def extract_token_from_request(request: Request) -> str:
    """
    요청 헤더에서 Bearer 토큰을 추출합니다.
    TOKEN_HEADER_NAME 환경변수에 따라 헤더 이름이 달라집니다.

    API Connect outbound 토큰 시나리오:
      - 기본(Authorization): API Connect가 토큰을 Authorization 헤더로 전달
      - 커스텀(X-Forwarded-Access-Token): API Connect가 원본 토큰을
        커스텀 헤더로 별도 전달하는 경우
    """
    header_value = request.headers.get(TOKEN_HEADER_NAME) or \
                   request.headers.get("Authorization")

    if not header_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Missing token. Expected header: '{TOKEN_HEADER_NAME}: Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = header_value.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    if len(parts) == 1:
        # 헤더에 "Bearer " 접두사 없이 토큰만 있는 경우 (일부 APIC 설정)
        return parts[0]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Authorization header format. Use: Bearer <token>",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── Keycloak 토큰 검증 ────────────────────────────────────────────────────────

async def verify_keycloak_token(token: str) -> dict:
    """
    Keycloak이 발급한 JWT를 JWKS로 검증하고 페이로드를 반환합니다.

    검증 항목:
      1. JWKS 서명 검증 (Keycloak 공개키)
      2. 토큰 만료(exp) 검증
      3. issuer(iss) 검증 — KEYCLOAK_ISSUER와 일치 여부
      4. audience(aud) 검증 — KEYCLOAK_AUDIENCE 포함 여부
    """
    jwks = await fetch_jwks()

    try:
        # kid(Key ID)로 적절한 공개키 선택
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        matching_keys = [k for k in jwks.get("keys", []) if k.get("kid") == kid]
        if not matching_keys:
            # kid 미일치 시 캐시 무효화 후 재시도 (키 롤오버 대응)
            invalidate_jwks_cache()
            jwks = await fetch_jwks()
            matching_keys = [k for k in jwks.get("keys", []) if k.get("kid") == kid]

        if not matching_keys:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"No matching public key found for kid='{kid}'. "
                       "Token may have been issued by a different Keycloak realm.",
            )

        payload = jwt.decode(
            token,
            matching_keys[0],
            algorithms=["RS256"],
            audience=KEYCLOAK_AUDIENCE,
            issuer=KEYCLOAK_ISSUER,
            options={"verify_exp": True},
        )
        return payload

    except JWTError as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Keycloak 클레임 → 애플리케이션 사용자 객체 변환 ──────────────────────────

def claims_to_user(payload: dict) -> dict:
    """
    Keycloak JWT 클레임을 애플리케이션 내부 사용자 객체로 변환합니다.

    Keycloak 클레임 구조 예시:
    {
      "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "preferred_username": "alice",
      "email": "alice@corp.com",
      "realm_access": {
        "roles": ["employee", "default-roles-corp"]
      },
      "resource_access": {
        "salary-api": {
          "roles": ["employee"]
        }
      },
      "department": "engineering",   ← Keycloak User Attribute → Token Claim Mapper
      "iss": "http://keycloak.example.com/realms/corp",
      "exp": 1234567890
    }
    """
    # realm_access.roles 또는 resource_access.<client>.roles 에서 역할 추출
    realm_roles: list = payload.get("realm_access", {}).get("roles", [])
    client_roles: list = (
        payload.get("resource_access", {})
               .get(KEYCLOAK_AUDIENCE, {})
               .get("roles", [])
    )
    all_roles = set(realm_roles + client_roles)

    # 역할 우선순위: hr_system > manager > employee
    if "hr_system" in all_roles:
        role = "hr_system"
    elif "manager" in all_roles:
        role = "manager"
    elif "employee" in all_roles:
        role = "employee"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No valid role found in token. "
                   f"Expected one of: employee, manager, hr_system. "
                   f"Found roles: {list(all_roles)}",
        )

    return {
        "id": payload.get("sub"),
        "username": payload.get("preferred_username", payload.get("sub")),
        "email": payload.get("email"),
        "full_name": payload.get("name"),
        "role": role,
        "team": payload.get("department"),   # Keycloak custom attribute
        "raw_claims": payload,                # 원본 클레임 (디버깅용)
    }


# ── FastAPI Dependency — 현재 인증된 사용자 가져오기 ─────────────────────────

async def get_current_user(request: Request) -> dict:
    """
    요청에서 Keycloak 토큰을 추출 → JWKS 검증 → 사용자 객체 반환.
    모든 보호된 엔드포인트에서 Depends(get_current_user)로 사용합니다.
    """
    token = extract_token_from_request(request)
    payload = await verify_keycloak_token(token)
    return claims_to_user(payload)


# ── 역할 기반 권한 검사 ───────────────────────────────────────────────────────

def assert_can_read_salary(current_user: dict, salary_record: dict) -> None:
    """hr_system: 모두 / manager: 같은 팀 / employee: 본인만"""
    role = current_user["role"]
    if role == "hr_system":
        return
    if role == "manager" and current_user.get("team") == salary_record.get("team"):
        return
    if role == "employee" and current_user["id"] == salary_record.get("employee_id"):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to view this salary record.",
    )


def assert_can_update_salary(current_user: dict, salary_record: dict) -> None:
    """hr_system: 모두 / manager: 같은 팀 / employee: 본인만"""
    role = current_user["role"]
    if role == "hr_system":
        return
    if role == "manager" and current_user.get("team") == salary_record.get("team"):
        return
    if role == "employee" and current_user["id"] == salary_record.get("employee_id"):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to update this salary record.",
    )


def assert_can_delete_salary(current_user: dict) -> None:
    """hr_system 만 삭제 가능"""
    if current_user["role"] != "hr_system":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the HR system role may delete salary records.",
        )
