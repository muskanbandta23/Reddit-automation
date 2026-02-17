/**
 * Reddit Scout CLI Bot
 *
 * Run directly from terminal:
 *   npx tsx scripts/scan.ts
 *
 * This fetches Reddit posts, filters, scores with AI, and prints
 * the top engagement opportunities right in your terminal.
 *
 * Required env vars (in .env.local):
 *   OPENAI_API_KEY=sk-...
 */

import { config } from "dotenv";
config({ path: ".env.local" });

// ---- Types ----
interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
}

interface FilteredPost {
  post: RedditPost;
  matchedKeywords: string[];
  ageHours: number;
}

interface ScoredPost {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  commentsCount: number;
  permalink: string;
  ageHours: number;
  matchedKeywords: string[];
  overallScore: number;
  costPainIntensity: number;
  relevanceToAutomation: number;
  commentOpportunityStrength: number;
  riskOfSoundingPromotional: number;
  painType: string;
  whyGoodOpportunity: string;
  suggestedCommentAngle: string;
  spamRiskLevel: string;
  relevantProduct: string;
}

// ---- Config ----
const TARGET_SUBREDDITS = [
  "aws",
  "devops",
  "cloudcomputing",
  "sysadmin",
  "kubernetes",
  "startups",
  "SaaS",
  "FinOps",
  "cscareerquestions",
  "ITManagers",
  "Entrepreneur",
  "selfhosted",
];

const TRIGGER_KEYWORDS = [
  "aws bill spike", "unexpected cloud charges", "dev environment cost",
  "idle instances", "ec2 always running", "kubernetes cost too high",
  "startup burn rate", "cloud cost optimization", "finops automation",
  "infrastructure waste", "sandbox environment running overnight",
  "cloud waste", "non-prod", "staging environment", "cost reduction",
  "over-provisioned", "zombie resources", "phantom usage", "cloud spend",
  "cloud bill", "cloud cost", "aws cost", "gcp cost", "azure cost",
  "save money cloud", "cutting cloud", "reduce aws", "wasting money",
  "dev test environment", "shutdown", "schedule instances",
  "reserved instance", "spot instance", "right-sizing", "rightsizing",
  "expensive mistake", "cloud optimization", "cost management",
  "idle resources", "unused resources", "cloud savings", "devops cost",
  "kubernetes expensive", "k8s cost", "cloud budget", "overprovisioned",
  "underutilized", "cost visibility", "cloud pricing", "multi-cloud cost",
];

const MIN_UPVOTES = 15;
const MIN_COMMENTS = 8;
const MAX_POST_AGE_DAYS = 5;
const MIN_OVERALL_SCORE = 7;

const SCORING_PROMPT = `You are a cloud cost optimization expert and community engagement strategist.

Product Context:
ZopNight: Auto shutdown idle non-prod cloud resources during nights/weekends. 20-60% cloud bill savings, agentless 2-min setup, multi-cloud (AWS/Azure/GCP/OCI), covers VMs/DBs/K8s/Lambda, RBAC, budget guardrails, dependency-aware scheduling. ISO-27001 & SOC2 certified.
ZopDay: Cloud cost visibility and automation-driven optimization. Guardrails instead of dashboards, automated cost actions, real-time visibility across clouds.

Score the Reddit post on these dimensions (1-10):
1. costPainIntensity: How much genuine cloud cost pain? 10 = specific dollar amounts of waste, 1 = vague mention.
2. relevanceToAutomation: How well could ZopNight/ZopDay address this? 10 = idle dev environments, 1 = unrelated.
3. commentOpportunityStrength: Is there room for a helpful comment? 10 = asking for tool recommendations, 1 = closed discussion.
4. riskOfSoundingPromotional: Risk of sounding like spam? 10 = very high risk, 1 = very safe.

Also provide:
- painType: short label (e.g., "AWS bill spike", "idle non-prod environments")
- whyGoodOpportunity: 1-2 sentences
- suggestedCommentAngle: brief strategy for helpful non-promotional comment
- relevantProduct: "ZopNight", "ZopDay", or "Both"

Respond in valid JSON only.`;

// ---- Helpers ----
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// ---- Reddit Fetcher ----
async function fetchSubreddit(subreddit: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=100&raw_json=1`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "RedditScout/1.0 (CLI Bot)" },
      });

      if (res.status === 429) {
        log(`  Rate limited on r/${subreddit}, waiting 15s...`);
        await sleep(15000);
        continue;
      }

      if (!res.ok) {
        log(`  Failed r/${subreddit}: ${res.status}`);
        return [];
      }

      const data = await res.json();
      return (data?.data?.children || []).map((c: any) => ({
        id: c.data.id,
        title: c.data.title,
        selftext: c.data.selftext || "",
        subreddit: c.data.subreddit,
        author: c.data.author,
        score: c.data.score,
        num_comments: c.data.num_comments,
        created_utc: c.data.created_utc,
        permalink: `https://www.reddit.com${c.data.permalink}`,
      }));
    } catch (err) {
      log(`  Error r/${subreddit} attempt ${attempt + 1}: ${err}`);
      await sleep(5000);
    }
  }
  return [];
}

async function fetchAllPosts(): Promise<RedditPost[]> {
  const allPosts = new Map<string, RedditPost>();

  for (const sub of TARGET_SUBREDDITS) {
    log(`Fetching r/${sub}...`);
    const posts = await fetchSubreddit(sub);
    for (const p of posts) {
      if (!allPosts.has(p.id)) allPosts.set(p.id, p);
    }
    await sleep(7000); // rate limit: 10 req/min
  }

  return Array.from(allPosts.values());
}

// ---- Filter ----
function filterPosts(posts: RedditPost[]): FilteredPost[] {
  const now = Date.now() / 1000;
  const maxAge = MAX_POST_AGE_DAYS * 86400;

  return posts
    .map((post) => {
      const age = now - post.created_utc;
      if (age > maxAge) return null;
      if (post.score < MIN_UPVOTES && post.num_comments < MIN_COMMENTS) return null;

      const text = `${post.title} ${post.selftext}`.toLowerCase();
      const matched = TRIGGER_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));
      if (matched.length === 0) return null;

      return { post, matchedKeywords: matched, ageHours: Math.round(age / 3600) };
    })
    .filter((p): p is FilteredPost => p !== null);
}

// ---- AI Scorer ----
async function scoreWithAI(filtered: FilteredPost[]): Promise<ScoredPost[]> {
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const results: ScoredPost[] = [];

  // Process in batches of 5
  for (let i = 0; i < filtered.length; i += 5) {
    const batch = filtered.slice(i, i + 5);
    log(`Scoring batch ${Math.floor(i / 5) + 1}/${Math.ceil(filtered.length / 5)}...`);

    const batchResults = await Promise.all(
      batch.map(async ({ post, matchedKeywords, ageHours }) => {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: SCORING_PROMPT },
              {
                role: "user",
                content: `Subreddit: r/${post.subreddit}\nTitle: ${post.title}\nBody: ${post.selftext.slice(0, 1500)}\nUpvotes: ${post.score}\nComments: ${post.num_comments}\nMatched Keywords: ${matchedKeywords.join(", ")}\nAge: ${ageHours}h`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 500,
          });

          const r = JSON.parse(completion.choices[0].message.content || "{}");

          const overall =
            Math.round(
              (r.costPainIntensity * 0.3 +
                r.relevanceToAutomation * 0.3 +
                r.commentOpportunityStrength * 0.25 +
                (10 - r.riskOfSoundingPromotional) * 0.15) *
                10
            ) / 10;

          if (overall < MIN_OVERALL_SCORE) return null;

          let spamRisk = "Medium";
          if (r.riskOfSoundingPromotional <= 3) spamRisk = "Low";
          else if (r.riskOfSoundingPromotional >= 7) spamRisk = "High";

          return {
            id: post.id,
            title: post.title,
            subreddit: post.subreddit,
            author: post.author,
            upvotes: post.score,
            commentsCount: post.num_comments,
            permalink: post.permalink,
            ageHours,
            matchedKeywords,
            overallScore: overall,
            costPainIntensity: r.costPainIntensity,
            relevanceToAutomation: r.relevanceToAutomation,
            commentOpportunityStrength: r.commentOpportunityStrength,
            riskOfSoundingPromotional: r.riskOfSoundingPromotional,
            painType: r.painType,
            whyGoodOpportunity: r.whyGoodOpportunity,
            suggestedCommentAngle: r.suggestedCommentAngle,
            spamRiskLevel: spamRisk,
            relevantProduct: r.relevantProduct,
          } as ScoredPost;
        } catch (err) {
          log(`  Failed to score: ${post.title.slice(0, 50)}... - ${err}`);
          return null;
        }
      })
    );

    results.push(...batchResults.filter((p): p is ScoredPost => p !== null));
  }

  return results.sort((a, b) => b.overallScore - a.overallScore);
}

// ---- Format Output ----
function formatResults(posts: ScoredPost[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let output = `\n${"=".repeat(80)}\n`;
  output += `  REDDIT SCOUT - ZopNight/ZopDay Engagement Opportunities\n`;
  output += `  ${date}\n`;
  output += `${"=".repeat(80)}\n\n`;
  output += `  Found ${posts.length} high-scoring opportunities (7+ overall)\n\n`;

  posts.forEach((post, i) => {
    const ageStr = post.ageHours < 24 ? `${post.ageHours}h` : `${Math.floor(post.ageHours / 24)}d`;

    output += `${"─".repeat(80)}\n`;
    output += `  #${i + 1} | Score: ${post.overallScore}/10 | Spam Risk: ${post.spamRiskLevel} | ${post.relevantProduct}\n`;
    output += `${"─".repeat(80)}\n`;
    output += `  Post Title:   ${post.title}\n`;
    output += `  Subreddit:    r/${post.subreddit}\n`;
    output += `  Upvotes:      ${post.upvotes} | Comments: ${post.commentsCount} | Age: ${ageStr}\n`;
    output += `  Link:         ${post.permalink}\n`;
    output += `  Pain Type:    ${post.painType}\n`;
    output += `  Keywords:     ${post.matchedKeywords.slice(0, 5).join(", ")}\n`;
    output += `\n`;
    output += `  Scores:\n`;
    output += `    Cost Pain: ${post.costPainIntensity}/10 | Relevance: ${post.relevanceToAutomation}/10\n`;
    output += `    Opportunity: ${post.commentOpportunityStrength}/10 | Promo Risk: ${post.riskOfSoundingPromotional}/10\n`;
    output += `\n`;
    output += `  Why Good Opportunity:\n`;
    output += `    ${post.whyGoodOpportunity}\n`;
    output += `\n`;
    output += `  Suggested Angle:\n`;
    output += `    ${post.suggestedCommentAngle}\n`;
    output += `\n`;
  });

  output += `${"=".repeat(80)}\n`;
  output += `  END OF REPORT\n`;
  output += `${"=".repeat(80)}\n`;

  return output;
}

// ---- Main ----
async function main() {
  console.log("\n📡 Reddit Scout Bot Starting...\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Step 1: Fetch
  log("Phase 1: Fetching posts from 12 subreddits...");
  const allPosts = await fetchAllPosts();
  log(`Fetched ${allPosts.length} total posts\n`);

  // Step 2: Filter
  log("Phase 2: Filtering by age, engagement, and keywords...");
  const filtered = filterPosts(allPosts);
  log(`${filtered.length} posts passed filters\n`);

  if (filtered.length === 0) {
    console.log("\n⚠️  No posts matched the criteria. Try again later.\n");
    return;
  }

  // Step 3: Score with AI
  log(`Phase 3: AI scoring ${Math.min(filtered.length, 100)} posts with GPT-4o-mini...`);
  const scored = await scoreWithAI(filtered.slice(0, 100));
  log(`${scored.length} posts scored 7+ overall\n`);

  // Step 4: Output
  const report = formatResults(scored);
  console.log(report);

  // Also save to file
  const filename = `reports/reddit-scout-${new Date().toISOString().split("T")[0]}.txt`;
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filename, report);
  log(`Report saved to ${filename}`);
}

main().catch(console.error);
