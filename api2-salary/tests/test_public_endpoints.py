# api2-salary/tests/test_public_endpoints.py
"""
공개 엔드포인트 테스트 (인증 불필요)
- GET /
- GET /health
- GET /auth/config
- GET /auth/jwks-status
- POST /auth/jwks-refresh
"""


class TestRootAndHealth:
    def test_root_returns_api_info(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Salary Management API"
        assert data["version"] == "2.0.0"
        assert "keycloak_issuer" in data
        assert data["docs"] == "/docs"

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert "keycloak_issuer" in data


class TestAuthConfig:
    def test_config_contains_keycloak_info(self, client):
        resp = client.get("/auth/config")
        assert resp.status_code == 200
        data = resp.json()
        # AuthConfig 모델 필드 확인
        assert "keycloak_issuer" in data
        assert "keycloak_jwks_url" in data
        assert "keycloak_audience" in data
        assert "token_header_name" in data

    def test_config_issuer_format(self, client):
        resp = client.get("/auth/config")
        data = resp.json()
        issuer = data["keycloak_issuer"]
        assert issuer.endswith("/realms/corp")

    def test_jwks_status_returns_status_field(self, client):
        """Keycloak 없는 환경 — status 필드가 존재"""
        from app.auth.security import invalidate_jwks_cache
        invalidate_jwks_cache()
        resp = client.get("/auth/jwks-status")
        assert resp.status_code == 200
        data = resp.json()
        # Keycloak 없으면 status:"error", 있으면 status:"ok"
        assert "status" in data
        assert data["status"] in ("ok", "error")

    def test_jwks_refresh_returns_200(self, client):
        """jwks-refresh는 성공/실패 모두 200 반환 (에러는 body에 담음)"""
        resp = client.post("/auth/jwks-refresh")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert data["status"] in ("refreshed", "error")


class TestUnauthenticated:
    """인증 없이 보호 엔드포인트 호출 시 401"""

    def test_get_me_without_token(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_get_my_salary_without_token(self, client):
        resp = client.get("/salaries/me")
        assert resp.status_code == 401

    def test_get_salary_by_id_without_token(self, client):
        resp = client.get("/salaries/s001")
        assert resp.status_code == 401

    def test_get_all_salaries_without_token(self, client):
        resp = client.get("/salaries/")
        assert resp.status_code == 401

    def test_invalid_authorization_header(self, client):
        """Authorization 헤더 있지만 Keycloak 없음 → 401 or 503"""
        resp = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code in (401, 503)
