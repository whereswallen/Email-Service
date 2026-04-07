# OpenSRS vs Mailcow: Email Reselling Comparison

## Side-by-Side Analysis

| Dimension | OpenSRS (API Reselling) | Mailcow (Self-Hosted) |
|-----------|------------------------|----------------------|
| **Architecture** | Pure API calls to Tucows servers | Full mail stack in Docker containers |
| **Infrastructure** | None -- OpenSRS manages everything | VPS with 4-8GB RAM (Hetzner CX22/CX32) |
| **Cost per mailbox** | $0.50/mo wholesale | $0 (fixed VPS cost) |
| **VPS cost** | $0 | ~$8-20/mo depending on size |
| **Cost @ 10 mailboxes** | $5/mo | ~$8/mo |
| **Cost @ 50 mailboxes** | $25/mo | ~$8/mo |
| **Cost @ 200 mailboxes** | $100/mo | ~$15/mo |
| **Cost @ 500 mailboxes** | $250/mo | ~$20/mo |
| **Break-even point** | -- | ~16 mailboxes |
| **Setup time** | Minutes (API key) | Hours (VPS + DNS + warm-up) |
| **Maintenance** | Zero | Ongoing (updates, monitoring, backups) |
| **Storage/mailbox** | 5GB fixed | Unlimited (disk-bound) |
| **Deliverability** | Excellent (Tucows IP reputation) | Must build IP reputation |
| **SLA** | 99.9% contractual | Self-managed |
| **Webmail** | White-label included | SOGo (full-featured) |
| **Control** | API-limited | Full root access |
| **Risk** | Vendor dependency | Operational responsibility |
| **API type** | XML over HTTPS | REST/JSON |
| **Multi-tenant** | Handled by OpenSRS | Managed via Mailcow API |

## Recommendation Strategy

1. **Start with OpenSRS** -- zero infrastructure, instant revenue, proven deliverability
2. **Build Mailcow in parallel** -- use expired domains with email reputation to accelerate IP warming
3. **Migrate at scale** -- move high-volume customers to Mailcow when cost savings justify operational overhead
4. **The provider abstraction** makes switching transparent to customers and the API layer

## Mailcow IP Reputation via Expired Domains

The platform's unique advantage: acquire expired domains with established SPF/DKIM/DMARC history.
These domains skip most of Mailcow's 4-8 week IP warm-up, reducing it to 1-2 weeks.

| Warming Advantage | Criteria | Warm-up Time |
|-------------------|----------|-------------|
| High | MX + SPF + DKIM, not blacklisted, age > 2yr | ~1 week |
| Medium | MX + (SPF or DKIM), not blacklisted | ~2 weeks |
| Low | MX only | ~4 weeks |
| None | No email history | 6-8 weeks |
