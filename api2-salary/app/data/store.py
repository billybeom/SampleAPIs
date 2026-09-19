"""
Sample data store — in-memory (no DB required).

Keycloak 연동 변경사항:
  - USERS 테이블에서 password 필드 제거 (인증은 Keycloak이 담당)
  - employee_id는 Keycloak의 sub(UUID) 클레임에 대응
  - Keycloak User Attribute 'department' → token claim 'department' → team 필드 매핑

Keycloak 사용자 설정 시 아래 sub 값을 Keycloak 사용자 ID로 사용하거나,
실제 Keycloak sub(UUID)로 SALARY 레코드의 employee_id를 업데이트하세요.

Roles:
  - employee  : 본인 연봉만 조회/수정 가능
  - manager   : 소속 팀 전체 연봉 조회/수정 가능
  - hr_system : 전체 조회/수정/삭제 가능
"""

from typing import Optional

# ── 직원 프로필 (Keycloak sub 기반, 인증 정보 없음) ──────────────────────────
# employee_id: Keycloak User ID (sub 클레임)
# Keycloak 실제 환경에서는 아래 ID를 Keycloak에서 생성된 UUID로 교체하세요.
# 로컬 테스트용 더미 sub 값을 사용합니다.
EMPLOYEE_PROFILES: list[dict] = [
    {
        "keycloak_sub": "sub-alice-0001",
        "username": "alice",
        "full_name": "Alice Kim",
        "email": "alice@corp.com",
        "team": "engineering",
    },
    {
        "keycloak_sub": "sub-bob-0002",
        "username": "bob",
        "full_name": "Bob Lee",
        "email": "bob@corp.com",
        "team": "engineering",
    },
    {
        "keycloak_sub": "sub-carol-0003",
        "username": "carol",
        "full_name": "Carol Park",
        "email": "carol@corp.com",
        "team": "marketing",
    },
    {
        "keycloak_sub": "sub-dave-0004",
        "username": "dave",
        "full_name": "Dave Choi",
        "email": "dave@corp.com",
        "team": "engineering",
    },
    {
        "keycloak_sub": "sub-eve-0005",
        "username": "eve",
        "full_name": "Eve Jung",
        "email": "eve@corp.com",
        "team": "marketing",
    },
]

# ── 연봉 레코드 ───────────────────────────────────────────────────────────────
# employee_id: Keycloak sub 클레임과 1:1 매핑
SALARIES: list[dict] = [
    {
        "id": "s001",
        "employee_id": "sub-alice-0001",   # Keycloak sub
        "employee_name": "Alice Kim",
        "team": "engineering",
        "base_salary": 72_000_000,          # KRW
        "bonus": 5_000_000,
        "currency": "KRW",
        "effective_date": "2024-01-01",
        "status": "active",
    },
    {
        "id": "s002",
        "employee_id": "sub-bob-0002",
        "employee_name": "Bob Lee",
        "team": "engineering",
        "base_salary": 68_000_000,
        "bonus": 4_000_000,
        "currency": "KRW",
        "effective_date": "2024-01-01",
        "status": "active",
    },
    {
        "id": "s003",
        "employee_id": "sub-carol-0003",
        "employee_name": "Carol Park",
        "team": "marketing",
        "base_salary": 65_000_000,
        "bonus": 3_500_000,
        "currency": "KRW",
        "effective_date": "2024-01-01",
        "status": "active",
    },
    {
        "id": "s004",
        "employee_id": "sub-dave-0004",
        "employee_name": "Dave Choi",
        "team": "engineering",
        "base_salary": 95_000_000,
        "bonus": 10_000_000,
        "currency": "KRW",
        "effective_date": "2024-01-01",
        "status": "active",
    },
    {
        "id": "s005",
        "employee_id": "sub-eve-0005",
        "employee_name": "Eve Jung",
        "team": "marketing",
        "base_salary": 90_000_000,
        "bonus": 9_000_000,
        "currency": "KRW",
        "effective_date": "2024-01-01",
        "status": "active",
    },
]


# ── Helper accessors ──────────────────────────────────────────────────────────

def get_salary_by_id(salary_id: str) -> Optional[dict]:
    return next((s for s in SALARIES if s["id"] == salary_id), None)


def get_salary_by_employee(employee_id: str) -> Optional[dict]:
    """Keycloak sub 클레임으로 연봉 레코드 조회"""
    return next((s for s in SALARIES if s["employee_id"] == employee_id), None)


def get_salaries_by_team(team: str) -> list[dict]:
    return [s for s in SALARIES if s["team"] == team]
