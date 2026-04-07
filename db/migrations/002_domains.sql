CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  domain VARCHAR(255) UNIQUE NOT NULL,
  tld VARCHAR(20) NOT NULL,
  registrar VARCHAR(50) NOT NULL DEFAULT 'opensrs',
  registrar_domain_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending_registration', 'pending_transfer', 'expired', 'redemption', 'deleted')),
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  nameservers TEXT[],
  whois_privacy BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_domains_customer ON domains(customer_id);
CREATE INDEX idx_domains_expires ON domains(expires_at);
CREATE INDEX idx_domains_tld ON domains(tld);
CREATE INDEX idx_domains_status ON domains(status);

CREATE TABLE dns_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  priority INT,
  ttl INT DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dns_domain ON dns_records(domain_id);
