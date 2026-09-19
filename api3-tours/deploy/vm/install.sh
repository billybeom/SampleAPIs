#!/usr/bin/env bash
# =============================================================================
# install.sh — Tours Management API (api3-tours) Linux VM 설치 스크립트
# 대상 OS : RHEL 8/9, Rocky Linux 8/9, Ubuntu 22.04 LTS
# 실행 권한: sudo 또는 root
# =============================================================================
set -euo pipefail

APP_NAME="tours-api"
APP_DIR="/opt/sample-apis/api3-tours"
SVC_USER="svcapi"
ENV_DIR="/etc/sample-apis"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "▶ [1/6] Node.js 설치 확인"
if ! command -v node &>/dev/null; then
  echo "  Node.js 가 없습니다. NodeSource 저장소로 설치합니다 (Node 20 LTS)..."
  # RHEL/Rocky
  if command -v dnf &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  # Ubuntu/Debian
  elif command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    echo "  지원하지 않는 패키지 매니저입니다. Node.js 를 수동 설치하세요." >&2
    exit 1
  fi
else
  echo "  Node.js $(node -v) 확인됨."
fi

echo "▶ [2/6] 서비스 계정 생성 (${SVC_USER})"
if ! id "${SVC_USER}" &>/dev/null; then
  useradd --system --no-create-home --shell /sbin/nologin "${SVC_USER}"
  echo "  ${SVC_USER} 계정 생성 완료."
else
  echo "  ${SVC_USER} 계정 이미 존재."
fi

echo "▶ [3/6] 애플리케이션 파일 복사"
mkdir -p "${APP_DIR}"
cp -r "${REPO_ROOT}/src"          "${APP_DIR}/"
cp    "${REPO_ROOT}/package.json" "${APP_DIR}/"
cp    "${REPO_ROOT}/package-lock.json" "${APP_DIR}/" 2>/dev/null || true

echo "  npm 의존성 설치 중..."
cd "${APP_DIR}"
npm ci --omit=dev

chown -R "${SVC_USER}:${SVC_USER}" "${APP_DIR}"
echo "  파일 복사 완료: ${APP_DIR}"

echo "▶ [4/6] 환경변수 파일 배포"
mkdir -p "${ENV_DIR}"
if [ ! -f "${ENV_DIR}/${APP_NAME}.env" ]; then
  cp "${SCRIPT_DIR}/${APP_NAME}.env" "${ENV_DIR}/${APP_NAME}.env"
  chown root:"${SVC_USER}" "${ENV_DIR}/${APP_NAME}.env"
  chmod 640 "${ENV_DIR}/${APP_NAME}.env"
  echo "  환경변수 파일 생성: ${ENV_DIR}/${APP_NAME}.env"
else
  echo "  환경변수 파일 이미 존재 (덮어쓰지 않음): ${ENV_DIR}/${APP_NAME}.env"
fi

echo "▶ [5/6] systemd 서비스 등록"
cp "${SCRIPT_DIR}/${APP_NAME}.service" "${SERVICE_FILE}"
systemctl daemon-reload
systemctl enable "${APP_NAME}"
systemctl restart "${APP_NAME}"

echo "▶ [6/6] 서비스 상태 확인"
sleep 2
systemctl status "${APP_NAME}" --no-pager

echo ""
echo "✅ 설치 완료!"
echo "   서비스 상태 : systemctl status ${APP_NAME}"
echo "   로그 확인   : journalctl -u ${APP_NAME} -f"
echo "   API 확인    : curl http://localhost:3002/health"
