/**
 * AI analysis types for the Helix platform.
 */

// ---------------------------------------------------------------------------
// Analysis metadata (attached to every AI response)
// ---------------------------------------------------------------------------

export interface AIAnalysisMetadata {
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  cached: boolean;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Valuation
// ---------------------------------------------------------------------------

export interface AIValuationResult {
  brandability: number;        // 0-100
  pronounceability: number;    // 0-100
  memorability: number;        // 0-100
  linguisticType: 'dictionary' | 'compound' | 'coined' | 'acronym' | 'random';
  industries: AIIndustryMatch[];
  keywordValue: 'high' | 'medium' | 'low' | 'none';
  comparables: string[];       // Similar domains that sold recently
  narrative: string;           // 1-2 sentence plain-English summary
}

export interface AIIndustryMatch {
  industry: string;
  confidence: number;          // 0-100
}

export interface MergedValuation {
  domain: string;
  heuristicValue: number;
  aiAdjustedValue: number;
  confidence: 'low' | 'medium' | 'high';
  heuristicFactors: { name: string; score: number; weight: number; description: string }[];
  aiAnalysis: AIValuationResult;
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export interface AIDiscoveryRecommendation {
  domain: string;
  fitScore: number;            // 0-100
  reason: string;              // Why this domain is worth acquiring
  suggestedMaxBid: number;
  industries: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AIDiscoveryResult {
  recommendations: AIDiscoveryRecommendation[];
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Auction Copilot
// ---------------------------------------------------------------------------

export interface AIAuctionAdvice {
  recommendedMaxBid: number;
  bidTimingStrategy: string;
  estimatedFinalPrice: { low: number; mid: number; high: number };
  riskAssessment: string;
  reasoning: string;
}

export interface AIAuctionResult {
  advice: AIAuctionAdvice;
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

export interface AILandingPageContent {
  headline: string;
  subheadline: string;
  valueProps: string[];
  ctaText: string;
  ctaSubtext: string;
  seoMetaDescription: string;
  targetIndustry: string;
}

export interface AILandingPageResult {
  content: AILandingPageContent;
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Outbound Email
// ---------------------------------------------------------------------------

export interface AIOutboundEmail {
  tone: 'formal' | 'conversational' | 'urgent';
  subject: string;
  body: string;
  cta: string;
}

export interface AIOutboundSequence {
  initial: AIOutboundEmail[];  // 3 variants
  followUp1: AIOutboundEmail;  // 3-day follow-up
  followUp2: AIOutboundEmail;  // 7-day follow-up
}

export interface AIOutboundResult {
  sequence: AIOutboundSequence;
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Portfolio Intelligence
// ---------------------------------------------------------------------------

export interface AIPortfolioInsight {
  answer: string;
  recommendations: string[];
  domainsReferenced: string[];
}

export interface AIPortfolioResult {
  insight: AIPortfolioInsight;
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Name Generator
// ---------------------------------------------------------------------------

export interface AINameSuggestion {
  domain: string;
  available?: boolean;
  reasoning: string;
  style: 'brandable' | 'keyword' | 'compound' | 'short';
}

export interface AINameGeneratorResult {
  suggestions: AINameSuggestion[];
  metadata: AIAnalysisMetadata;
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type AIAnalysisType =
  | 'valuation'
  | 'discovery'
  | 'auction_advice'
  | 'landing_page'
  | 'outbound_email'
  | 'portfolio_query'
  | 'name_generation';

export interface AIAnalysisRow {
  id: string;
  domain: string | null;
  customerId: string;
  analysisType: AIAnalysisType;
  modelUsed: string;
  inputHash: string;
  result: Record<string, unknown>;
  promptSummary: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  expiresAt: Date | null;
  createdAt: Date;
}
