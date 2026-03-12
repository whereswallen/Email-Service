# VNDR Hub Email Integration

## Overview

Email hosting is offered as an add-on service within the VNDR Hub platform. VNDR Hub users (artisan stores, vendors) can add professional email (`hello@theirstore.com`) directly from their dashboard.

## Integration Model

**Phase 1: Add-On Service**
- "Email" tab in VNDR Hub dashboard
- Users opt-in, pick their domain, provision mailboxes
- Billed as a line item on their existing VNDR Hub invoice
- $3-5/mailbox/month (OpenSRS wholesale: $0.50/mailbox)

**Phase 2: Tiered Bundles** (future)
- Include mailboxes in higher VNDR Hub plan tiers
- Free first mailbox as a churn-reduction hook

## User Flow

```
VNDR Hub Dashboard
  │
  ├── Store Management (existing)
  ├── Products (existing)
  ├── ...
  │
  └── Email (new tab)
       │
       ├── [No email yet] → "Add professional email"
       │     │
       │     ├── Enter domain (yourbusiness.com)
       │     ├── DNS setup wizard (shows records to add)
       │     ├── Verify DNS ← automated checker
       │     └── Create first mailbox
       │
       └── [Email active] → Manage mailboxes
             │
             ├── List mailboxes (info@, hello@, team@)
             ├── Add mailbox → provision via OpenSRS
             ├── Remove mailbox → delete via OpenSRS
             ├── Reset password
             └── Webmail link → opens OpenSRS webmail
```

## Technical Architecture

### Import the SDK

The `sdk/` directory from this repo is imported into VNDR Hub:

```typescript
import { OpenSRSClient } from '@your-org/email-service/opensrs-client';
import { verifyDNS } from '@your-org/email-service/opensrs-client/dns-verify';
```

### API Endpoints to Add to VNDR Hub

```
POST   /api/email/domains          → Register domain with OpenSRS
GET    /api/email/domains/:id/dns  → Get required DNS records
POST   /api/email/domains/:id/verify → Check DNS configuration
POST   /api/email/mailboxes        → Create mailbox
DELETE /api/email/mailboxes/:id    → Delete mailbox
POST   /api/email/mailboxes/:id/reset-password → Reset password
GET    /api/email/mailboxes        → List mailboxes for current user
```

### Database Additions

VNDR Hub's database needs:

```sql
-- Track which VNDR Hub users have email enabled
CREATE TABLE email_domains (
  id UUID PRIMARY KEY,
  vndr_user_id UUID REFERENCES users(id),
  domain VARCHAR(255) NOT NULL,
  dns_verified BOOLEAN DEFAULT FALSE,
  opensrs_domain_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track individual mailboxes
CREATE TABLE email_mailboxes (
  id UUID PRIMARY KEY,
  domain_id UUID REFERENCES email_domains(id),
  address VARCHAR(255) NOT NULL,  -- e.g., "info"
  full_address VARCHAR(255) NOT NULL,  -- e.g., "info@business.com"
  opensrs_mailbox_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Billing

Email is billed as metered usage on the VNDR Hub invoice:

```typescript
// When a mailbox is created:
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 1,  // +1 mailbox
  action: 'increment',
});

// When a mailbox is deleted:
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 1,
  action: 'decrement',
});
```

Alternatively, use a flat per-mailbox price added as a Stripe subscription line item.

## DNS Verification Wizard

The DNS wizard guides users through setup:

1. Show required records (MX, SPF, DKIM, DMARC) with copy buttons
2. Auto-check every 30 seconds after user says "I've added them"
3. Show green checkmarks as each record is verified
4. Enable mailbox creation only after all records pass

```typescript
import { verifyDNS } from '../sdk/opensrs-client/dns-verify';

const result = await verifyDNS('customerdomain.com');
// result: { mx: true, spf: true, dkim: false, dmarc: true }
```

## Revenue Projections

At 20% adoption among VNDR Hub users:

| VNDR Hub Users | Email Adopters | Mailboxes (3/user avg) | Monthly Profit |
|---------------|---------------|----------------------|----------------|
| 50 | 10 | 30 | $105 |
| 200 | 40 | 120 | $420 |
| 500 | 100 | 300 | $1,050 |
| 1,000 | 200 | 600 | $2,100 |
