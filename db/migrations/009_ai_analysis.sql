CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255),
  customer_id UUID REFERENCES customers(id),
  analysis_type VARCHAR(30) NOT NULL
    CHECK (analysis_type IN (
      'valuation', 'discovery', 'auction_advice',
      'landing_page', 'outbound_email', 'portfolio_query',
      'name_generation'
    )),
  model_used VARCHAR(50) NOT NULL,
  input_hash VARCHAR(64) NOT NULL,
  result JSONB NOT NULL,
  prompt_summary TEXT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  estimated_cost_usd DECIMAL(8,6) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_hash ON ai_analyses(input_hash, analysis_type);
CREATE INDEX idx_ai_domain ON ai_analyses(domain, analysis_type);
CREATE INDEX idx_ai_customer ON ai_analyses(customer_id);
CREATE INDEX idx_ai_expires ON ai_analyses(expires_at) WHERE expires_at IS NOT NULL;

-- Monthly usage tracking per customer
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  period VARCHAR(7) NOT NULL,
  analysis_type VARCHAR(30) NOT NULL,
  request_count INT DEFAULT 0,
  total_input_tokens INT DEFAULT 0,
  total_output_tokens INT DEFAULT 0,
  total_cost_usd DECIMAL(10,4) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, period, analysis_type)
);

CREATE INDEX idx_ai_usage_customer ON ai_usage(customer_id, period);
