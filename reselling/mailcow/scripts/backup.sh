#!/usr/bin/env bash
set -euo pipefail

# Mailcow Reselling Backup Script
# Run as daily cron job: 0 3 * * * /path/to/backup.sh

MAILCOW_DIR="/opt/mailcow-dockerized"
BACKUP_DIR="/opt/mailcow-backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Mailcow backup..."

# Use Mailcow's built-in backup script
cd "$MAILCOW_DIR"
if [ -f "helper-scripts/backup_and_restore.sh" ]; then
  MAILCOW_BACKUP_LOCATION="$BACKUP_DIR" ./helper-scripts/backup_and_restore.sh backup all --delete-days "$RETENTION_DAYS"
else
  # Fallback: manual backup
  echo "Mailcow backup script not found, performing manual backup..."

  # Backup MariaDB
  docker compose exec -T mysql-mailcow mysqldump --all-databases > "$BACKUP_DIR/db_$DATE.sql"
  gzip "$BACKUP_DIR/db_$DATE.sql"

  # Backup mail data (vmail volume)
  docker run --rm \
    -v mailcowdockerized_vmail-vol-1:/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/vmail_$DATE.tar.gz" -C /data .

  # Backup config
  cp "$MAILCOW_DIR/mailcow.conf" "$BACKUP_DIR/mailcow.conf.$DATE"

  # Cleanup old backups
  find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -name "vmail_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -name "mailcow.conf.*" -mtime +"$RETENTION_DAYS" -delete
fi

echo "[$(date)] Backup complete. Location: $BACKUP_DIR"

# Optional: upload to S3/B2
# Uncomment and configure:
# aws s3 sync "$BACKUP_DIR" s3://your-bucket/mailcow-backups/ --delete
