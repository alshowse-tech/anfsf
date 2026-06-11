#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
SOURCE="${SOURCE:-${PROJECT_ROOT}/.anfsf/runs.db}"
CONTAINER_NAME="${CONTAINER_NAME:-anfsf-postgres}"
DB_NAME="${DB_NAME:-anfsf}"
DB_USER="${DB_USER:-anfsf}"
KEEP=${KEEP:-30}

mkdir -p "${BACKUP_DIR}"

mode="${1:-sqlite}"
timestamp=$(date +%Y%m%d_%H%M%S)

case "${mode}" in
  sqlite)
    echo "[backup] SQLite: ${SOURCE} → ${BACKUP_DIR}/runs.db.${timestamp}"
    cp "${SOURCE}" "${BACKUP_DIR}/runs.db.${timestamp}"
    ;;
  postgres)
    echo "[backup] PostgreSQL: ${DB_NAME} → ${BACKUP_DIR}/${DB_NAME}.${timestamp}.sql"
    docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_DIR}/${DB_NAME}.${timestamp}.sql"
    # Verify backup
    if [ -s "${BACKUP_DIR}/${DB_NAME}.${timestamp}.sql" ]; then
      echo "[backup] Verification: backup is non-empty"
    else
      echo "[backup] WARNING: backup file is empty!" >&2
    fi
    ;;
  *)
    echo "Usage: $0 {sqlite|postgres}" >&2
    exit 1
    ;;
esac

# Cleanup old backups (keep last $KEEP)
ls -1t "${BACKUP_DIR}/"* 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f
echo "[backup] Retained last ${KEEP} backups in ${BACKUP_DIR}"
