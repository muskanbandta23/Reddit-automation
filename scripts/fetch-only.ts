/**
 * Quick Reddit fetch + filter test (no OpenAI needed)
 * Run: npx tsx scripts/fetch-only.ts
 */

const TARGET_SUBREDDITS = [
  "aws", "devops", "cloudcomputing", "sysadmin", "kubernetes",
  "startups", "SaaS", "FinOps", "cscareerquestions", "ITManagers",
  "Entrepreneur", "selfhosted",
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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchSub(sub: string) {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=100&raw_json=1`, {
      headers: { "User-Agent": "RedditScout/1.0" },
    });
    if (!res.ok) { console.log(`  [FAIL] r/${sub}: ${res.status}`); return []; }
    const data = await res.json();
    return (data?.data?.children || []).map((c: any) => ({
      id: c.data.id, title: c.data.title, selftext: c.data.selftext || "",
      subreddit: c.data.subreddit, score: c.data.score,
      num_comments: c.data.num_comments, created_utc: c.data.created_utc,
      permalink: `https://www.reddit.com${c.data.permalink}`,
      author: c.data.author,
    }));
  } catch (e) { console.log(`  [ERR] r/${sub}: ${e}`); return []; }
}

async function main() {
  console.log("\n📡 Reddit Scout - Fetch & Filter Test\n");

  const allPosts = new Map<string, any>();
  for (const sub of TARGET_SUBREDDITS) {
    process.stdout.write(`  Fetching r/${sub}...`);
    const posts = await fetchSub(sub);
    let added = 0;
    for (const p of posts) { if (!allPosts.has(p.id)) { allPosts.set(p.id, p); added++; } }
    console.log(` ${posts.length} posts (${added} new)`);
    await sleep(7000);
  }

  console.log(`\n  Total unique posts: ${allPosts.size}\n`);

  // Filter
  const now = Date.now() / 1000;
  const maxAge = 5 * 86400;
  const filtered: any[] = [];

  for (const post of allPosts.values()) {
    const age = now - post.created_utc;
    if (age > maxAge) continue;
    if (post.score < 15 && post.num_comments < 8) continue;
    const text = `${post.title} ${post.selftext}`.toLowerCase();
    const matched = TRIGGER_KEYWORDS.filter(kw => text.includes(kw.toLowerCase()));
    if (matched.length === 0) continue;
    filtered.push({ ...post, matchedKeywords: matched, ageHours: Math.round(age / 3600) });
  }

  // Sort by engagement
  filtered.sort((a, b) => (b.score + b.num_comments * 3) - (a.score + a.num_comments * 3));

  console.log(`  Filtered to ${filtered.length} relevant posts (5d old, 15+ upvotes OR 8+ comments, keyword match)\n`);
  console.log("═".repeat(80));
  console.log("  FILTERED POSTS (sorted by engagement)");
  console.log("═".repeat(80));

  filtered.forEach((p, i) => {
    const age = p.ageHours < 24 ? `${p.ageHours}h` : `${Math.floor(p.ageHours / 24)}d`;
    console.log(`\n  #${i + 1} | r/${p.subreddit} | ⬆${p.score} | 💬${p.num_comments} | ${age} ago`);
    console.log(`  ${p.title}`);
    console.log(`  ${p.permalink}`);
    console.log(`  Keywords: ${p.matchedKeywords.slice(0, 5).join(", ")}`);
  });

  console.log(`\n${"═".repeat(80)}`);
  console.log(`  To get AI scoring, add your OPENAI_API_KEY to .env.local and run: npm run scan`);
  console.log("═".repeat(80) + "\n");
}

main().catch(console.error);
