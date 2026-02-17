/**
 * ============================================================
 * REDDIT SCOUT BOT v4 - Cloud/FinOps/DevOps Only + Top Posts
 * ============================================================
 *
 * Searches ONLY within cloud/devops/finops subreddits.
 * Finds HIGH-ENGAGEMENT posts where people discuss:
 *   - Cloud cost optimization & FinOps tools
 *   - Idle resources, non-prod waste, shutdown scheduling
 *   - AWS/Azure/GCP bill management
 *   - DevOps automation that saves money
 *
 * Scans: past week (hot/new) + past month (top) for high-engagement threads.
 * Emails top 7 posts daily where ZopNight can be discussed naturally.
 *
 * SETUP: Paste into script.google.com → Run dailyScan → Allow permissions
 * COST: $0 (completely free)
 * ============================================================
 */

// ===== CHANGE THIS TO YOUR EMAIL =====
var YOUR_EMAIL = "muskan.bandta@zop.dev";

// ===== TARGET SUBREDDITS (cloud/devops/finops ONLY) =====
var TARGET_SUBREDDITS = [
  "aws",
  "devops",
  "cloudcomputing",
  "sysadmin",
  "kubernetes",
  "FinOps",
  "googlecloud",
  "azure",
  "terraform",
  "docker",
  "sre",
  "platform_engineering",
  "startups",
  "SaaS",
  "ITManagers",
  "Entrepreneur",
  "selfhosted",
  "netsec",
  "AZURE",
  "developersIndia"
];

// ===== SEARCH QUERIES run INSIDE each subreddit =====
// Inspired by the real high-engagement posts user showed as examples
var SEARCH_QUERIES = [
  // FinOps specific
  "finops",
  "finops tool",
  "finops automation",
  "finops role",
  "finops engineer",
  "cloud cost optimization",
  "cost optimisation",
  // Cloud cost pain
  "cloud cost",
  "AWS bill",
  "AWS cost",
  "azure cost",
  "GCP cost",
  "cloud spend",
  "cloud budget",
  "cloud waste",
  "reduce cloud cost",
  "save cloud cost",
  // Infrastructure waste
  "idle resources",
  "unused resources",
  "zombie resources",
  "over-provisioned",
  "right sizing",
  // Non-prod & scheduling
  "dev environment cost",
  "staging environment",
  "non-production",
  "shutdown schedule",
  "auto shutdown",
  // Automation
  "cost automation",
  "infrastructure automation",
  "automation save money",
  // Tools & recommendations
  "cost optimization tool",
  "cloud cost tool",
  "best tool cloud cost",
  "recommend cost tool",
  // Kubernetes
  "kubernetes cost",
  "eks cost",
  "gke cost",
  "k8s cost"
];

// ===== KEYWORDS for scoring ZopNight/ZopDay relevance =====
var ZOPNIGHT_KEYWORDS = [
  "idle", "non-prod", "non prod", "nonprod", "staging", "dev environment",
  "test environment", "qa environment", "sandbox", "shutdown", "shut down",
  "schedule", "nights", "weekends", "off-hours", "after hours",
  "always running", "24/7", "running all the time",
  "forgot to turn off", "left running", "zombie", "phantom",
  "unused resources", "unused instances", "orphan",
  "waste", "wasted", "cloud waste", "over-provisioned", "overprovisioned",
  "right-sizing", "rightsizing", "right sizing",
  "burn rate", "runway", "bill shock", "bill spike", "cost spike",
  "unexpected bill", "surprise bill",
  "cost visibility", "guardrail", "guardrails",
  "finops", "fin ops",
  "cloud bill", "aws bill", "azure bill", "gcp bill",
  "ec2 cost", "rds cost", "eks cost", "gke cost", "aks cost",
  "cost management", "cost optimization", "cost optimisation",
  "reserved instance", "savings plan", "spot instance",
  "budget alert", "cloud budget",
  "automation", "automate", "automated",
  "cost tool", "cost platform", "cost solution",
  "cloud efficiency", "resource optimization"
];

var MIN_UPVOTES = 2;
var MIN_COMMENTS = 2;
var MAX_AGE_DAYS_SEARCH = 30;   // Search results: up to 1 month
var MAX_AGE_DAYS_HOT = 14;      // Hot/new posts: up to 2 weeks
var MAX_AGE_DAYS_TOP = 90;      // Top posts: up to 3 months


/**
 * MAIN FUNCTION - Run this daily (set up a trigger)
 */
function dailyScan() {
  Logger.log("🎯 Reddit Scout Bot v4 Starting...");
  Logger.log("Scanning " + TARGET_SUBREDDITS.length + " cloud/devops/finops subreddits...");

  // Step 1: Collect posts from target subreddits only
  var allPosts = fetchTargetedPosts();
  Logger.log("Total unique posts collected: " + allPosts.length);

  // Step 2: Score for ZopNight/ZopDay relevance
  var scored = scorePosts(allPosts);
  Logger.log("Posts passing score threshold: " + scored.length);

  // Step 3: Take top 7
  var top7 = scored.slice(0, 7);

  // Step 4: Send email
  if (top7.length > 0) {
    sendEmail(top7, allPosts.length, scored.length);
    Logger.log("✅ Email sent with " + top7.length + " opportunities!");
  } else {
    Logger.log("⚠️ No qualifying posts found today.");
    sendEmptyEmail(allPosts.length);
  }
}


/**
 * Fetch posts from ONLY the target subreddits
 * 3 strategies per subreddit:
 *   1. Search with cloud/finops queries (restrict_sr=1) — past month
 *   2. Hot + New posts — past 2 weeks (must have keyword match)
 *   3. Top posts of the month — past 3 months (high engagement threads)
 */
function fetchTargetedPosts() {
  var seen = {};
  var results = [];
  var now = Math.floor(Date.now() / 1000);

  for (var s = 0; s < TARGET_SUBREDDITS.length; s++) {
    var sub = TARGET_SUBREDDITS[s];
    Logger.log("  📂 r/" + sub);
    var subCount = 0;

    // === STRATEGY 1: Search within subreddit ===
    for (var q = 0; q < SEARCH_QUERIES.length; q++) {
      var posts = searchInSubreddit(sub, SEARCH_QUERIES[q], "month");

      for (var j = 0; j < posts.length; j++) {
        var p = posts[j];
        if (seen[p.id]) continue;
        var age = now - p.created_utc;
        if (age > MAX_AGE_DAYS_SEARCH * 86400) continue;
        if (p.score < MIN_UPVOTES && p.num_comments < MIN_COMMENTS) continue;

        seen[p.id] = true;
        p.ageHours = Math.round(age / 3600);
        p.source = "search";
        results.push(p);
        subCount++;
      }
      Utilities.sleep(2000);
    }

    // === STRATEGY 2: Hot + New (keyword-filtered) ===
    var hotNew = fetchSubreddit(sub, "hot").concat(fetchSubreddit(sub, "new"));
    for (var h = 0; h < hotNew.length; h++) {
      var p2 = hotNew[h];
      if (seen[p2.id]) continue;
      var age2 = now - p2.created_utc;
      if (age2 > MAX_AGE_DAYS_HOT * 86400) continue;
      if (p2.score < MIN_UPVOTES && p2.num_comments < MIN_COMMENTS) continue;

      var text2 = (p2.title + " " + p2.selftext).toLowerCase();
      var hasKw = false;
      for (var k = 0; k < ZOPNIGHT_KEYWORDS.length; k++) {
        if (text2.indexOf(ZOPNIGHT_KEYWORDS[k]) !== -1) { hasKw = true; break; }
      }
      if (!hasKw) continue;

      seen[p2.id] = true;
      p2.ageHours = Math.round(age2 / 3600);
      p2.source = "hot/new";
      results.push(p2);
      subCount++;
    }
    Utilities.sleep(1500);

    // === STRATEGY 3: Top of the month (high engagement) ===
    var topMonth = fetchSubreddit(sub, "top_month");
    for (var t = 0; t < topMonth.length; t++) {
      var p3 = topMonth[t];
      if (seen[p3.id]) continue;
      var age3 = now - p3.created_utc;
      if (age3 > MAX_AGE_DAYS_TOP * 86400) continue;
      if (p3.score < MIN_UPVOTES && p3.num_comments < MIN_COMMENTS) continue;

      var text3 = (p3.title + " " + p3.selftext).toLowerCase();
      var hasKw3 = false;
      for (var k3 = 0; k3 < ZOPNIGHT_KEYWORDS.length; k3++) {
        if (text3.indexOf(ZOPNIGHT_KEYWORDS[k3]) !== -1) { hasKw3 = true; break; }
      }
      if (!hasKw3) continue;

      seen[p3.id] = true;
      p3.ageHours = Math.round(age3 / 3600);
      p3.source = "top";
      results.push(p3);
      subCount++;
    }
    Utilities.sleep(1500);

    Logger.log("    → " + subCount + " posts from r/" + sub);
  }

  Logger.log("  Total: " + results.length + " unique posts");
  return results;
}


/**
 * Search WITHIN a specific subreddit (restrict_sr=1)
 */
function searchInSubreddit(subreddit, query, timeRange) {
  var url = "https://www.reddit.com/r/" + subreddit + "/search.json"
    + "?q=" + encodeURIComponent(query)
    + "&restrict_sr=1"
    + "&sort=relevance"
    + "&t=" + (timeRange || "month")
    + "&limit=25"
    + "&raw_json=1"
    + "&type=link";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/4.0 (Google Apps Script)" },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 429) {
      Logger.log("    ⏳ Rate limited, waiting 15s...");
      Utilities.sleep(15000);
      response = UrlFetchApp.fetch(url, {
        headers: { "User-Agent": "RedditScoutBot/4.0 (Google Apps Script)" },
        muteHttpExceptions: true
      });
    }

    if (response.getResponseCode() !== 200) return [];

    var data = JSON.parse(response.getContentText());
    var children = data.data.children || [];

    return children.map(function(child) {
      return {
        id: child.data.id,
        title: child.data.title,
        selftext: child.data.selftext || "",
        subreddit: child.data.subreddit,
        author: child.data.author,
        score: child.data.score,
        num_comments: child.data.num_comments,
        created_utc: child.data.created_utc,
        permalink: "https://www.reddit.com" + child.data.permalink
      };
    });
  } catch (e) {
    Logger.log("    Error searching r/" + subreddit + ": " + e.message);
    return [];
  }
}


/**
 * Fetch hot, new, or top posts from a subreddit
 */
function fetchSubreddit(subreddit, sort) {
  var actualSort = sort;
  var extra = "";

  if (sort === "top_month") {
    actualSort = "top";
    extra = "&t=month";
  } else if (sort === "top") {
    extra = "&t=week";
  }

  var url = "https://www.reddit.com/r/" + subreddit + "/" + actualSort + ".json?limit=50&raw_json=1" + extra;

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/4.0 (Google Apps Script)" },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) return [];

    var data = JSON.parse(response.getContentText());
    var children = data.data.children || [];

    return children.map(function(child) {
      return {
        id: child.data.id,
        title: child.data.title,
        selftext: child.data.selftext || "",
        subreddit: child.data.subreddit,
        author: child.data.author,
        score: child.data.score,
        num_comments: child.data.num_comments,
        created_utc: child.data.created_utc,
        permalink: "https://www.reddit.com" + child.data.permalink
      };
    });
  } catch (e) {
    return [];
  }
}


/**
 * Score posts for ZopNight / ZopDay relevance
 * Prioritizes: high engagement + cloud/finops topic + question/discussion format
 */
function scorePosts(posts) {
  return posts.map(function(post) {
    var text = (post.title + " " + post.selftext).toLowerCase();

    // Count keyword matches
    var matchedKeywords = ZOPNIGHT_KEYWORDS.filter(function(kw) {
      return text.indexOf(kw) !== -1;
    });

    // ============ CLOUD TOPIC RELEVANCE (is this about cloud/finops?) ============
    var cloudRelevance = 0;

    // Strong cloud/finops signals
    if (text.indexOf("finops") !== -1 || text.indexOf("fin ops") !== -1) cloudRelevance += 3;
    if (text.indexOf("cloud cost") !== -1 || text.indexOf("cloud spend") !== -1) cloudRelevance += 3;
    if (text.indexOf("aws") !== -1 || text.indexOf("amazon web") !== -1) cloudRelevance += 2;
    if (text.indexOf("azure") !== -1 || text.indexOf("gcp") !== -1 || text.indexOf("google cloud") !== -1) cloudRelevance += 2;
    if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1 || text.indexOf("eks") !== -1 || text.indexOf("gke") !== -1) cloudRelevance += 2;
    if (text.indexOf("ec2") !== -1 || text.indexOf("rds") !== -1 || text.indexOf("lambda") !== -1 || text.indexOf("s3") !== -1) cloudRelevance += 2;
    if (text.indexOf("terraform") !== -1 || text.indexOf("infrastructure as code") !== -1) cloudRelevance += 2;
    if (text.indexOf("devops") !== -1 || text.indexOf("sre") !== -1) cloudRelevance += 1;
    if (text.indexOf("cloud") !== -1) cloudRelevance += 1;
    if (text.indexOf("infrastructure") !== -1) cloudRelevance += 1;
    if (text.indexOf("server") !== -1 || text.indexOf("instance") !== -1 || text.indexOf("vm") !== -1) cloudRelevance += 1;
    if (text.indexOf("docker") !== -1 || text.indexOf("container") !== -1) cloudRelevance += 1;

    // Medium signals — cost/optimization in cloud context
    if (text.indexOf("cost optimization") !== -1 || text.indexOf("cost optimisation") !== -1) cloudRelevance += 2;
    if (text.indexOf("cost management") !== -1 || text.indexOf("cost reduction") !== -1) cloudRelevance += 2;
    if (text.indexOf("reserved instance") !== -1 || text.indexOf("savings plan") !== -1 || text.indexOf("spot instance") !== -1) cloudRelevance += 2;
    if (text.indexOf("automation") !== -1 && (text.indexOf("cost") !== -1 || text.indexOf("cloud") !== -1 || text.indexOf("infrastructure") !== -1)) cloudRelevance += 2;

    // ZopNight-specific signals
    if (text.indexOf("idle") !== -1 && (text.indexOf("resource") !== -1 || text.indexOf("instance") !== -1 || text.indexOf("environment") !== -1 || text.indexOf("cluster") !== -1)) cloudRelevance += 3;
    if (text.indexOf("non-prod") !== -1 || text.indexOf("non prod") !== -1 || text.indexOf("nonprod") !== -1) cloudRelevance += 3;
    if (text.indexOf("staging") !== -1 && (text.indexOf("cost") !== -1 || text.indexOf("environment") !== -1)) cloudRelevance += 2;
    if (text.indexOf("dev environment") !== -1 && text.indexOf("cost") !== -1) cloudRelevance += 2;
    if (text.indexOf("shutdown") !== -1 && (text.indexOf("schedule") !== -1 || text.indexOf("automat") !== -1 || text.indexOf("night") !== -1 || text.indexOf("weekend") !== -1)) cloudRelevance += 3;
    if (text.indexOf("24/7") !== -1 && (text.indexOf("running") !== -1 || text.indexOf("cost") !== -1)) cloudRelevance += 2;
    if (text.indexOf("waste") !== -1 && (text.indexOf("cloud") !== -1 || text.indexOf("resource") !== -1 || text.indexOf("infra") !== -1)) cloudRelevance += 2;

    // Cap at 10
    cloudRelevance = Math.min(cloudRelevance, 10);

    // ★ HARD FILTER: Skip posts that have basically no cloud/finops relevance ★
    if (cloudRelevance < 2) {
      post.overall = 0;
      return post;
    }

    // ============ ENGAGEMENT SCORE ============
    var engagement = 2;
    if (post.num_comments >= 10) engagement += 1;
    if (post.num_comments >= 20) engagement += 1;
    if (post.num_comments >= 50) engagement += 1;
    if (post.num_comments >= 100) engagement += 1;
    if (post.num_comments >= 200) engagement += 1;
    if (post.score >= 10) engagement += 1;
    if (post.score >= 50) engagement += 1;
    if (post.score >= 100) engagement += 1;
    engagement = Math.min(engagement, 10);

    // ============ COMMENT OPPORTUNITY (is this a discussion you can join?) ============
    var opportunity = 3;
    if (text.indexOf("?") !== -1) opportunity += 1;
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("which") !== -1) opportunity += 1;
    if (text.indexOf("recommend") !== -1 || text.indexOf("advice") !== -1 || text.indexOf("suggestion") !== -1) opportunity += 2;
    if (text.indexOf("help") !== -1 || text.indexOf("looking for") !== -1 || text.indexOf("anyone") !== -1) opportunity += 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("platform") !== -1 || text.indexOf("solution") !== -1 || text.indexOf("software") !== -1) opportunity += 1;
    if (text.indexOf("best") !== -1 || text.indexOf("compare") !== -1 || text.indexOf("vs") !== -1) opportunity += 1;
    if (post.num_comments >= 5 && post.num_comments <= 100) opportunity += 1;
    opportunity = Math.min(opportunity, 10);

    // ============ SPAM RISK ============
    var spamRisk = 5;
    if (post.num_comments > 15) spamRisk -= 1;
    if (post.num_comments > 50) spamRisk -= 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("recommend") !== -1 || text.indexOf("which") !== -1 || text.indexOf("best") !== -1) spamRisk -= 2;
    if (text.indexOf("?") !== -1) spamRisk -= 1;
    if (post.num_comments < 3) spamRisk += 2;
    spamRisk = Math.max(1, Math.min(spamRisk, 10));

    // ============ OVERALL SCORE ============
    var overall = Math.round(
      (cloudRelevance * 0.35 + engagement * 0.25 + opportunity * 0.25 + (10 - spamRisk) * 0.15) * 10
    ) / 10;

    // ============ PAIN TYPE ============
    var painType = classifyPainType(text);

    // ============ PRODUCT ============
    var product = "Both";
    if (text.indexOf("idle") !== -1 || text.indexOf("shutdown") !== -1 || text.indexOf("schedule") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1 || text.indexOf("nights") !== -1 || text.indexOf("weekends") !== -1 || text.indexOf("24/7") !== -1 || text.indexOf("always running") !== -1) {
      product = "ZopNight";
    } else if (text.indexOf("visibility") !== -1 || text.indexOf("dashboard") !== -1 || text.indexOf("guardrail") !== -1 || text.indexOf("monitoring") !== -1 || text.indexOf("alerting") !== -1) {
      product = "ZopDay";
    }

    // ============ SPAM LABEL ============
    var spamLabel = spamRisk <= 3 ? "Low" : spamRisk >= 7 ? "High" : "Medium";

    post.cloudRelevance = cloudRelevance;
    post.engagement = engagement;
    post.opportunity = opportunity;
    post.spamRisk = spamRisk;
    post.overall = overall;
    post.painType = painType;
    post.spamLabel = spamLabel;
    post.product = product;
    post.angle = getSuggestedAngle(painType);
    post.why = getWhyGood(post, matchedKeywords, painType);
    post.matchedKeywords = matchedKeywords;

    return post;

  }).filter(function(post) {
    return post.overall >= 5.0 && post.cloudRelevance >= 2;
  }).sort(function(a, b) {
    // Sort by overall, tie-break by engagement (prefer posts with more comments)
    if (b.overall !== a.overall) return b.overall - a.overall;
    return b.num_comments - a.num_comments;
  });
}


/**
 * Classify pain type from text
 */
function classifyPainType(text) {
  if (text.indexOf("finops") !== -1 || text.indexOf("fin ops") !== -1) return "FinOps";
  if (text.indexOf("idle") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1 || text.indexOf("test environment") !== -1 || text.indexOf("qa environment") !== -1) return "Idle Non-Prod Environments";
  if (text.indexOf("bill spike") !== -1 || text.indexOf("unexpected bill") !== -1 || text.indexOf("bill shock") !== -1 || text.indexOf("surprise bill") !== -1) return "Cloud Bill Spike";
  if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1 || text.indexOf("eks") !== -1 || text.indexOf("gke") !== -1 || text.indexOf("aks") !== -1) return "K8s Cost";
  if (text.indexOf("zombie") !== -1 || text.indexOf("phantom") !== -1 || text.indexOf("unused") !== -1 || text.indexOf("orphan") !== -1) return "Zombie Resources";
  if (text.indexOf("startup") !== -1 && (text.indexOf("cost") !== -1 || text.indexOf("burn") !== -1 || text.indexOf("runway") !== -1)) return "Startup Cloud Cost";
  if (text.indexOf("waste") !== -1 || text.indexOf("wasted") !== -1) return "Cloud Waste";
  if (text.indexOf("right-siz") !== -1 || text.indexOf("rightsiz") !== -1 || text.indexOf("over-provision") !== -1) return "Right-Sizing";
  if (text.indexOf("reserved") !== -1 || text.indexOf("spot instance") !== -1 || text.indexOf("savings plan") !== -1) return "Cost Optimization";
  if (text.indexOf("budget") !== -1 || text.indexOf("alert") !== -1) return "Budget & Alerting";
  if (text.indexOf("automation") !== -1 && (text.indexOf("cost") !== -1 || text.indexOf("cloud") !== -1 || text.indexOf("infra") !== -1)) return "Cloud Automation";
  if (text.indexOf("tool") !== -1 && (text.indexOf("cost") !== -1 || text.indexOf("cloud") !== -1 || text.indexOf("finops") !== -1)) return "Cloud Cost Tools";
  if (text.indexOf("cost optimization") !== -1 || text.indexOf("cost optimisation") !== -1 || text.indexOf("cost management") !== -1) return "Cost Optimization";
  if (text.indexOf("visibility") !== -1 || text.indexOf("monitoring") !== -1) return "Cost Visibility";
  return "Cloud Cost";
}


/**
 * Get suggested angle by pain type
 */
function getSuggestedAngle(painType) {
  var angles = {
    "FinOps": "Share how FinOps automation (like scheduling non-prod shutdowns) delivers 40-60% savings without manual work. Dashboards show waste — automation fixes it.",
    "Idle Non-Prod Environments": "Share how auto-shutdown for dev/staging/QA during nights + weekends saved 40-60%. Mention dependency-aware orchestration and 2-min agentless setup.",
    "Cloud Bill Spike": "Empathize with bill shock. Budget alerts notify but don't fix — you need automation that shuts idle things down. Share a savings example.",
    "Zombie Resources": "Finding zombies is step 1, preventing them is step 2. Scheduled shutdown of non-prod prevents zombie accumulation at the source.",
    "K8s Cost": "Dev/staging K8s clusters running 24/7 is the hidden cost. Scheduling cluster scale-down during off-hours cuts 40-60% with zero developer impact.",
    "Cloud Waste": "Gap between visibility and action is the real problem. Dashboards show waste but don't fix it — automation + guardrails do.",
    "Cost Optimization": "Beyond reserved/spot instances, scheduling non-prod shutdowns is the easiest quick win most teams overlook. 2-min setup, 40-60% savings.",
    "Budget & Alerting": "Budget alerts tell you there's a fire — automation puts it out. Auto-shutdown + guardrails prevent overruns, not just notify.",
    "Right-Sizing": "Right-sizing is great for prod, but for non-prod the bigger win is shutting them down when nobody's using them (nights/weekends).",
    "Cloud Automation": "The best automation goes beyond CI/CD — it also handles cost. Auto-shutdown of idle non-prod environments is the quick win most teams miss.",
    "Cloud Cost Tools": "When recommending tools, mention the gap most tools miss: they show cost but don't act. Automation that shuts down idle resources is the missing piece.",
    "Cost Visibility": "Visibility is step 1. Step 2 is guardrails that auto-enforce policies — not dashboards you check once a month.",
    "Startup Cloud Cost": "Quick win for startups: schedule non-prod to auto-shutdown outside work hours. 40-60% savings, zero code changes, 2-min setup.",
    "Cloud Cost": "Share practical cloud cost experience. Focus on actionable tips — scheduling, automation, and guardrails over manual dashboards."
  };
  return angles[painType] || angles["Cloud Cost"];
}


/**
 * Explain why this is a good engagement opportunity
 */
function getWhyGood(post, matchedKeywords, painType) {
  var reasons = [];

  if (post.num_comments >= 50) reasons.push("🔥 Very active (" + post.num_comments + " comments)");
  else if (post.num_comments >= 20) reasons.push("Active discussion (" + post.num_comments + " comments)");
  else if (post.num_comments >= 10) reasons.push("Good discussion (" + post.num_comments + " comments)");

  if (post.score >= 50) reasons.push("High upvotes (" + post.score + ")");

  if (matchedKeywords.length >= 4) reasons.push("Strong ZopNight match (" + matchedKeywords.length + " keywords)");
  else if (matchedKeywords.length >= 2) reasons.push("Good keyword match (" + matchedKeywords.length + ")");

  var title = post.title.toLowerCase();
  if (title.indexOf("?") !== -1) reasons.push("Asking a question");
  if (title.indexOf("recommend") !== -1 || title.indexOf("best") !== -1 || title.indexOf("tool") !== -1) reasons.push("Asking for tool recommendations");
  if (title.indexOf("how") !== -1) reasons.push("Seeking advice");

  reasons.push(painType + " in r/" + post.subreddit);

  return reasons.join(" · ");
}


/**
 * Send HTML email
 */
function sendEmail(posts, totalScanned, totalFiltered) {
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "EEEE, MMMM d, yyyy");

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">';

  // Header
  html += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:12px;margin-bottom:20px;">';
  html += '<h1 style="color:#f97316;margin:0;font-size:24px;">🎯 Reddit Scout — Cloud & FinOps</h1>';
  html += '<p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;">' + today + '</p>';
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:14px;">' + TARGET_SUBREDDITS.length + ' subreddits scanned | ' + totalScanned + ' posts | ' + totalFiltered + ' qualified | Top ' + posts.length + '</p>';
  html += '</div>';

  // Communities list
  html += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;">';
  html += '<p style="margin:0;font-size:11px;color:#0369a1;line-height:1.6;"><strong>Communities:</strong> ' + TARGET_SUBREDDITS.map(function(s) { return 'r/' + s; }).join(' · ') + '</p>';
  html += '</div>';

  // Workflow
  html += '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<p style="margin:0;font-size:13px;color:#065f46;">📋 <strong>Your workflow:</strong> Pick 3-4 posts → Open on Reddit → Write helpful comment about cloud cost experience → Mention ZopNight where it fits naturally</p>';
  html += '</div>';

  // Posts
  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";

    var scoreColor = post.overall >= 8 ? "#10b981" : post.overall >= 7 ? "#22c55e" : post.overall >= 6 ? "#eab308" : "#f97316";
    var spamColor = post.spamLabel === "Low" ? "#22c55e" : post.spamLabel === "Medium" ? "#eab308" : "#ef4444";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';

    // Top badges
    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' · r/' + escapeHtml(post.subreddit) + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall.toFixed(1) + '/10</span> ';
    html += '<span style="color:' + spamColor + ';font-size:11px;font-weight:600;">' + post.spamLabel + ' risk</span> ';
    html += '<span style="color:#7c3aed;font-size:11px;font-weight:600;">' + post.product + '</span>';
    html += '</div>';

    // Title
    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + escapeHtml(post.title) + '</a>';

    // Metrics
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">⬆ ' + post.score + ' · 💬 ' + post.num_comments + ' comments · ' + ageStr + ' · u/' + escapeHtml(post.author) + '</p>';

    // Pain type
    html += '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;margin:10px 0;">';
    html += '<span style="font-size:12px;color:#92400e;font-weight:600;">🔥 ' + post.painType + '</span>';
    html += '</div>';

    // Why
    if (post.why) {
      html += '<p style="color:#334155;font-size:13px;margin:8px 0;line-height:1.5;"><strong>Why:</strong> ' + escapeHtml(post.why) + '</p>';
    }

    // Body preview
    if (post.selftext && post.selftext.length > 0) {
      var preview = post.selftext.substring(0, 250).replace(/\n/g, " ");
      if (post.selftext.length > 250) preview += "...";
      html += '<p style="color:#475569;font-size:13px;margin:8px 0;line-height:1.5;background:#f8fafc;padding:10px;border-radius:6px;border-left:3px solid #e2e8f0;">' + escapeHtml(preview) + '</p>';
    }

    // Keywords
    if (post.matchedKeywords && post.matchedKeywords.length > 0) {
      html += '<p style="font-size:11px;color:#6366f1;margin:6px 0;">Matched: ' + post.matchedKeywords.slice(0, 8).join(', ') + '</p>';
    }

    // Sub-scores
    html += '<p style="color:#64748b;font-size:12px;margin:8px 0;">Cloud Relevance: ' + post.cloudRelevance + '/10 · Engagement: ' + post.engagement + '/10 · Opportunity: ' + post.opportunity + '/10 · Promo Risk: ' + post.spamRisk + '/10</p>';

    // Suggested angle
    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin:10px 0;">';
    html += '<p style="margin:0;font-size:13px;color:#9a3412;"><strong>💡 Suggested Angle:</strong> ' + post.angle + '</p>';
    html += '</div>';

    // CTA
    html += '<a href="' + post.permalink + '" style="display:inline-block;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;">Open on Reddit →</a>';

    html += '</div>';
  }

  // Footer
  html += '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">';
  html += 'Reddit Scout v4 by ZopDev · Targeted cloud/finops communities only · Runs daily';
  html += '</div>';
  html += '</div>';

  GmailApp.sendEmail(YOUR_EMAIL,
    "🎯 Reddit Scout: " + posts.length + " Cloud/FinOps Opportunities (" + Utilities.formatDate(new Date(), "Asia/Kolkata", "MMM d") + ")",
    "View this email in HTML format for the full report.",
    { htmlBody: html }
  );
}


/**
 * Send email when no posts found
 */
function sendEmptyEmail(totalScanned) {
  GmailApp.sendEmail(YOUR_EMAIL,
    "📡 Reddit Scout: No cloud/finops opportunities today",
    "Scanned " + TARGET_SUBREDDITS.length + " cloud/devops/finops subreddits (" + totalScanned + " posts) but no qualifying posts matched today. The bot will try again tomorrow."
  );
}


/**
 * Escape HTML
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
