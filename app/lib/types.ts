// Raw post from Reddit JSON API
export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url: string;
  link_flair_text: string | null;
}

// Post after keyword filtering but before AI scoring
export interface FilteredPost {
  post: RedditPost;
  matchedKeywords: string[];
  ageHours: number;
}

// Individual score dimensions from AI
export interface ScoreBreakdown {
  costPainIntensity: number;
  relevanceToAutomation: number;
  commentOpportunityStrength: number;
  riskOfSoundingPromotional: number;
}

// Fully scored and enriched post
export interface ScoredPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  upvotes: number;
  commentsCount: number;
  createdUtc: number;
  permalink: string;
  ageHours: number;
  matchedKeywords: string[];
  scores: ScoreBreakdown;
  overallScore: number;
  painType: string;
  whyGoodOpportunity: string;
  suggestedCommentAngle: string;
  spamRiskLevel: "low" | "medium" | "high";
  relevantProduct: "ZopNight" | "ZopDay" | "Both";
}

// Daily scan result blob
export interface DailyScanResult {
  scanDate: string;
  scanTimestamp: number;
  totalFetched: number;
  totalPassedFilter: number;
  totalScored: number;
  posts: ScoredPost[];
}
