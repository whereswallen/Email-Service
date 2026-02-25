# Email-Service

A personal email server, white-label email reselling business, and SaaS integration toolkit.

## What This Is

This project has three layers:

1. **Personal Email Server** — A self-hosted Mailcow mail server for personal/family use on your own domain, with optional Gmail SMTP relay for deliverability.
2. **Standalone Email Reselling** — A passive business reselling white-label email hosting (via OpenSRS/Tucows) to small businesses at 83-90% margins.
3. **VNDR Hub Integration** — An email hosting add-on for the VNDR Hub SaaS platform, giving artisan store owners professional email as part of their subscription.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    You (Operator)                        │
├──────────┬──────────────────┬───────────────────────────┤
│          │                  │                           │
│  Personal Server    Standalone Reselling    VNDR Hub    │
│  (Mailcow on VPS)   (Your Brand)          (Add-On)     │
│          │                  │                           │
│   Postfix/Dovecot     OpenSRS API ◄────── OpenSRS API  │
│   SOGo Webmail             │                    │      │
│   Rspamd                   ▼                    ▼      │
│          │          OpenSRS/Tucows Infrastructure       │
│          │          (mail servers, spam, storage)       │
│          │                                              │
│   Optional: Gmail                                      │
│   SMTP Relay                                           │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
Email-Service/
├── README.md
├── personal/                  # Self-hosted Mailcow setup
│   ├── docker-compose.override.yml
│   ├── config/
│   └── scripts/
├── sdk/                       # OpenSRS API wrapper (shared by standalone + VNDR Hub)
│   ├── opensrs-client/
│   ├── billing/
│   └── types/
├── standalone/                # Standalone reselling business
│   ├── landing-page/
│   └── onboarding/
├── docs/                      # Documentation
│   ├── architecture.md
│   ├── dns-setup-guide.md
│   ├── opensrs-api-guide.md
│   └── vndr-hub-integration.md
├── scripts/                   # Shared utility scripts
└── .gitignore
```

## Quick Start

### Personal Email Server

See [docs/architecture.md](docs/architecture.md) for the full setup guide. Summary:

1. Provision a VPS (Hetzner CX22 recommended, ~$4.50/mo)
2. Configure DNS records (MX, SPF, DKIM, DMARC)
3. Deploy Mailcow via Docker Compose
4. Optionally configure Gmail SMTP relay for outbound deliverability

### Reselling Business

See [docs/opensrs-api-guide.md](docs/opensrs-api-guide.md). Summary:

1. Sign up for an OpenSRS reseller account ($100 deposit → credit)
2. Use the `sdk/opensrs-client/` to provision mailboxes via API
3. Set up Stripe billing for your customers
4. Sell at $3-5/mailbox/month (wholesale cost: $0.50/mailbox/month)

### VNDR Hub Integration

See [docs/vndr-hub-integration.md](docs/vndr-hub-integration.md). Summary:

1. Import the `sdk/` into VNDR Hub's backend
2. Add an "Email" tab to the VNDR Hub dashboard
3. Wire up mailbox provisioning, DNS verification, and metered billing

## Cost Summary

| Item | Monthly Cost |
|------|-------------|
| VPS for personal server (Hetzner CX22) | ~$4.50 |
| Gmail SMTP relay (Google Workspace, optional) | $7.00 |
| OpenSRS mailboxes (wholesale) | $0.50/mailbox |
| **Personal server total** | **~$5-12/mo** |
| **Reselling breakeven** | **~1 customer** |

## License

Private — not open source.
