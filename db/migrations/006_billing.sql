CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  stripe_subscription_id VARCHAR(255),
  type VARCHAR(30) NOT NULL CHECK (type IN ('email', 'domain_renewal', 'bundle')),
  status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_customer ON billing_subscriptions(customer_id);

CREATE TABLE billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  stripe_payment_id VARCHAR(255),
  type VARCHAR(30) NOT NULL
    CHECK (type IN ('domain_registration', 'domain_renewal', 'email_subscription', 'auction_purchase', 'auction_sale', 'bundle')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  related_domain_id UUID REFERENCES domains(id),
  related_auction_id UUID REFERENCES auction_listings(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_btx_customer ON billing_transactions(customer_id);
CREATE INDEX idx_btx_type ON billing_transactions(type);
