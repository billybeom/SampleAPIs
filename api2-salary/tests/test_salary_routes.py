# api2-salary/tests/test_salary_routes.py
"""
Salary 엔드포인트 통합 테스트
- Keycloak JWKS 검증을 mock하여 실제 HTTP 요청으로 권한 시나리오 테스트
- 각 역할(employee/manager/hr_system)별 허용/거부 케이스 검증

실제 라우터 구조:
  GET  /salaries/me         — 본인 연봉 (employee_id = sub)
  GET  /salaries/           — role에 따라 본인/팀/전체 반환
  GET  /salaries/{id}       — salary record ID(s001 등)로 조회
  PATCH /salaries/{id}      — 부분 수정
  DELETE /salaries/{id}     — hr_system 전용 삭제

store.py의 더미 데이터:
  s001 — alice (sub-alice-0001, engineering)
  s002 — bob   (sub-bob-0002,   engineering)
  s003 — carol (sub-carol-0003, marketing)
  s004 — dave  (sub-dave-0004,  engineering)
  s005 — eve   (sub-eve-0005,   marketing)
"""

import pytest
from unittest.mock import patch


def auth_header(token: str = "mocked") -> dict:
    return {"Authorization": f"Bearer {token}"}


def mock_verify(payload: dict):
    """verify_keycloak_token을 mock으로 교체 — payload를 그대로 반환"""
    async def _mock(token: str) -> dict:
        return payload
    return _mock


# ─────────────────────────────────────────────────────────────────────────────
class TestSalaryMeEndpoint:
    """GET /salaries/me — 본인 연봉 조회 (employee_id = Keycloak sub)"""

    def test_alice_can_view_own_salary(self, client, payload_alice):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.get("/salaries/me", headers=auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == "sub-alice-0001"
        assert data["team"] == "engineering"

    def test_carol_manager_can_view_own_salary(self, client, payload_carol):
        """carol sub=sub-carol-0003, store에 s003으로 매핑"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.get("/salaries/me", headers=auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == "sub-carol-0003"

    def test_unknown_sub_not_found(self, client):
        """store에 없는 sub → 404"""
        unknown = {
            "sub": "sub-unknown-9999",
            "preferred_username": "ghost",
            "realm_access": {"roles": ["employee"]},
            "resource_access": {},
            "department": "engineering",
        }
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(unknown)):
            resp = client.get("/salaries/me", headers=auth_header())
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
class TestSalaryListEndpoint:
    """GET /salaries/ — role에 따른 범위 반환"""

    def test_employee_sees_only_own(self, client, payload_alice):
        """alice(employee) → 본인 레코드만"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.get("/salaries/", headers=auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["data"][0]["employee_id"] == "sub-alice-0001"

    def test_manager_sees_own_team(self, client, payload_carol):
        """carol(manager, engineering) — store에서 carol team = marketing
        → carol은 marketing 팀 레코드만 반환"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.get("/salaries/", headers=auth_header())
        assert resp.status_code == 200
        data = resp.json()
        # carol의 department=engineering → engineering 팀 레코드
        for record in data["data"]:
            assert record["team"] == "engineering"

    def test_hr_sees_all(self, client, payload_hr):
        """hr_system → 전체 레코드"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.get("/salaries/", headers=auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2  # store에 최소 2개 이상


# ─────────────────────────────────────────────────────────────────────────────
class TestSalaryByIdEndpoint:
    """GET /salaries/{id} — salary record ID(s001 등)로 조회"""

    def test_employee_can_view_own_record(self, client, payload_alice):
        """alice → s001 (alice 레코드) 조회 가능"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.get("/salaries/s001", headers=auth_header())
        assert resp.status_code == 200
        assert resp.json()["employee_id"] == "sub-alice-0001"

    def test_employee_cannot_view_others_record(self, client, payload_alice):
        """alice → s002 (bob 레코드) 조회 불가"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.get("/salaries/s002", headers=auth_header())
        assert resp.status_code == 403

    def test_manager_can_view_same_team_record(self, client, payload_carol):
        """carol(manager, engineering) → s001 (alice, engineering) 가능"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.get("/salaries/s001", headers=auth_header())
        assert resp.status_code == 200

    def test_manager_cannot_view_other_team_record(self, client, payload_carol):
        """carol(manager, engineering) → s005 (eve, marketing) 불가"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.get("/salaries/s005", headers=auth_header())
        assert resp.status_code == 403

    def test_hr_can_view_any_record(self, client, payload_hr):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.get("/salaries/s005", headers=auth_header())
        assert resp.status_code == 200

    def test_not_found_returns_404(self, client, payload_hr):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.get("/salaries/s999", headers=auth_header())
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
class TestSalaryUpdateEndpoint:
    """PATCH /salaries/{id} — 부분 수정"""

    def test_employee_can_update_own(self, client, payload_alice):
        """alice → s001 수정 가능"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.patch("/salaries/s001",
                                json={"base_salary": 75000000},
                                headers=auth_header())
        assert resp.status_code == 200
        data = resp.json()
        assert data["record"]["base_salary"] == 75000000
        assert data["updated_by"] == "alice"

    def test_employee_cannot_update_others(self, client, payload_alice):
        """alice → s002 (bob) 수정 불가"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.patch("/salaries/s002",
                                json={"base_salary": 99000000},
                                headers=auth_header())
        assert resp.status_code == 403

    def test_manager_can_update_same_team(self, client, payload_carol):
        """carol(manager, engineering) → s001 (alice, engineering) 수정 가능"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.patch("/salaries/s001",
                                json={"bonus": 8000000},
                                headers=auth_header())
        assert resp.status_code == 200
        assert resp.json()["updated_by_role"] == "manager"

    def test_manager_cannot_update_other_team(self, client, payload_carol):
        """carol(manager, engineering) → s005 (eve, marketing) 수정 불가"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.patch("/salaries/s005",
                                json={"bonus": 5000000},
                                headers=auth_header())
        assert resp.status_code == 403

    def test_hr_can_update_any(self, client, payload_hr):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.patch("/salaries/s004",
                                json={"base_salary": 100000000},
                                headers=auth_header())
        assert resp.status_code == 200

    def test_empty_body_returns_400(self, client, payload_hr):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.patch("/salaries/s001",
                                json={},
                                headers=auth_header())
        assert resp.status_code == 400

    def test_not_found_returns_404(self, client, payload_hr):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.patch("/salaries/s999",
                                json={"bonus": 1000},
                                headers=auth_header())
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
class TestSalaryDeleteEndpoint:
    """DELETE /salaries/{id} — 삭제 (hr_system 전용)

    주의: session-scoped TestClient를 사용하므로
    이 클래스의 테스트는 store에서 실제로 레코드를 삭제합니다.
    삭제 순서와 다른 테스트 클래스와의 간섭에 주의하세요.
    """

    def test_employee_cannot_delete(self, client, payload_alice):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_alice)):
            resp = client.delete("/salaries/s005", headers=auth_header())
        assert resp.status_code == 403

    def test_manager_cannot_delete(self, client, payload_carol):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_carol)):
            resp = client.delete("/salaries/s005", headers=auth_header())
        assert resp.status_code == 403

    def test_hr_can_delete(self, client, payload_hr):
        """s005 삭제 — 마지막에 실행 (다른 테스트 영향 없음)"""
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.delete("/salaries/s005", headers=auth_header())
        # DELETE 성공은 200 (store에서 레코드 반환 포함) 또는 204
        assert resp.status_code in (200, 204)

    def test_delete_nonexistent_returns_404(self, client, payload_hr):
        with patch("app.auth.security.verify_keycloak_token", new=mock_verify(payload_hr)):
            resp = client.delete("/salaries/s999", headers=auth_header())
        assert resp.status_code == 404
