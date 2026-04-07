CREATE TABLE expired_domain_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  tld VARCHAR(20) NOT NULL,
  drop_date TIMESTAMPTZ,
  domain_age_years INT,
  backlinks INT,
  referring_domains INT,
  domain_authority INT,
  organic_traffic_estimate INT,
  email_reputation_score INT,
  spam_blacklisted BOOLEAN DEFAULT FALSE,
  suitable_for_mailcow BOOLEAN DEFAULT FALSE,
  warming_advantage VARCHAR(10) DEFAULT 'none'
    CHECK (warming_advantage IN ('high', 'medium', 'low', 'none')),
  overall_score INT,
  status VARCHAR(20) DEFAULT 'discovered'
    CHECK (status IN ('discovered', 'evaluated', 'bidding', 'acquired', 'passed')),
  acquisition_budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_candidates_score ON expired_domain_candidates(overall_score DESC);
CREATE INDEX idx_candidates_drop ON expired_domain_candidates(drop_date);
CREATE INDEX idx_candidates_status ON expired_domain_candidates(status);
CREATE INDEX idx_candidates_mailcow ON expired_domain_candidates(suitable_for_mailcow)
  WHERE suitable_for_mailcow = TRUE;
