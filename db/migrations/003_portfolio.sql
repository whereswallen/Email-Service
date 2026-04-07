CREATE TABLE portfolio_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  purpose VARCHAR(20) NOT NULL DEFAULT 'investment'
    CHECK (purpose IN ('investment', 'customer', 'personal', 'parked')),
  acquisition_cost DECIMAL(10,2),
  acquisition_method VARCHAR(20)
    CHECK (acquisition_method IN ('registration', 'auction', 'expired', 'transfer', 'backorder')),
  annual_renewal_cost DECIMAL(10,2),
  estimated_value DECIMAL(10,2),
  valuation_method VARCHAR(20) DEFAULT 'algorithm',
  valuation_date TIMESTAMPTZ,
  domain_authority INT,
  backlinks INT,
  referring_domains INT,
  email_reputation_score INT,
  spam_blacklisted BOOLEAN DEFAULT FALSE,
  listed_for_sale BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(10,2),
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_domain ON portfolio_entries(domain_id);
CREATE INDEX idx_portfolio_purpose ON portfolio_entries(purpose);
CREATE INDEX idx_portfolio_sale ON portfolio_entries(listed_for_sale) WHERE listed_for_sale = TRUE;

CREATE TABLE portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('acquisition', 'renewal', 'sale', 'transfer_fee')),
  amount DECIMAL(10,2) NOT NULL,
  counterparty VARCHAR(255),
  stripe_payment_id VARCHAR(255),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_ptx_domain ON portfolio_transactions(domain_id);
