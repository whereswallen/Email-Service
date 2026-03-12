# Architecture

## Personal Email Server

### Components

The personal mail server runs **Mailcow Dockerized**, which bundles:

| Component | Tool | Purpose |
|-----------|------|---------|
| MTA | Postfix | SMTP — sends and receives mail |
| MDA | Dovecot | IMAP/POP3 — stores and serves mail to clients |
| Webmail | SOGo | Browser-based email, calendar, contacts |
| Spam Filter | Rspamd | ML-powered spam detection |
| Antivirus | ClamAV | Attachment scanning |
| Admin Panel | Mailcow UI | Manage domains, users, aliases |
| Reverse Proxy | Nginx | TLS termination, HTTPS |
| DNS Resolver | Unbound | Local resolver for blacklist checks |
| Database | MariaDB | Configuration and metadata |
| Search | Solr | Full-text email search |

### Deployment Diagram

```
┌──────────────────────────────────────────────┐
│              VPS (Hetzner CX22)              │
│              4GB RAM / 2 vCPU                │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │         Docker Compose (Mailcow)        │ │
│  │                                         │ │
│  │  Internet ──► Nginx ──► Postfix ──►     │ │
│  │                  │       Dovecot        │ │
│  │                  │         │            │ │
│  │                  ▼         ▼            │ │
│  │               SOGo     MariaDB          │ │
│  │               Rspamd   Solr             │ │
│  │               ClamAV   Unbound          │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  Ports: 25 (SMTP), 465/587 (SMTPS),         │
│         143/993 (IMAP), 80/443 (HTTPS)       │
└──────────────────────────────────────────────┘
```

### Outbound Mail Flow

**Without Gmail relay (direct sending):**
```
Your server ──► Recipient's MX server ──► Recipient inbox
  (your IP)         SPF/DKIM/DMARC check
```

**With Gmail SMTP relay (recommended for deliverability):**
```
Your server ──► smtp-relay.gmail.com ──► Recipient's MX ──► Inbox
  Postfix          Google's IP              Sees Google IP
  relayhost        reputation               = trusted
```

### VPS Requirements

- **Provider**: Hetzner CX22 (~$4.50/mo) — allows port 25, PTR records
- **RAM**: 4GB minimum (ClamAV is memory-hungry)
- **Storage**: 40GB+ (email grows over time)
- **IP**: Clean IPv4, not on blacklists (check mxtoolbox.com)
- **PTR/rDNS**: Must point to `mail.yourdomain.com`

### DNS Records

| Record | Type | Value |
|--------|------|-------|
| `yourdomain.com` | MX | `10 mail.yourdomain.com.` |
| `mail.yourdomain.com` | A | `<server-ip>` |
| `yourdomain.com` | TXT (SPF) | `v=spf1 a mx include:_spf.google.com -all` |
| `dkim._domainkey.yourdomain.com` | TXT (DKIM) | `v=DKIM1; k=rsa; p=<pubkey>` |
| `_dmarc.yourdomain.com` | TXT (DMARC) | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` |

Remove `include:_spf.google.com` from SPF if not using Gmail relay.

---

## Reselling Architecture

The reselling side is infrastructure-free. OpenSRS handles everything:

```
Customer ──► Your Brand (billing + onboarding) ──► OpenSRS API ──► OpenSRS Mail Servers
                                                                     (Canadian DCs)
                                                                     99.9% uptime SLA
```

Your code only handles:
1. OpenSRS API calls (provision/delete mailboxes)
2. Stripe billing (recurring charges)
3. DNS verification (check customer's records are correct)

---

## VNDR Hub Integration

```
VNDR Hub Dashboard
  └── "Email" tab
       ├── Setup wizard (domain + DNS verification)
       ├── Mailbox management (CRUD)
       ├── Settings (forwarding, auto-reply)
       └── Billing (metered, on VNDR Hub invoice)
              │
              ▼
        sdk/opensrs-client/  (this repo)
              │
              ▼
        OpenSRS Infrastructure
```

The `sdk/` directory in this repo is imported by VNDR Hub as a dependency.
