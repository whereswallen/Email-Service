#!/usr/bin/env bash
#
# Personal Mail Server Setup Script
#
# Automates the initial setup of Mailcow on a fresh VPS.
# Run this on your VPS after SSH-ing in.
#
# Prerequisites:
#   - Ubuntu 22.04+ or Debian 12+
#   - Root access
#   - Domain DNS already configured (MX, A records)
#   - PTR/rDNS set in VPS control panel
#
# Usage: sudo bash setup.sh <hostname>
# Example: sudo bash setup.sh mail.yourdomain.com

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: sudo bash $0 <hostname>"
  echo "Example: sudo bash $0 mail.yourdomain.com"
  exit 1
fi

HOSTNAME="$1"

echo "============================================"
echo "Personal Mail Server Setup"
echo "Hostname: $HOSTNAME"
echo "============================================"
echo ""

# 1. System updates
echo "--- Updating system packages ---"
apt-get update && apt-get upgrade -y

# 2. Install Docker
echo "--- Installing Docker ---"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed successfully"
else
  echo "Docker already installed"
fi

# 3. Install Docker Compose (v2)
echo "--- Checking Docker Compose ---"
if docker compose version &>/dev/null; then
  echo "Docker Compose v2 available"
else
  echo "ERROR: Docker Compose v2 not found. Install Docker CE from get.docker.com"
  exit 1
fi

# 4. Set timezone
echo "--- Setting timezone ---"
timedatectl set-timezone UTC

# 5. Clone Mailcow
echo "--- Cloning Mailcow ---"
cd /opt
if [ ! -d "mailcow-dockerized" ]; then
  git clone https://github.com/mailcow/mailcow-dockerized
  cd mailcow-dockerized
else
  echo "Mailcow already cloned"
  cd mailcow-dockerized
  git pull
fi

# 6. Generate Mailcow config
echo "--- Generating Mailcow configuration ---"
if [ ! -f "mailcow.conf" ]; then
  ./generate_config.sh <<< "$HOSTNAME"
  echo "Mailcow config generated. Review /opt/mailcow-dockerized/mailcow.conf"
else
  echo "mailcow.conf already exists"
fi

echo ""
echo "============================================"
echo "Setup complete! Next steps:"
echo ""
echo "1. Review config:  nano /opt/mailcow-dockerized/mailcow.conf"
echo "2. Start Mailcow:  cd /opt/mailcow-dockerized && docker compose up -d"
echo "3. Access admin:    https://$HOSTNAME (admin / moohoo)"
echo "4. Change admin password immediately!"
echo "5. Add your domain and create mailboxes in the admin panel"
echo "6. Generate DKIM keys and add to DNS"
echo "============================================"
