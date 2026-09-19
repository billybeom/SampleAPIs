# api2-salary/tests/test_obo.py
"""
OBO (On-Behalf-Of) Token Exchange 엔드포인트 테스트

- GET  /obo/info  — 설정 확인 (인증 불필요)
- POST /obo/token — Keycloak Token Exchange (Keycloak mock 필요)
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import httpx


def auth_header(token: str = "mocked") -> dict:
    return {"Authorization": f"Bearer {token}"}


def mock_verify(payload: dict):
    async def _mock(token: str) -> dict:
        return payload
    return _mock


class TestOboInfo:
    """GET /obo/info — 인증 없이 설정 확인"""

    def test_obo_info_returns_config(self, client):
        resp = client.get("/obo/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["obo_enabled"] is True
        assert "token_exchange_url" in data
        assert "obo_client_id" in data
        assert "usage" in data
        assert "required_keycloak_setup" in data

    def test_obo_info_contains_rfc_link(self, client):
        resp = client.get("/obo/info")
        data = resp.json()
        assert "rfc8693" in data["rfc"]

    def test_obo_info_contains_usage_steps(self, client):
        resp = client.get("/obo/info")
        data = resp.json()
        assert "step1" in data["usage"]
        assert "step2" in data["usage"]
        assert "step3" in data["usage"]


class TestOboTokenExchange:
    """POST /obo/token — Token Exchange"""

    def test_requires_authentication(self, client):
        """인증 없이 OBO 요청 → 401"""
        resp = client.post("/obo/token",
                           json={"target_audience": "other-service"})
        assert resp.status_code == 401

    def test_obo_success(self, client, payload_alice):
        """
        Keycloak Token Exchange 성공 케이스 mock.
        실제 Keycloak 없이 httpx.AsyncClient.post를 mock합니다.
        """
        keycloak_response = {
            "access_token": "obo.exchanged.token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "openid profile email",
        }

        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = keycloak_response

        async def mock_post(*args, **kwargs):
            return mock_resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = mock_post

        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)), \
             patch("app.routers.obo.httpx.AsyncClient", return_value=mock_client):
            resp = client.post(
                "/obo/token",
                json={"target_audience": "other-service"},
                headers=auth_header(),
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["access_token"] == "obo.exchanged.token"
        assert data["token_type"] == "Bearer"
        assert data["original_user"] == "alice"
        assert data["original_role"] == "employee"
        assert data["target_audience"] == "other-service"

    def test_obo_keycloak_error_returns_400(self, client, payload_alice):
        """
        Keycloak이 Token Exchange를 거부한 경우 (비활성화 등) → 400
        """
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 400
        mock_resp.headers = {"content-type": "application/json"}
        mock_resp.json.return_value = {
            "error": "invalid_client",
            "error_description": "Token exchange not enabled",
        }

        async def mock_post(*args, **kwargs):
            return mock_resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = mock_post

        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)), \
             patch("app.routers.obo.httpx.AsyncClient", return_value=mock_client):
            resp = client.post(
                "/obo/token",
                json={"target_audience": "other-service"},
                headers=auth_header(),
            )

        assert resp.status_code == 400
        data = resp.json()
        assert "detail" in data
        assert "hint" in data["detail"]

    def test_obo_keycloak_unreachable_returns_503(self, client, payload_alice):
        """
        Keycloak에 연결 불가 → 503
        """
        async def mock_post(*args, **kwargs):
            raise httpx.ConnectError("Connection refused")

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = mock_post

        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)), \
             patch("app.routers.obo.httpx.AsyncClient", return_value=mock_client):
            resp = client.post(
                "/obo/token",
                json={"target_audience": "other-service"},
                headers=auth_header(),
            )

        assert resp.status_code == 503

    def test_obo_preserves_user_claims(self, client, payload_carol):
        """
        OBO 토큰에 원본 사용자(carol, manager) 정보가 유지되는지 확인
        """
        mock_resp = MagicMock(spec=httpx.Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "access_token": "carol.obo.token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "openid",
        }

        async def mock_post(*args, **kwargs):
            return mock_resp

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = mock_post

        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)), \
             patch("app.routers.obo.httpx.AsyncClient", return_value=mock_client):
            resp = client.post(
                "/obo/token",
                json={"target_audience": "reporting-service", "scope": "openid"},
                headers=auth_header(),
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["original_user"] == "carol"
        assert data["original_role"] == "manager"
        assert data["target_audience"] == "reporting-service"
