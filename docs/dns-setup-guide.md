# DNS Setup Guide for Email

This guide is for customers setting up professional email on their domain. Follow these steps to configure DNS records so your email works correctly.

## Prerequisites

- A registered domain name (e.g., `yourbusiness.com`)
- Access to your domain's DNS settings (usually at your domain registrar: GoDaddy, Namecheap, Cloudflare, etc.)

## Step 1: MX Record

The MX (Mail Exchange) record tells the internet where to deliver email for your domain.

| Type | Host/Name | Value | Priority | TTL |
|------|-----------|-------|----------|-----|
| MX | `@` (or blank) | `mx.opensrs.net` | 10 | 3600 |
| MX | `@` (or blank) | `mx2.opensrs.net` | 20 | 3600 |

> **Note**: The exact MX values will be provided when your account is provisioned. The above are examples.

## Step 2: SPF Record

SPF (Sender Policy Framework) tells receiving servers which mail servers are authorized to send email for your domain.

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| TXT | `@` (or blank) | `v=spf1 include:opensrs.com ~all` | 3600 |

> **Important**: If you already have an SPF record, don't create a second one. Instead, add `include:opensrs.com` to your existing record. You can only have ONE SPF record per domain.

**Example of merging SPF records:**
```
# Before (existing record for your website):
v=spf1 include:_spf.google.com ~all

# After (merged):
v=spf1 include:_spf.google.com include:opensrs.com ~all
```

## Step 3: DKIM Record

DKIM (DomainKeys Identified Mail) adds a cryptographic signature to your outgoing emails, proving they haven't been tampered with.

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| TXT | `default._domainkey` | *(provided during setup)* | 3600 |

The DKIM value is a long string that looks like:
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNA... (truncated)
```

We will provide your specific DKIM record when your email is provisioned.

## Step 4: DMARC Record

DMARC (Domain-based Message Authentication, Reporting & Conformance) tells receiving servers what to do with emails that fail SPF or DKIM checks.

| Type | Host/Name | Value | TTL |
|------|-----------|-------|-----|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com` | 3600 |

Replace `admin@yourdomain.com` with the email address where you want to receive DMARC reports.

## Step 5: Verify

After adding all records, DNS changes can take up to 48 hours to propagate (usually much faster — often within minutes).

### How to verify your records

1. **MX Record**: Go to [MXToolbox MX Lookup](https://mxtoolbox.com/MXLookup.aspx) and enter your domain
2. **SPF Record**: Go to [MXToolbox SPF Lookup](https://mxtoolbox.com/spf.aspx) and enter your domain
3. **DKIM Record**: We'll verify this for you during setup
4. **DMARC Record**: Go to [MXToolbox DMARC Lookup](https://mxtoolbox.com/dmarc.aspx) and enter your domain

All checks should show green/passing.

## Common Issues

### "I already have MX records for my website"
Your website doesn't need MX records — those are only for email. Replace your existing MX records with the ones above.

### "My emails are going to spam"
Usually means SPF or DKIM isn't set up correctly. Run the verification steps above and contact us if anything shows as failing.

### "I can't find where to add DNS records"
Your DNS is managed wherever your domain's nameservers point to. Common places:
- **Cloudflare**: DNS > Records
- **GoDaddy**: DNS Management
- **Namecheap**: Advanced DNS
- **Google Domains**: DNS > Custom Records

### "How long until email starts working?"
Usually within 15-30 minutes. Allow up to 48 hours in rare cases.

## Need Help?

If you get stuck, send us a screenshot of your current DNS records and we'll walk you through it.
