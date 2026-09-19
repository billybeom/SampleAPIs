#!/usr/bin/env bash
# =============================================================================
# local-dev/init-keycloak.sh
#
# Docker Compose 실행 후 Keycloak이 완전히 뜬 다음,
# 사용자 UUID(sub)를 확인하고 api2-salary/app/data/store.py 를
# 자동으로 업데이트하는 스크립트입니다.
#
# 사용법:
#   chmod +x init-keycloak.sh
#   ./init-keycloak.sh
# =============================================================================

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-corp}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
STORE_FILE="../api2-salary/app/data/store.py"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}=== Keycloak 초기화 스크립트 ===${NC}"

# ── 1. jq 설치 확인 ──────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  echo -e "${RED}[ERROR] jq 가 필요합니다. 설치: brew install jq / apt install jq${NC}"
  exit 1
fi

# ── 2. Keycloak 준비 대기 ─────────────────────────────────────────────────────
echo -e "${YELLOW}▶ Keycloak 준비 대기 중...${NC}"
for i in {1..30}; do
  if curl -sf "${KEYCLOAK_URL}/health/ready" &>/dev/null; then
    echo -e "${GREEN}✓ Keycloak 준비 완료${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}[ERROR] Keycloak이 응답하지 않습니다. docker compose up 을 먼저 실행하세요.${NC}"
    exit 1
  fi
  echo "  ($i/30) 대기 중..."
  sleep 3
done

# ── 3. Admin 토큰 발급 ────────────────────────────────────────────────────────
echo -e "${YELLOW}▶ Admin 토큰 발급 중...${NC}"
ADMIN_TOKEN=$(curl -sf \
  -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASS}" \
  | jq -r '.access_token')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo -e "${RED}[ERROR] Admin 토큰 발급 실패. Keycloak 관리자 계정을 확인하세요.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Admin 토큰 발급 성공${NC}"

# ── 4. 사용자 목록 조회 및 UUID 확인 ─────────────────────────────────────────
echo -e "${YELLOW}▶ 사용자 UUID 조회 중...${NC}"
USERS_JSON=$(curl -sf \
  -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?max=50" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

declare -A USER_IDS
for username in alice bob carol dave hr-system; do
  UUID=$(echo "$USERS_JSON" | jq -r ".[] | select(.username == \"${username}\") | .id")
  if [ -z "$UUID" ] || [ "$UUID" = "null" ]; then
    echo -e "${RED}[WARNING] 사용자 '${username}'를 찾을 수 없습니다. Realm import가 완료됐는지 확인하세요.${NC}"
    UUID="MISSING-${username}"
  fi
  USER_IDS[$username]="$UUID"
  echo "  ${username}: ${UUID}"
done

# ── 5. store.py 업데이트 ──────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ store.py 업데이트 중: ${STORE_FILE}${NC}"

if [ ! -f "${STORE_FILE}" ]; then
  echo -e "${RED}[ERROR] ${STORE_FILE} 파일을 찾을 수 없습니다.${NC}"
  exit 1
fi

# 기존 파일 백업
cp "${STORE_FILE}" "${STORE_FILE}.bak"
echo "  백업 생성: ${STORE_FILE}.bak"

# 더미 sub 값을 실제 UUID로 교체
sed -i.tmp \
  -e "s/\"employee_id\": \"sub-alice-[^\"]*\"/\"employee_id\": \"${USER_IDS[alice]}\"/g" \
  -e "s/\"employee_id\": \"sub-bob-[^\"]*\"/\"employee_id\": \"${USER_IDS[bob]}\"/g" \
  -e "s/\"employee_id\": \"sub-carol-[^\"]*\"/\"employee_id\": \"${USER_IDS[carol]}\"/g" \
  -e "s/\"employee_id\": \"sub-dave-[^\"]*\"/\"employee_id\": \"${USER_IDS[dave]}\"/g" \
  -e "s/\"employee_id\": \"sub-hr-[^\"]*\"/\"employee_id\": \"${USER_IDS[hr-system]}\"/g" \
  "${STORE_FILE}"

rm -f "${STORE_FILE}.tmp"
echo -e "${GREEN}✓ store.py 업데이트 완료${NC}"

# ── 6. 토큰 발급 테스트 ───────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}▶ alice 토큰 발급 테스트...${NC}"
ALICE_TOKEN=$(curl -sf \
  -X POST "${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=postman-client" \
  -d "username=alice" \
  -d "password=alice1234" \
  | jq -r '.access_token')

if [ -z "$ALICE_TOKEN" ] || [ "$ALICE_TOKEN" = "null" ]; then
  echo -e "${RED}[ERROR] alice 토큰 발급 실패.${NC}"
else
  echo -e "${GREEN}✓ alice 토큰 발급 성공${NC}"
  echo ""
  echo -e "${CYAN}=== 빠른 테스트 ========================================${NC}"
  echo ""
  echo "# alice 연봉 조회 (본인):"
  echo "curl -H \"Authorization: Bearer \$ALICE_TOKEN\" \\"
  echo "     http://localhost:8001/salaries/me"
  echo ""
  ALICE_TOKEN_DISPLAY="${ALICE_TOKEN:0:60}..."
  echo "# ALICE_TOKEN 미리보기: ${ALICE_TOKEN_DISPLAY}"
fi

echo ""
echo -e "${CYAN}=== 초기화 완료 =======================================${NC}"
echo ""
echo "다음 사용자로 로그인 가능합니다:"
echo "  alice      / alice1234    (employee, engineering)"
echo "  bob        / bob1234      (employee, engineering)"
echo "  carol      / carol1234    (manager,  engineering)"
echo "  dave       / dave1234     (employee, marketing)"
echo "  hr-system  / hrsystem1234 (hr_system)"
echo ""
echo "Keycloak Admin Console: ${KEYCLOAK_URL}/admin"
echo "  ID: ${ADMIN_USER} / PW: ${ADMIN_PASS}"
echo ""
echo "Swagger UI (Salary API): http://localhost:8001/docs"
echo "Swagger UI (Library API): http://localhost:3000/ (API 정보 JSON)"
