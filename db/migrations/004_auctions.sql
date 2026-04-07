CREATE TABLE auction_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  seller_id UUID REFERENCES customers(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('auction', 'buy_now', 'make_offer')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'ended', 'settled', 'cancelled')),
  starting_price DECIMAL(10,2),
  reserve_price DECIMAL(10,2),
  buy_now_price DECIMAL(10,2),
  current_bid DECIMAL(10,2),
  bid_count INT DEFAULT 0,
  minimum_increment DECIMAL(10,2) DEFAULT 1.00,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  auto_extend BOOLEAN DEFAULT TRUE,
  auto_extend_minutes INT DEFAULT 5,
  winner_id UUID REFERENCES customers(id),
  platform_fee_percent DECIMAL(5,2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auctions_status ON auction_listings(status);
CREATE INDEX idx_auctions_ends ON auction_listings(ends_at);
CREATE INDEX idx_auctions_seller ON auction_listings(seller_id);

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auction_listings(id),
  bidder_id UUID REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  max_bid DECIMAL(10,2),
  stripe_payment_intent_id VARCHAR(255),
  is_winning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_winning ON bids(auction_id, is_winning) WHERE is_winning = TRUE;

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES auction_listings(id),
  buyer_id UUID REFERENCES customers(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired')),
  counter_amount DECIMAL(10,2),
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_offers_listing ON offers(listing_id);
