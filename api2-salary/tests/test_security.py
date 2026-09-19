# api2-salary/tests/test_security.py
"""
인증/권한 로직 단위 테스트
- claims_to_user() 변환 함수
- assert_can_read/update/delete_salary() 권한 검사 함수
- extract_token_from_request() 토큰 추출 함수
"""

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock


class TestClaimsToUser:
    """claims_to_user() — Keycloak JWT 클레임 → 앱 사용자 객체 변환"""

    def test_employee_role(self, payload_alice):
        from app.auth.security import claims_to_user
        user = claims_to_user(payload_alice)
        assert user["role"] == "employee"
        assert user["id"] == "sub-alice-0001"
        assert user["username"] == "alice"
        assert user["team"] == "engineering"

    def test_manager_role(self, payload_carol):
        from app.auth.security import claims_to_user
        user = claims_to_user(payload_carol)
        assert user["role"] == "manager"
        assert user["team"] == "engineering"

    def test_hr_system_role(self, payload_hr):
        from app.auth.security import claims_to_user
        user = claims_to_user(payload_hr)
        assert user["role"] == "hr_system"

    def test_no_role_raises_403(self, payload_no_role):
        from app.auth.security import claims_to_user
        with pytest.raises(HTTPException) as exc:
            claims_to_user(payload_no_role)
        assert exc.value.status_code == 403
        assert "No valid role" in exc.value.detail

    def test_role_priority_hr_over_manager(self):
        """hr_system + manager 동시 보유 시 hr_system 우선"""
        from app.auth.security import claims_to_user
        payload = {
            "sub": "sub-x",
            "preferred_username": "x",
            "realm_access": {"roles": ["manager", "hr_system"]},
            "resource_access": {},
            "department": "hr",
        }
        user = claims_to_user(payload)
        assert user["role"] == "hr_system"

    def test_role_priority_manager_over_employee(self):
        from app.auth.security import claims_to_user
        payload = {
            "sub": "sub-y",
            "preferred_username": "y",
            "realm_access": {"roles": ["employee", "manager"]},
            "resource_access": {},
            "department": "engineering",
        }
        user = claims_to_user(payload)
        assert user["role"] == "manager"

    def test_client_roles_merged(self):
        """resource_access.<client>.roles 도 반영"""
        from app.auth.security import claims_to_user
        payload = {
            "sub": "sub-z",
            "preferred_username": "z",
            "realm_access": {"roles": []},
            "resource_access": {"salary-api": {"roles": ["hr_system"]}},
            "department": "hr",
        }
        user = claims_to_user(payload)
        assert user["role"] == "hr_system"

    def test_raw_claims_preserved(self, payload_alice):
        from app.auth.security import claims_to_user
        user = claims_to_user(payload_alice)
        assert "raw_claims" in user
        assert user["raw_claims"]["sub"] == "sub-alice-0001"


class TestReadPermission:
    """assert_can_read_salary() — 조회 권한"""

    @pytest.fixture
    def record_alice(self):
        return {"employee_id": "sub-alice-0001", "team": "engineering"}

    @pytest.fixture
    def record_marketing(self):
        return {"employee_id": "sub-dave-0004", "team": "marketing"}

    def test_employee_can_read_own(self, payload_alice, record_alice):
        from app.auth.security import claims_to_user, assert_can_read_salary
        user = claims_to_user(payload_alice)
        assert_can_read_salary(user, record_alice)  # 예외 없으면 통과

    def test_employee_cannot_read_others(self, payload_alice, record_marketing):
        from app.auth.security import claims_to_user, assert_can_read_salary
        user = claims_to_user(payload_alice)
        with pytest.raises(HTTPException) as exc:
            assert_can_read_salary(user, record_marketing)
        assert exc.value.status_code == 403

    def test_manager_can_read_same_team(self, payload_carol, record_alice):
        """carol(manager, engineering) → alice(engineering) 조회 가능"""
        from app.auth.security import claims_to_user, assert_can_read_salary
        user = claims_to_user(payload_carol)
        assert_can_read_salary(user, record_alice)

    def test_manager_cannot_read_other_team(self, payload_carol, record_marketing):
        """carol(manager, engineering) → marketing 팀 조회 불가"""
        from app.auth.security import claims_to_user, assert_can_read_salary
        user = claims_to_user(payload_carol)
        with pytest.raises(HTTPException) as exc:
            assert_can_read_salary(user, record_marketing)
        assert exc.value.status_code == 403

    def test_hr_can_read_any(self, payload_hr, record_marketing):
        from app.auth.security import claims_to_user, assert_can_read_salary
        user = claims_to_user(payload_hr)
        assert_can_read_salary(user, record_marketing)  # 예외 없으면 통과


class TestUpdatePermission:
    """assert_can_update_salary() — 수정 권한"""

    @pytest.fixture
    def record_alice(self):
        return {"employee_id": "sub-alice-0001", "team": "engineering"}

    @pytest.fixture
    def record_marketing(self):
        return {"employee_id": "sub-dave-0004", "team": "marketing"}

    def test_employee_can_update_own(self, payload_alice, record_alice):
        from app.auth.security import claims_to_user, assert_can_update_salary
        user = claims_to_user(payload_alice)
        assert_can_update_salary(user, record_alice)

    def test_employee_cannot_update_others(self, payload_alice, record_marketing):
        from app.auth.security import claims_to_user, assert_can_update_salary
        user = claims_to_user(payload_alice)
        with pytest.raises(HTTPException) as exc:
            assert_can_update_salary(user, record_marketing)
        assert exc.value.status_code == 403

    def test_manager_can_update_same_team(self, payload_carol, record_alice):
        from app.auth.security import claims_to_user, assert_can_update_salary
        user = claims_to_user(payload_carol)
        assert_can_update_salary(user, record_alice)

    def test_manager_cannot_update_other_team(self, payload_carol, record_marketing):
        from app.auth.security import claims_to_user, assert_can_update_salary
        user = claims_to_user(payload_carol)
        with pytest.raises(HTTPException) as exc:
            assert_can_update_salary(user, record_marketing)
        assert exc.value.status_code == 403

    def test_hr_can_update_any(self, payload_hr, record_marketing):
        from app.auth.security import claims_to_user, assert_can_update_salary
        user = claims_to_user(payload_hr)
        assert_can_update_salary(user, record_marketing)


class TestDeletePermission:
    """assert_can_delete_salary() — 삭제 권한 (hr_system만 가능)"""

    def test_hr_can_delete(self, payload_hr):
        from app.auth.security import claims_to_user, assert_can_delete_salary
        user = claims_to_user(payload_hr)
        assert_can_delete_salary(user)  # 예외 없으면 통과

    def test_employee_cannot_delete(self, payload_alice):
        from app.auth.security import claims_to_user, assert_can_delete_salary
        user = claims_to_user(payload_alice)
        with pytest.raises(HTTPException) as exc:
            assert_can_delete_salary(user)
        assert exc.value.status_code == 403
        assert "hr system" in exc.value.detail.lower()

    def test_manager_cannot_delete(self, payload_carol):
        from app.auth.security import claims_to_user, assert_can_delete_salary
        user = claims_to_user(payload_carol)
        with pytest.raises(HTTPException) as exc:
            assert_can_delete_salary(user)
        assert exc.value.status_code == 403


class TestTokenExtraction:
    """extract_token_from_request() — 헤더에서 토큰 추출"""

    def _make_request(self, headers: dict):
        """Starlette Headers는 대소문자 구분 없이 조회 — MutableHeaders mock"""
        from starlette.datastructures import Headers
        req = MagicMock()
        # Starlette Headers는 소문자로 정규화
        req.headers = Headers(headers={k.lower(): v for k, v in headers.items()})
        return req

    def test_standard_bearer(self):
        from app.auth.security import extract_token_from_request
        req = self._make_request({"Authorization": "Bearer mytoken123"})
        assert extract_token_from_request(req) == "mytoken123"

    def test_token_only_no_bearer_prefix(self):
        """일부 APIC 설정 — 헤더에 'Bearer ' 없이 토큰만"""
        from app.auth.security import extract_token_from_request
        req = self._make_request({"Authorization": "rawtoken456"})
        assert extract_token_from_request(req) == "rawtoken456"

    def test_missing_header_raises_401(self):
        from app.auth.security import extract_token_from_request
        req = self._make_request({})
        with pytest.raises(HTTPException) as exc:
            extract_token_from_request(req)
        assert exc.value.status_code == 401
