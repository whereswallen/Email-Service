CREATE TABLE email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  customer_id UUID REFERENCES customers(id),
  email_provider VARCHAR(20) NOT NULL CHECK (email_provider IN ('opensrs', 'mailcow')),
  provider_domain_id VARCHAR(255),
  dns_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending_dns'
    CHECK (status IN ('pending_dns', 'active', 'suspended')),
  mailcow_server_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_domains_domain ON email_domains(domain_id);
CREATE INDEX idx_email_domains_customer ON email_domains(customer_id);

CREATE TABLE email_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_domain_id UUID REFERENCES email_domains(id) ON DELETE CASCADE,
  address VARCHAR(255) NOT NULL,
  full_address VARCHAR(255) NOT NULL,
  provider_mailbox_id VARCHAR(255),
  storage_used_mb INT DEFAULT 0,
  storage_limit_mb INT DEFAULT 5120,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_mailboxes_domain ON email_mailboxes(email_domain_id);
CREATE UNIQUE INDEX idx_email_mailboxes_address ON email_mailboxes(full_address);
