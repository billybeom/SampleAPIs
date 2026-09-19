"""
Salary router — CRUD with role-based access control.

Permission matrix:
  ┌───────────┬──────────────────────┬──────────────────────┬────────────┐
  │ Role      │ GET (read)           │ PUT/PATCH (update)   │ DELETE     │
  ├───────────┼──────────────────────┼──────────────────────┼────────────┤
  │ employee  │ own record only      │ own record only      │ ✗          │
  │ manager   │ own team records     │ own team records     │ ✗          │
  │ hr_system │ all records          │ all records          │ all records│
  └───────────┴──────────────────────┴──────────────────────┴────────────┘
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.auth.security import (
    get_current_user,
    assert_can_read_salary,
    assert_can_update_salary,
    assert_can_delete_salary,
)
from app.data.store import (
    SALARIES,
    get_salary_by_id,
    get_salary_by_employee,
    get_salaries_by_team,
)

router = APIRouter(prefix="/salaries", tags=["Salary"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class SalaryUpdate(BaseModel):
    base_salary: Optional[int] = None
    bonus: Optional[int] = None
    effective_date: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    summary="Get your own salary record",
    description="Any authenticated user can call this to retrieve their own salary.",
)
async def get_my_salary(current_user: dict = Depends(get_current_user)):
    record = get_salary_by_employee(current_user["id"])
    if not record:
        raise HTTPException(status_code=404, detail="No salary record found for this user")
    return record


@router.get(
    "/",
    summary="List salary records (scope determined by role)",
    description="""
Returns salary records visible to the caller based on their role:
- **employee**: returns only their own record
- **manager**: returns all records in their team
- **hr_system**: returns all records
""",
)
async def list_salaries(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]

    if role == "hr_system":
        return {"total": len(SALARIES), "data": SALARIES}

    if role == "manager":
        records = get_salaries_by_team(current_user["team"])
        return {"total": len(records), "data": records}

    # employee — own record only
    record = get_salary_by_employee(current_user["id"])
    data = [record] if record else []
    return {"total": len(data), "data": data}


@router.get(
    "/{salary_id}",
    summary="Get a salary record by ID",
    description="""
Retrieve a specific salary record by its ID.
Access is granted only if your role permits viewing this record.
""",
)
async def get_salary(salary_id: str, current_user: dict = Depends(get_current_user)):
    record = get_salary_by_id(salary_id)
    if not record:
        raise HTTPException(status_code=404, detail="Salary record not found")
    assert_can_read_salary(current_user, record)
    return record


@router.patch(
    "/{salary_id}",
    summary="Update a salary record (partial)",
    description="""
Update base_salary, bonus, or effective_date of a salary record.

Permission rules:
- **employee**: can only update their own record
- **manager**: can update any record in their team
- **hr_system**: can update any record
""",
)
async def update_salary(
    salary_id: str,
    payload: SalaryUpdate,
    current_user: dict = Depends(get_current_user),
):
    record = get_salary_by_id(salary_id)
    if not record:
        raise HTTPException(status_code=404, detail="Salary record not found")
    assert_can_update_salary(current_user, record)

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    record.update(updates)
    return {
        "message": "Salary record updated successfully",
        "updated_by": current_user["username"],
        "updated_by_role": current_user["role"],
        "record": record,
    }


@router.delete(
    "/{salary_id}",
    summary="Delete a salary record (hr_system only)",
    description="""
Permanently remove a salary record from the system.

**Only the `hr_system` role can call this endpoint.**
Typical use-case: employee offboarding process triggered by HR workflow.
""",
)
async def delete_salary(
    salary_id: str,
    current_user: dict = Depends(get_current_user),
):
    assert_can_delete_salary(current_user)

    idx = next((i for i, s in enumerate(SALARIES) if s["id"] == salary_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Salary record not found")

    deleted = SALARIES.pop(idx)
    return {
        "message": "Salary record deleted successfully (employee offboarded)",
        "deleted_by": current_user["username"],
        "deleted_record": deleted,
    }
