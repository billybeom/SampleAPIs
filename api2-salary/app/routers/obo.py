"""
api2-salary/app/routers/obo.py
==============================

On-Behalf-Of (OBO) Token Exchange 엔드포인트
============================================

OBO 흐름 설명:
  서비스 A가 사용자의 권한을 "대신해서(on behalf of)" 서비스 B를 호출해야 할 때,
  서비스 A는 사용자의 토큰을 Keycloak에게 제시하여 서비스 B용 새 토큰을 교환합니다.

  이 패턴은 IBM API Connect에서 마이크로서비스 간 호출 시 권한을 전파하는 데 사용됩니다.

흐름도:
  [Client]
      │ ① Keycloak에서 Access Token 발급 (audience: salary-api)
      ▼
  [API Connect / Service A]
      │ ② 사용자 토큰을 OBO 요청에 포함
      │    → Keycloak Token Exchange: subject_token=<user_token>
      │                                requested_token_type=urn:ietf:params:oauth:token-type:access_token
      │                                audience=<target_service>
      ▼
  [Keycloak]
      │ ③ 검증 후 타겟 서비스(salary-api)용 새 토큰 발급
      │    - 원본 사용자의 sub, 역할, department 클레임 유지
      │    - audience가 target_service로 변경
      ▼
  [Service B (salary-api)]
      │ ④ 새 토큰으로 API 호출 (원본 사용자 권한 유지)

Keycloak 설정 요구사항:
  1. Realm Settings > Token Exchange 활성화
  2. salary-api 클라이언트 > Permissions > token-exchange 활성화
  3. caller 클라이언트에 salary-api의 token-exchange 권한 부여

환경변수:
  KEYCLOAK_URL       : Keycloak 서버 URL
  KEYCLOAK_REALM     : Realm 이름
  KEYCLOAK_AUDIENCE  : 이 서비스의 audience (salary-api)
  OBO_CLIENT_ID      : OBO 요청 시 사용할 클라이언트 ID (기본: salary-api)
  OBO_CLIENT_SECRET  : OBO 요청 시 사용할 클라이언트 Secret
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional

import httpx

from app.auth.security import (
    get_current_user,
    KEYCLOAK_ISSUER,
    KEYCLOAK_AUDIENCE,
    extract_token_from_request,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/obo", tags=["OBO — On-Behalf-Of"])

# ── OBO 설정 ─────────────────────────────────────────────────────────────────
OBO_CLIENT_ID     = os.environ.get("OBO_CLIENT_ID",     KEYCLOAK_AUDIENCE)
OBO_CLIENT_SECRET = os.environ.get("OBO_CLIENT_SECRET", "salary-api-secret")
KEYCLOAK_TOKEN_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/token"


# ── Pydantic 모델 ─────────────────────────────────────────────────────────────

class OboRequest(BaseModel):
    target_audience: str
    scope: Optional[str] = "openid profile email"

class OboResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    scope: Optional[str] = None
    original_user: str
    original_role: str
    target_audience: str


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@router.post(
    "/token",
    response_model=OboResponse,
    summary="OBO Token Exchange",
    description="""
## On-Behalf-Of Token Exchange

현재 사용자의 토큰을 **타겟 서비스용 토큰으로 교환**합니다.

### 사용 시나리오
- **API Connect → 백엔드 서비스**: API Connect가 사용자 토큰을 내부 서비스용으로 교환
- **마이크로서비스 간 호출**: Service A가 Service B를 호출할 때 원본 사용자 권한 전파

### 요청 예시
```bash
curl -X POST /obo/token \\
  -H "Authorization: Bearer <user_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"target_audience": "target-service-id"}'
```

### 반환되는 토큰
- 원본 사용자의 `sub`, `role`, `department` 클레임이 **그대로 유지**됩니다.
- `aud` 클레임이 `target_audience`로 변경됩니다.

### Keycloak 설정 필요
1. Realm Settings → Token Exchange 활성화 (Preview 기능)
2. `salary-api` 클라이언트 → Permissions → token-exchange 권한 ON
3. caller 클라이언트에 token-exchange 권한 부여

> **참고**: Keycloak 21 이하에서는 Token Exchange가 Preview 기능입니다.
> `KC_FEATURES=token-exchange` 환경변수로 활성화하세요.
""",
)
async def obo_token_exchange(
    body: OboRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    현재 사용자 토큰 → 타겟 서비스용 OBO 토큰 교환.
    RFC 8693 Token Exchange 표준을 따릅니다.
    """
    # 요청에서 원본 토큰 추출
    subject_token = extract_token_from_request(request)

    # Keycloak Token Exchange 요청
    exchange_data = {
        "grant_type":              "urn:ietf:params:oauth:grant-type:token-exchange",
        "client_id":               OBO_CLIENT_ID,
        "client_secret":           OBO_CLIENT_SECRET,
        "subject_token":           subject_token,
        "subject_token_type":      "urn:ietf:params:oauth:token-type:access_token",
        "requested_token_type":    "urn:ietf:params:oauth:token-type:access_token",
        "audience":                body.target_audience,
        "scope":                   body.scope or "openid profile email",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                KEYCLOAK_TOKEN_URL,
                data=exchange_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
    except httpx.HTTPError as e:
        logger.error(f"OBO token exchange HTTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to reach Keycloak for OBO exchange: {e}",
        )

    if resp.status_code != 200:
        error_body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text
        logger.warning(
            f"OBO exchange failed: status={resp.status_code}, "
            f"user={current_user['username']}, target={body.target_audience}, "
            f"error={error_body}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "OBO token exchange failed",
                "keycloak_error": error_body,
                "hint": (
                    "Keycloak Token Exchange가 활성화되어 있는지 확인하세요. "
                    "KC_FEATURES=token-exchange 환경변수 설정 및 "
                    "salary-api 클라이언트의 token-exchange 권한을 확인하세요."
                ),
            },
        )

    token_data = resp.json()
    logger.info(
        f"OBO token exchanged: user={current_user['username']}, "
        f"role={current_user['role']}, target={body.target_audience}"
    )

    return OboResponse(
        access_token  = token_data["access_token"],
        token_type    = token_data.get("token_type", "Bearer"),
        expires_in    = token_data.get("expires_in", 3600),
        scope         = token_data.get("scope"),
        original_user = current_user["username"],
        original_role = current_user["role"],
        target_audience = body.target_audience,
    )


@router.get(
    "/info",
    summary="OBO 설정 및 사용 가이드",
    description="이 서비스의 OBO Token Exchange 설정 정보를 반환합니다.",
)
async def obo_info():
    """OBO 설정 확인 엔드포인트 (인증 불필요)"""
    return {
        "obo_enabled": True,
        "token_exchange_url": KEYCLOAK_TOKEN_URL,
        "obo_client_id": OBO_CLIENT_ID,
        "this_service_audience": KEYCLOAK_AUDIENCE,
        "rfc": "https://datatracker.ietf.org/doc/html/rfc8693",
        "keycloak_docs": (
            "https://www.keycloak.org/docs/latest/securing_apps/"
            "#_token-exchange"
        ),
        "usage": {
            "step1": "POST /obo/token with Authorization: Bearer <user_token>",
            "step2": "body: {\"target_audience\": \"<target-service-client-id>\"}",
            "step3": "Use returned access_token to call target service",
        },
        "required_keycloak_setup": [
            "1. Realm Settings → Token Exchange (Preview) 활성화",
            "2. salary-api Client → Permissions → token-exchange ON",
            "3. caller Client → Service Account → salary-api token-exchange 권한 부여",
        ],
    }
