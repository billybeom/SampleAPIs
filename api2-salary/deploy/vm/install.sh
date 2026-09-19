#!/usr/bin/env bash
# =============================================================================
# install.sh — Salary Management API (api2-salary) Linux VM 설치 스크립트
# 대상 OS : RHEL 8/9, Rocky Linux 8/9, Ubuntu 22.04 LTS
# 실행 권한: sudo 또는 root
# =============================================================================
set -euo pipefail

APP_NAME="salary-api"
APP_DIR="/opt/sample-apis/api2-salary"
SVC_USER="svcapi"
ENV_DIR="/etc/sample-apis"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PYTHON_MIN="3.11"

echo "▶ [1/7] Python ${PYTHON_MIN}+ 설치 확인"
PYTHON_BIN=""
for bin in python3.13 python3.12 python3.11 python3; do
  if command -v "$bin" &>/dev/null; then
    ver=$("$bin" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    major=${ver%%.*}; minor=${ver##*.}
    if [ "$major" -ge 3 ] && [ "$minor" -ge 11 ]; then
      PYTHON_BIN="$bin"
      echo "  ${PYTHON_BIN} (${ver}) 확인됨."
      break
    fi
  fi
done

if [ -z "${PYTHON_BIN}" ]; then
  echo "  Python ${PYTHON_MIN}+ 가 없습니다. 설치합니다..."
  if command -v dnf &>/dev/null; then
    dnf install -y python3.11 python3.11-pip python3.11-venv 2>/dev/null || \
    dnf install -y python3 python3-pip python3-venv
    PYTHON_BIN=$(command -v python3.11 || command -v python3)
  elif command -v apt-get &>/dev/null; then
    apt-get install -y python3.11 python3.11-venv python3-pip
    PYTHON_BIN=$(command -v python3.11)
  else
    echo "  지원하지 않는 패키지 매니저입니다. Python ${PYTHON_MIN}+ 를 수동 설치하세요." >&2
    exit 1
  fi
fi

echo "▶ [2/7] 서비스 계정 생성 (${SVC_USER})"
if ! id "${SVC_USER}" &>/dev/null; then
  useradd --system --no-create-home --shell /sbin/nologin "${SVC_USER}"
  echo "  ${SVC_USER} 계정 생성 완료."
else
  echo "  ${SVC_USER} 계정 이미 존재."
fi

echo "▶ [3/7] 애플리케이션 파일 복사"
mkdir -p "${APP_DIR}"
cp -r "${REPO_ROOT}/app"              "${APP_DIR}/"
cp    "${REPO_ROOT}/requirements.txt" "${APP_DIR}/"

echo "▶ [4/7] Python 가상환경 생성 및 의존성 설치"
"${PYTHON_BIN}" -m venv "${APP_DIR}/venv"
"${APP_DIR}/venv/bin/pip" install --upgrade pip --quiet
"${APP_DIR}/venv/bin/pip" install -r "${APP_DIR}/requirements.txt" --quiet

chown -R "${SVC_USER}:${SVC_USER}" "${APP_DIR}"
echo "  의존성 설치 완료: ${APP_DIR}/venv"

echo "▶ [5/7] 환경변수 파일 배포"
mkdir -p "${ENV_DIR}"
if [ ! -f "${ENV_DIR}/${APP_NAME}.env" ]; then
  cp "${SCRIPT_DIR}/${APP_NAME}.env" "${ENV_DIR}/${APP_NAME}.env"
  chown root:"${SVC_USER}" "${ENV_DIR}/${APP_NAME}.env"
  chmod 640 "${ENV_DIR}/${APP_NAME}.env"
  echo "  환경변수 파일 생성: ${ENV_DIR}/${APP_NAME}.env"
  echo ""
  echo "  ⚠️  JWT_SECRET_KEY 를 반드시 변경하세요:"
  echo "     sudo vi ${ENV_DIR}/${APP_NAME}.env"
  echo "     JWT_SECRET_KEY=\$(openssl rand -hex 32)"
  echo ""
else
  echo "  환경변수 파일 이미 존재 (덮어쓰지 않음): ${ENV_DIR}/${APP_NAME}.env"
fi

echo "▶ [6/7] systemd 서비스 등록"
cp "${SCRIPT_DIR}/${APP_NAME}.service" "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable "${APP_NAME}"
systemctl restart "${APP_NAME}"

echo "▶ [7/7] 서비스 상태 확인"
sleep 3
systemctl status "${APP_NAME}" --no-pager

echo ""
echo "✅ 설치 완료!"
echo "   서비스 상태 : systemctl status ${APP_NAME}"
echo "   로그 확인   : journalctl -u ${APP_NAME} -f"
echo "   API 확인    : curl http://localhost:8000/health"
echo "   Swagger UI  : http://<VM_IP>:8000/docs"
