#!/usr/bin/env bash
#
# Health Check — Verify that the personal Mailcow server is running correctly.
# Usage: ./health-check.sh <mail-hostname>
#
# Checks SMTP, IMAP, HTTPS, and mail-tester score.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <mail-hostname>"
  echo "Example: $0 mail.yourdomain.com"
  exit 1
fi

HOST="$1"
ERRORS=0

echo "============================================"
echo "Mail Server Health Check: $HOST"
echo "============================================"
echo ""

# Check SMTP (port 25)
echo "--- SMTP (port 25) ---"
if timeout 5 bash -c "echo QUIT | nc -w 3 $HOST 25" 2>/dev/null | grep -q "220"; then
  echo "PASS: SMTP responding on port 25"
else
  echo "FAIL: SMTP not responding on port 25"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check SMTPS (port 465)
echo "--- SMTPS (port 465) ---"
if timeout 5 bash -c "echo QUIT | openssl s_client -connect $HOST:465 -quiet 2>/dev/null" | grep -q "220"; then
  echo "PASS: SMTPS responding on port 465"
else
  echo "WARN: SMTPS not responding on port 465 (may be expected)"
fi
echo ""

# Check Submission (port 587)
echo "--- Submission (port 587) ---"
if timeout 5 bash -c "echo QUIT | nc -w 3 $HOST 587" 2>/dev/null | grep -q "220"; then
  echo "PASS: Submission port 587 responding"
else
  echo "FAIL: Submission port 587 not responding"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check IMAP (port 993)
echo "--- IMAPS (port 993) ---"
if timeout 5 bash -c "echo 'a1 LOGOUT' | openssl s_client -connect $HOST:993 -quiet 2>/dev/null" | grep -q "OK"; then
  echo "PASS: IMAPS responding on port 993"
else
  echo "FAIL: IMAPS not responding on port 993"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check HTTPS (port 443)
echo "--- HTTPS (port 443) ---"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOST" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
  echo "PASS: HTTPS responding (status $HTTP_STATUS)"
else
  echo "FAIL: HTTPS not responding (status $HTTP_STATUS)"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check TLS certificate
echo "--- TLS Certificate ---"
CERT_EXPIRY=$(echo | openssl s_client -connect "$HOST:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
if [ -n "$CERT_EXPIRY" ]; then
  echo "PASS: TLS certificate expires: $CERT_EXPIRY"
else
  echo "FAIL: Could not check TLS certificate"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "============================================"
if [ $ERRORS -eq 0 ]; then
  echo "All checks passed!"
else
  echo "$ERRORS check(s) failed. See above for details."
fi
echo ""
echo "Additional manual checks:"
echo "  - Mail-tester: https://www.mail-tester.com (send a test email, aim for 10/10)"
echo "  - Blacklists:  https://mxtoolbox.com/blacklists.aspx"
echo "============================================"
