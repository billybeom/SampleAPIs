# api2-salary/tests/conftest.py
"""
pytest 공통 픽스처
- Keycloak 없이 JWKS 검증을 mock하여 단위 테스트 가능하게 합니다.
- FastAPI TestClient(httpx)로 실제 HTTP 요청을 시뮬레이션합니다.
"""

import os
import time
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

# Keycloak 환경변수 — 테스트 시 실제 서버 불필요
os.environ.setdefault("KEYCLOAK_URL", "http://localhost:8080")
os.environ.setdefault("KEYCLOAK_REALM", "corp")
os.environ.setdefault("KEYCLOAK_AUDIENCE", "salary-api")

from app.main import app  # noqa: E402 (env must be set before import)


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient — 세션 전체에서 재사용"""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


# ─────────────────────────────────────────────────────────────────────────────
# JWT payload 픽스처 (역할별)
# Keycloak이 발급하는 실제 클레임 구조를 모방합니다.
# ─────────────────────────────────────────────────────────────────────────────

def _make_payload(sub: str, username: str, roles: list[str],
                  department: str, exp_offset: int = 3600) -> dict:
    return {
        "sub": sub,
        "preferred_username": username,
        "email": f"{username}@corp.com",
        "name": username.title(),
        "realm_access": {"roles": roles + ["default-roles-corp"]},
        "resource_access": {"salary-api": {"roles": roles}},
        "department": department,
        "iss": "http://localhost:8080/realms/corp",
        "aud": ["salary-api", "account"],
        "exp": int(time.time()) + exp_offset,
        "iat": int(time.time()),
    }


@pytest.fixture
def payload_alice():
    """alice — employee, engineering"""
    return _make_payload(
        sub="sub-alice-0001",
        username="alice",
        roles=["employee"],
        department="engineering",
    )


@pytest.fixture
def payload_bob():
    """bob — employee, engineering"""
    return _make_payload(
        sub="sub-bob-0002",
        username="bob",
        roles=["employee"],
        department="engineering",
    )


@pytest.fixture
def payload_carol():
    """carol — manager, engineering"""
    return _make_payload(
        sub="sub-carol-0003",
        username="carol",
        roles=["manager"],
        department="engineering",
    )


@pytest.fixture
def payload_dave():
    """dave — manager, marketing"""
    return _make_payload(
        sub="sub-dave-0004",
        username="dave",
        roles=["manager"],
        department="marketing",
    )


@pytest.fixture
def payload_hr():
    """hr-system — hr_system role"""
    return _make_payload(
        sub="sub-hr-0005",
        username="hr-system",
        roles=["hr_system"],
        department="hr",
    )


@pytest.fixture
def payload_expired():
    """만료된 토큰 payload"""
    return _make_payload(
        sub="sub-alice-0001",
        username="alice",
        roles=["employee"],
        department="engineering",
        exp_offset=-3600,  # 이미 만료
    )


@pytest.fixture
def payload_no_role():
    """유효한 토큰이지만 역할이 없음"""
    p = _make_payload(
        sub="sub-unknown-9999",
        username="unknown",
        roles=[],
        department="unknown",
    )
    p["realm_access"]["roles"] = []
    p["resource_access"] = {}
    return p
