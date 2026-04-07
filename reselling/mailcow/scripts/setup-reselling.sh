#!/usr/bin/env bash
set -euo pipefail

# Mailcow Reselling VPS Setup
# Run on a fresh Ubuntu 22.04+ / Debian 12+ VPS with 4GB+ RAM

echo "=== Mailcow Reselling Server Setup ==="

# Check root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Check RAM
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 3500 ]; then
  echo "WARNING: Less than 4GB RAM detected ($TOTAL_RAM MB). Mailcow may not run well."
  echo "Proceeding anyway..."
fi

# Create swap if not exists
if ! swapon --show | grep -q '/swapfile'; then
  echo "Creating 2GB swap file..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Update system
echo "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Verify Docker Compose v2
if ! docker compose version &> /dev/null; then
  echo "ERROR: Docker Compose v2 not found. Please install Docker Compose plugin."
  exit 1
fi

# Configure firewall
echo "Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 25/tcp    # SMTP
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 465/tcp   # SMTPS
ufw allow 587/tcp   # Submission
ufw allow 993/tcp   # IMAPS
ufw allow 4190/tcp  # Sieve
ufw --force enable

# Clone Mailcow
MAILCOW_DIR="/opt/mailcow-dockerized"
if [ ! -d "$MAILCOW_DIR" ]; then
  echo "Cloning Mailcow..."
  cd /opt
  git clone https://github.com/mailcow/mailcow-dockerized.git
fi

cd "$MAILCOW_DIR"

# Generate config
echo "Generating Mailcow configuration..."
echo "Enter your mail hostname (e.g., mail.yourbrand.com):"
read -r HOSTNAME
./generate_config.sh <<< "$HOSTNAME"

# Apply reselling overrides
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/docker-compose.override.yml" ]; then
  echo "Applying reselling resource limits..."
  cp "$SCRIPT_DIR/docker-compose.override.yml" "$MAILCOW_DIR/docker-compose.override.yml"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Review $MAILCOW_DIR/mailcow.conf"
echo "2. Set your DNS records:"
echo "   - A record: $HOSTNAME -> $(curl -s ifconfig.me)"
echo "   - PTR/rDNS: $(curl -s ifconfig.me) -> $HOSTNAME"
echo "3. Start Mailcow: cd $MAILCOW_DIR && docker compose up -d"
echo "4. Access admin panel: https://$HOSTNAME (default: admin/moohoo)"
echo "5. Generate API key in admin panel -> Configuration -> API"
echo "6. Set up backup cron job: crontab -e"
echo "   0 3 * * * /path/to/backup.sh"
echo ""
