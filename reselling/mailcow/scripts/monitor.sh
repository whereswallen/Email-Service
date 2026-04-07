#!/usr/bin/env bash
set -euo pipefail

# Mailcow Reselling Health Monitor
# Run as cron job: */5 * * * * /path/to/monitor.sh

MAILCOW_DIR="/opt/mailcow-dockerized"
MAILCOW_HOSTNAME="${MAILCOW_HOSTNAME:-mail.yourdomain.com}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"

echo "[$(date)] Running Mailcow health check..."

ERRORS=()

# Check all containers are running
cd "$MAILCOW_DIR"
STOPPED=$(docker compose ps --status exited --format '{{.Name}}' 2>/dev/null || echo "")
if [ -n "$STOPPED" ]; then
  ERRORS+=("Stopped containers: $STOPPED")
fi

# Check disk space (alert if > 85%)
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
  ERRORS+=("Disk usage: ${DISK_USAGE}%")
fi

# Check RAM usage (alert if > 90%)
RAM_USAGE=$(free | awk '/^Mem:/{printf "%.0f", $3/$2 * 100}')
if [ "$RAM_USAGE" -gt 90 ]; then
  ERRORS+=("RAM usage: ${RAM_USAGE}%")
fi

# Check SMTP (port 25)
if ! nc -z -w5 localhost 25 2>/dev/null; then
  ERRORS+=("SMTP (port 25) not responding")
fi

# Check IMAPS (port 993)
if ! nc -z -w5 localhost 993 2>/dev/null; then
  ERRORS+=("IMAPS (port 993) not responding")
fi

# Check HTTPS (port 443)
if ! curl -sf -o /dev/null --max-time 10 "https://$MAILCOW_HOSTNAME" 2>/dev/null; then
  ERRORS+=("HTTPS not responding at $MAILCOW_HOSTNAME")
fi

# Check mail queue size
QUEUE_SIZE=$(docker compose exec -T postfix-mailcow mailq 2>/dev/null | tail -1 | grep -oP '\d+' || echo "0")
if [ "$QUEUE_SIZE" -gt 100 ]; then
  ERRORS+=("Mail queue: $QUEUE_SIZE messages (possible delivery issue)")
fi

# Check TLS certificate
CERT_EXPIRY=$(echo | openssl s_client -connect "$MAILCOW_HOSTNAME:443" -servername "$MAILCOW_HOSTNAME" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
if [ -n "$CERT_EXPIRY" ]; then
  EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$DAYS_LEFT" -lt 14 ]; then
    ERRORS+=("TLS certificate expires in $DAYS_LEFT days")
  fi
fi

# Report
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "ALERT: ${#ERRORS[@]} issue(s) detected:"
  for err in "${ERRORS[@]}"; do
    echo "  - $err"
  done
  # Uncomment to send email alert:
  # echo "${ERRORS[*]}" | mail -s "Mailcow Alert: ${#ERRORS[@]} issue(s)" "$ALERT_EMAIL"
else
  echo "All checks passed."
fi
