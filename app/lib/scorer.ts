import OpenAI from "openai";
import { FilteredPost, ScoredPost, ScoreBreakdown } from "./types";
import { SCORING_SYSTEM_PROMPT, MIN_OVERALL_SCORE } from "./constants";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MAX_POSTS_TO_SCORE = 100;

interface ScoringResult {
  costPainIntensity: number;
  relevanceToAutomation: number;
  commentOpportunityStrength: number;
  riskOfSoundingPromotional: number;
  painType: string;
  whyGoodOpportunity: string;
  suggestedCommentAngle: string;
  relevantProduct: "ZopNight" | "ZopDay" | "Both";
}

async function scorePost(
  filtered: FilteredPost
): Promise<ScoredPost | null> {
  const { post, matchedKeywords, ageHours } = filtered;

  const userPrompt = `
Subreddit: r/${post.subreddit}
Title: ${post.title}
Body: ${post.selftext.slice(0, 1500)}
Upvotes: ${post.score}
Comments: ${post.num_comments}
Matched Keywords: ${matchedKeywords.join(", ")}
Post Age: ${ageHours} hours

Score this post and respond with valid JSON matching this schema:
{
  "costPainIntensity": number,
  "relevanceToAutomation": number,
  "commentOpportunityStrength": number,
  "riskOfSoundingPromotional": number,
  "painType": string,
  "whyGoodOpportunity": string,
  "suggestedCommentAngle": string,
  "relevantProduct": "ZopNight" | "ZopDay" | "Both"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SCORING_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    });

    const result: ScoringResult = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    const scores: ScoreBreakdown = {
      costPainIntensity: result.costPainIntensity,
      relevanceToAutomation: result.relevanceToAutomation,
      commentOpportunityStrength: result.commentOpportunityStrength,
      riskOfSoundingPromotional: result.riskOfSoundingPromotional,
    };

    // Weighted overall score:
    // - Cost pain and relevance weighted highest (0.3 each)
    // - Comment opportunity weighted 0.25
    // - Low promotional risk is rewarded (0.15)
    const overallScore =
      Math.round(
        (scores.costPainIntensity * 0.3 +
          scores.relevanceToAutomation * 0.3 +
          scores.commentOpportunityStrength * 0.25 +
          (10 - scores.riskOfSoundingPromotional) * 0.15) *
          10
      ) / 10;

    // Determine spam risk level from the promotional risk score
    let spamRiskLevel: "low" | "medium" | "high";
    if (scores.riskOfSoundingPromotional <= 3) spamRiskLevel = "low";
    else if (scores.riskOfSoundingPromotional <= 6) spamRiskLevel = "medium";
    else spamRiskLevel = "high";

    const scoredPost: ScoredPost = {
      id: post.id,
      title: post.title,
      selftext: post.selftext.slice(0, 500),
      subreddit: post.subreddit,
      author: post.author,
      upvotes: post.score,
      commentsCount: post.num_comments,
      createdUtc: post.created_utc,
      permalink: `https://www.reddit.com${post.permalink}`,
      ageHours,
      matchedKeywords,
      scores,
      overallScore,
      painType: result.painType,
      whyGoodOpportunity: result.whyGoodOpportunity,
      suggestedCommentAngle: result.suggestedCommentAngle,
      spamRiskLevel,
      relevantProduct: result.relevantProduct,
    };

    return scoredPost;
  } catch (error) {
    console.error(`[Scorer] Failed to score post ${post.id}:`, error);
    return null;
  }
}

export async function scoreAllPosts(
  filteredPosts: FilteredPost[]
): Promise<ScoredPost[]> {
  // Limit to MAX_POSTS_TO_SCORE for cost control
  const postsToScore = filteredPosts.slice(0, MAX_POSTS_TO_SCORE);
  console.log(`[Scorer] Scoring ${postsToScore.length} posts with AI...`);

  // Process in parallel batches of 5 to respect OpenAI rate limits
  const batchSize = 5;
  const results: ScoredPost[] = [];

  for (let i = 0; i < postsToScore.length; i += batchSize) {
    const batch = postsToScore.slice(i, i + batchSize);
    console.log(
      `[Scorer] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postsToScore.length / batchSize)}`
    );
    const batchResults = await Promise.all(batch.map(scorePost));
    results.push(
      ...batchResults.filter((p): p is ScoredPost => p !== null)
    );
  }

  // Filter to only posts scoring MIN_OVERALL_SCORE+ and sort descending
  const qualifiedPosts = results
    .filter((p) => p.overallScore >= MIN_OVERALL_SCORE)
    .sort((a, b) => b.overallScore - a.overallScore);

  console.log(
    `[Scorer] ${qualifiedPosts.length} posts scored ${MIN_OVERALL_SCORE}+ overall`
  );
  return qualifiedPosts;
}
