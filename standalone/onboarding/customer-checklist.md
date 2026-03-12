# Customer Onboarding Checklist

## For each new customer:

- [ ] Collect: business name, domain, number of mailboxes needed, mailbox names (info@, etc.)
- [ ] Verify domain ownership (customer controls DNS)
- [ ] Provision domain in OpenSRS
- [ ] Create mailboxes in OpenSRS
- [ ] Send DNS setup guide with specific records for their domain
- [ ] Customer adds DNS records (MX, SPF, DKIM, DMARC)
- [ ] Run `scripts/dns-checker.sh <domain>` to verify records
- [ ] Set up Stripe recurring billing
- [ ] Send welcome email with login credentials and app setup instructions
- [ ] Confirm customer can send and receive email
- [ ] Follow up after 1 week to check if everything is working
