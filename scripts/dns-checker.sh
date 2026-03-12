#!/usr/bin/env bash
#
# DNS Checker — Verify email DNS records for a domain.
# Usage: ./dns-checker.sh <domain>
#
# Checks MX, SPF, DKIM, and DMARC records and reports pass/fail.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <domain>"
  echo "Example: $0 customerbusiness.com"
  exit 1
fi

DOMAIN="$1"
PASS="PASS"
FAIL="FAIL"
ERRORS=0

echo "============================================"
echo "DNS Email Check: $DOMAIN"
echo "============================================"
echo ""

# Check MX records
echo "--- MX Records ---"
MX_RECORDS=$(dig +short MX "$DOMAIN" 2>/dev/null)
if [ -n "$MX_RECORDS" ]; then
  echo "$PASS: MX records found:"
  echo "$MX_RECORDS" | while read -r line; do echo "  $line"; done
else
  echo "$FAIL: No MX records found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check SPF record
echo "--- SPF Record ---"
SPF_RECORD=$(dig +short TXT "$DOMAIN" 2>/dev/null | grep "v=spf1" || true)
if [ -n "$SPF_RECORD" ]; then
  echo "$PASS: SPF record found:"
  echo "  $SPF_RECORD"
else
  echo "$FAIL: No SPF record found"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check DKIM record
echo "--- DKIM Record ---"
DKIM_RECORD=$(dig +short TXT "default._domainkey.$DOMAIN" 2>/dev/null | grep "DKIM1" || true)
if [ -n "$DKIM_RECORD" ]; then
  echo "$PASS: DKIM record found"
else
  echo "$FAIL: No DKIM record at default._domainkey.$DOMAIN"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check DMARC record
echo "--- DMARC Record ---"
DMARC_RECORD=$(dig +short TXT "_dmarc.$DOMAIN" 2>/dev/null | grep "DMARC1" || true)
if [ -n "$DMARC_RECORD" ]; then
  echo "$PASS: DMARC record found:"
  echo "  $DMARC_RECORD"
else
  echo "$FAIL: No DMARC record at _dmarc.$DOMAIN"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check PTR/rDNS (for personal server only)
echo "--- Reverse DNS (PTR) ---"
A_RECORD=$(dig +short A "mail.$DOMAIN" 2>/dev/null || true)
if [ -n "$A_RECORD" ]; then
  PTR_RECORD=$(dig +short -x "$A_RECORD" 2>/dev/null || true)
  if [ -n "$PTR_RECORD" ]; then
    echo "$PASS: PTR record for $A_RECORD -> $PTR_RECORD"
  else
    echo "$FAIL: No PTR record for $A_RECORD (set rDNS in VPS control panel)"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "SKIP: No A record for mail.$DOMAIN (only needed for self-hosted server)"
fi
echo ""

# Summary
echo "============================================"
if [ $ERRORS -eq 0 ]; then
  echo "All checks passed!"
else
  echo "$ERRORS check(s) failed. See above for details."
fi
echo "============================================"
