/**
 * ============================================================
 * REDDIT SCOUT BOT v5 - Context-Aware Product Matching
 * ============================================================
 *
 * Instead of keyword matching, this bot understands WHAT
 * ZopNight and ZopDay actually do and finds Reddit posts
 * where you can naturally talk about them.
 *
 * ZopNight: Auto-shutdown idle non-prod cloud resources
 *   → Saves 40-60% on dev/staging/QA environments
 *   → Dependency-aware orchestration (shuts down in right order)
 *   → Agentless, 2-min setup, multi-cloud (AWS/Azure/GCP)
 *   → Schedules nights + weekends auto-off
 *
 * ZopDay: Cloud cost visibility + automation-driven optimization
 *   → Real-time cost dashboards with anomaly detection
 *   → Guardrails that auto-enforce policies (not just alerts)
 *   → Resource tagging compliance
 *   → Recommendations that auto-execute
 *
 * Posts: Last 4 days only · Top 7 · From cloud/devops subreddits
 * COST: $0 (completely free)
 * ============================================================
 */

// ===== YOUR EMAIL =====
var YOUR_EMAIL = "muskan.bandta@zop.dev";

// ===== ONLY LAST 4 DAYS =====
var MAX_AGE_DAYS = 4;

// ===== SUBREDDITS TO SCAN =====
var TARGET_SUBREDDITS = [
  "aws", "devops", "cloudcomputing", "sysadmin", "kubernetes",
  "FinOps", "googlecloud", "azure", "terraform", "docker",
  "sre", "platform_engineering", "startups", "SaaS",
  "ITManagers", "Entrepreneur", "selfhosted", "developersIndia",
  "cscareerquestions", "AZURE"
];

// ===========================================================
// PRODUCT CONTEXT — This is what the bot "understands"
// Instead of keywords, we define USE CASES / SCENARIOS
// and score posts based on how well they match
// ===========================================================

/**
 * ZopNight contexts — situations where ZopNight is THE answer
 * Each context has: phrases that indicate the situation,
 * and a weight (how perfectly it matches ZopNight)
 */
var ZOPNIGHT_CONTEXTS = [
  // PERFECT FIT — Person is literally describing the problem ZopNight solves
  {
    name: "Non-prod environments running 24/7",
    weight: 10,
    phrases: ["dev environment", "staging environment", "test environment", "qa environment",
              "sandbox environment", "non-prod", "non prod", "nonprod",
              "dev cluster", "staging cluster", "test cluster",
              "running 24/7", "always running", "running all the time",
              "left running", "forgot to turn off", "forgot to shut down",
              "running overnight", "running on weekends"]
  },
  {
    name: "Scheduling cloud resource shutdown",
    weight: 10,
    phrases: ["shutdown schedule", "scheduled shutdown", "auto shutdown", "auto-shutdown",
              "turn off at night", "shut down weekends", "off-hours",
              "after hours", "start stop schedule", "power schedule",
              "schedule instances", "stop instances at night"]
  },
  {
    name: "Idle cloud resources wasting money",
    weight: 9,
    phrases: ["idle resources", "idle instances", "idle servers", "idle clusters",
              "unused resources", "unused instances", "underutilized",
              "zombie resources", "phantom resources", "orphaned resources",
              "wasting money on cloud", "cloud waste", "resource waste",
              "paying for nothing", "paying for unused"]
  },
  {
    name: "Cloud bill too high — looking for quick wins",
    weight: 8,
    phrases: ["aws bill too high", "cloud bill shock", "unexpected aws bill",
              "surprise cloud bill", "cloud bill spike", "reduce aws bill",
              "cut cloud cost", "lower cloud spend", "save on aws",
              "save on cloud", "cloud cost too high", "aws cost exploded",
              "azure bill high", "gcp bill high", "cloud budget exceeded"]
  },
  {
    name: "Dev/test environment cost management",
    weight: 9,
    phrases: ["dev environment cost", "staging cost", "test environment cost",
              "qa environment cost", "dev cluster cost", "multiple environments",
              "too many environments", "environment sprawl",
              "each developer has their own", "personal dev environment"]
  },
  {
    name: "Kubernetes cluster cost optimization",
    weight: 8,
    phrases: ["kubernetes cost", "k8s cost", "eks cost", "gke cost", "aks cost",
              "cluster cost", "kubernetes expensive", "k8s expensive",
              "kubernetes bill", "kubernetes spend", "k8s optimization",
              "cluster autoscaling cost", "namespace cost"]
  },
  {
    name: "Startup cloud burn rate / runway",
    weight: 7,
    phrases: ["cloud burn rate", "startup cloud cost", "startup aws bill",
              "bootstrapped cloud cost", "limited budget cloud",
              "early stage cloud", "small team cloud cost",
              "spending too much on cloud", "runway getting shorter",
              "cloud eating our budget"]
  },
  {
    name: "FinOps practices and tools",
    weight: 8,
    phrases: ["finops", "fin ops", "finops tool", "finops practice",
              "finops team", "finops role", "finops engineer",
              "finops automation", "finops strategy",
              "cloud financial management", "cloud financial operations"]
  },
  {
    name: "Cloud cost automation (not just dashboards)",
    weight: 8,
    phrases: ["cost automation", "automate cost saving", "automated cost",
              "auto remediation", "automated optimization",
              "automated shutdown", "cost guardrails",
              "policy enforcement cloud", "auto-enforce cost policy"]
  },
  {
    name: "Over-provisioned / right-sizing resources",
    weight: 7,
    phrases: ["over-provisioned", "overprovisioned", "right-sizing", "rightsizing",
              "right sizing", "oversized instances", "too large instances",
              "instance size", "compute right-sizing"]
  },
  {
    name: "Cloud cost visibility and monitoring",
    weight: 7,
    phrases: ["cost visibility", "cloud cost dashboard", "cost monitoring",
              "cost anomaly", "cost allocation", "cost attribution",
              "tag compliance", "resource tagging", "cost reporting",
              "who is spending", "which team spending"]
  },
  {
    name: "Reserved instances vs on-demand vs spot",
    weight: 6,
    phrases: ["reserved instance", "savings plan", "spot instance",
              "on-demand cost", "ri coverage", "commitment discount",
              "reserved vs on-demand", "savings plan coverage"]
  },
  {
    name: "Cloud cost tools and recommendations",
    weight: 8,
    phrases: ["cloud cost tool", "cost optimization tool", "finops tool",
              "recommend cost tool", "best cloud cost", "which tool for cloud cost",
              "cost management tool", "infracost", "kubecost",
              "cloudability", "cloudhealth", "spot.io", "cast.ai"]
  },
  {
    name: "Multi-cloud cost management",
    weight: 7,
    phrases: ["multi-cloud cost", "multi cloud cost", "aws and azure cost",
              "aws and gcp", "managing costs across clouds",
              "cloud agnostic cost", "hybrid cloud cost"]
  },
  {
    name: "Infrastructure automation saving money",
    weight: 7,
    phrases: ["automation saved money", "automation paid off",
              "infrastructure automation roi", "what automation saved you",
              "best automation for saving", "devops automation cost",
              "terraform cost saving", "iac cost"]
  }
];

/**
 * ZopDay contexts — situations where ZopDay is the answer
 */
var ZOPDAY_CONTEXTS = [
  {
    name: "Need cost visibility across teams/projects",
    weight: 9,
    phrases: ["cost visibility", "cost allocation", "cost attribution",
              "which team is spending", "cost per team", "cost per project",
              "chargeback", "showback", "cost breakdown by service"]
  },
  {
    name: "Cost dashboards and reporting",
    weight: 8,
    phrases: ["cost dashboard", "cost report", "cost monitoring",
              "cloud spend report", "monthly cloud report",
              "cost trend", "cost anomaly detection"]
  },
  {
    name: "Cost guardrails and policies",
    weight: 9,
    phrases: ["cost guardrail", "cost policy", "budget enforcement",
              "spending limit", "cost governance", "prevent overspend",
              "budget alert not enough", "need more than alerts"]
  },
  {
    name: "Resource tagging and compliance",
    weight: 8,
    phrases: ["resource tagging", "tag compliance", "tag policy",
              "untagged resources", "tagging strategy",
              "tag enforcement", "mandatory tags"]
  },
  {
    name: "Cost recommendations that actually execute",
    weight: 8,
    phrases: ["cost recommendation", "optimization recommendation",
              "trusted advisor", "aws advisor", "cost explorer alternative",
              "recommendation but nobody acts", "recommendation ignored"]
  }
];


// ===========================================================
// SEARCH QUERIES — derived from product contexts
// ===========================================================
var SEARCH_QUERIES = [
  "cloud cost", "AWS bill", "reduce cloud cost", "cloud waste",
  "idle resources", "shutdown schedule", "dev environment cost",
  "staging environment", "kubernetes cost", "finops",
  "cost optimization tool", "non-production environment",
  "cloud budget", "over-provisioned", "cost automation",
  "infrastructure automation cost", "cloud cost visibility"
];


// ===========================================================
// MAIN
// ===========================================================
function dailyScan() {
  Logger.log("🎯 Reddit Scout v5 — Context-Aware Matching");
  Logger.log("Looking for posts where ZopNight/ZopDay can be discussed naturally...");

  var allPosts = fetchPosts();
  Logger.log("Collected " + allPosts.length + " posts from " + TARGET_SUBREDDITS.length + " subreddits");

  var scored = contextScore(allPosts);
  Logger.log("Posts with good context match: " + scored.length);

  var top7 = scored.slice(0, 7);

  if (top7.length > 0) {
    sendEmail(top7, allPosts.length, scored.length);
    Logger.log("✅ Sent " + top7.length + " opportunities!");
  } else {
    sendEmptyEmail(allPosts.length);
    Logger.log("⚠️ No matching posts today");
  }
}


// ===========================================================
// FETCH — Search + Hot + New from each subreddit, last 4 days
// ===========================================================
function fetchPosts() {
  var seen = {};
  var results = [];
  var now = Math.floor(Date.now() / 1000);
  var maxAge = MAX_AGE_DAYS * 86400;

  for (var s = 0; s < TARGET_SUBREDDITS.length; s++) {
    var sub = TARGET_SUBREDDITS[s];
    Logger.log("  r/" + sub);
    var count = 0;

    // Search with queries
    for (var q = 0; q < SEARCH_QUERIES.length; q++) {
      var posts = searchSub(sub, SEARCH_QUERIES[q]);
      for (var j = 0; j < posts.length; j++) {
        var p = posts[j];
        if (seen[p.id]) continue;
        var age = now - p.created_utc;
        if (age > maxAge) continue;
        seen[p.id] = true;
        p.ageHours = Math.round(age / 3600);
        results.push(p);
        count++;
      }
      Utilities.sleep(2000);
    }

    // Hot + New
    var browse = fetchSub(sub, "hot").concat(fetchSub(sub, "new"));
    for (var b = 0; b < browse.length; b++) {
      var p2 = browse[b];
      if (seen[p2.id]) continue;
      var age2 = now - p2.created_utc;
      if (age2 > maxAge) continue;
      seen[p2.id] = true;
      p2.ageHours = Math.round(age2 / 3600);
      results.push(p2);
      count++;
    }

    Logger.log("    " + count + " posts");
    Utilities.sleep(1500);
  }

  return results;
}


function searchSub(sub, query) {
  var url = "https://www.reddit.com/r/" + sub + "/search.json"
    + "?q=" + encodeURIComponent(query)
    + "&restrict_sr=1&sort=new&t=week&limit=25&raw_json=1&type=link";

  try {
    var r = UrlFetchApp.fetch(url, {
      headers: {"User-Agent": "RedditScoutBot/5.0"},
      muteHttpExceptions: true
    });
    if (r.getResponseCode() === 429) {
      Utilities.sleep(15000);
      r = UrlFetchApp.fetch(url, {
        headers: {"User-Agent": "RedditScoutBot/5.0"},
        muteHttpExceptions: true
      });
    }
    if (r.getResponseCode() !== 200) return [];
    return JSON.parse(r.getContentText()).data.children.map(function(c) {
      return {
        id: c.data.id, title: c.data.title, selftext: c.data.selftext || "",
        subreddit: c.data.subreddit, author: c.data.author,
        score: c.data.score, num_comments: c.data.num_comments,
        created_utc: c.data.created_utc,
        permalink: "https://www.reddit.com" + c.data.permalink
      };
    });
  } catch(e) { return []; }
}


function fetchSub(sub, sort) {
  var url = "https://www.reddit.com/r/" + sub + "/" + sort + ".json?limit=50&raw_json=1";
  try {
    var r = UrlFetchApp.fetch(url, {
      headers: {"User-Agent": "RedditScoutBot/5.0"},
      muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return [];
    return JSON.parse(r.getContentText()).data.children.map(function(c) {
      return {
        id: c.data.id, title: c.data.title, selftext: c.data.selftext || "",
        subreddit: c.data.subreddit, author: c.data.author,
        score: c.data.score, num_comments: c.data.num_comments,
        created_utc: c.data.created_utc,
        permalink: "https://www.reddit.com" + c.data.permalink
      };
    });
  } catch(e) { return []; }
}


// ===========================================================
// CONTEXT SCORING — Match posts against product use cases
// ===========================================================
function contextScore(posts) {
  return posts.map(function(post) {
    var text = (post.title + " " + post.selftext).toLowerCase();

    // --- Match against ZopNight contexts ---
    var nightScore = 0;
    var nightMatches = [];
    for (var i = 0; i < ZOPNIGHT_CONTEXTS.length; i++) {
      var ctx = ZOPNIGHT_CONTEXTS[i];
      var matched = false;
      for (var j = 0; j < ctx.phrases.length; j++) {
        if (text.indexOf(ctx.phrases[j]) !== -1) {
          matched = true;
          break;
        }
      }
      if (matched) {
        nightScore += ctx.weight;
        nightMatches.push(ctx.name);
      }
    }

    // --- Match against ZopDay contexts ---
    var dayScore = 0;
    var dayMatches = [];
    for (var i2 = 0; i2 < ZOPDAY_CONTEXTS.length; i2++) {
      var ctx2 = ZOPDAY_CONTEXTS[i2];
      var matched2 = false;
      for (var j2 = 0; j2 < ctx2.phrases.length; j2++) {
        if (text.indexOf(ctx2.phrases[j2]) !== -1) {
          matched2 = true;
          break;
        }
      }
      if (matched2) {
        dayScore += ctx2.weight;
        dayMatches.push(ctx2.name);
      }
    }

    // Combined context score (normalized to 10)
    var rawContext = nightScore + dayScore;
    var contextScore = Math.min(rawContext / 3, 10);  // /3 normalizes nicely

    // Skip posts with no context match at all
    if (nightMatches.length === 0 && dayMatches.length === 0) {
      post.overall = 0;
      return post;
    }

    // --- Engagement ---
    var engagement = 2;
    if (post.num_comments >= 5) engagement += 1;
    if (post.num_comments >= 10) engagement += 1;
    if (post.num_comments >= 20) engagement += 1;
    if (post.num_comments >= 50) engagement += 2;
    if (post.score >= 10) engagement += 1;
    if (post.score >= 50) engagement += 1;
    if (post.score >= 100) engagement += 1;
    engagement = Math.min(engagement, 10);

    // --- Comment opportunity ---
    var opp = 3;
    if (text.indexOf("?") !== -1) opp += 1;
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("which") !== -1) opp += 1;
    if (text.indexOf("recommend") !== -1 || text.indexOf("advice") !== -1 || text.indexOf("suggest") !== -1) opp += 2;
    if (text.indexOf("help") !== -1 || text.indexOf("looking for") !== -1 || text.indexOf("anyone use") !== -1) opp += 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("platform") !== -1 || text.indexOf("solution") !== -1) opp += 1;
    opp = Math.min(opp, 10);

    // --- Overall ---
    var overall = Math.round(
      (contextScore * 0.45 + engagement * 0.25 + opp * 0.20 + Math.min(nightMatches.length + dayMatches.length, 5) * 0.10 / 5 * 10) * 10
    ) / 10;

    // --- Which product ---
    var product = "Both";
    if (nightScore > dayScore * 1.5) product = "ZopNight";
    else if (dayScore > nightScore * 1.5) product = "ZopDay";

    // --- Generate context-aware comment suggestion ---
    var angle = generateAngle(nightMatches, dayMatches, product, text);

    // --- Why this post is good ---
    var allMatches = nightMatches.concat(dayMatches);
    var why = generateWhy(post, allMatches);

    post.contextScore = contextScore;
    post.engagement = engagement;
    post.opportunity = opp;
    post.overall = overall;
    post.product = product;
    post.nightMatches = nightMatches;
    post.dayMatches = dayMatches;
    post.angle = angle;
    post.why = why;
    post.matchCount = allMatches.length;

    return post;

  }).filter(function(post) {
    return post.overall >= 4.5 && (post.nightMatches.length > 0 || post.dayMatches.length > 0);
  }).sort(function(a, b) {
    if (b.overall !== a.overall) return b.overall - a.overall;
    return b.matchCount - a.matchCount;
  });
}


// ===========================================================
// ANGLE — Context-aware comment suggestions
// ===========================================================
function generateAngle(nightMatches, dayMatches, product, text) {
  // Pick the best angle based on which context matched

  if (nightMatches.indexOf("Non-prod environments running 24/7") !== -1) {
    return "This is EXACTLY what ZopNight solves. Share: 'We had the same problem — dev/staging running 24/7 burning cash. We set up auto-shutdown schedules for nights/weekends and saved 50%. The key was dependency-aware orchestration so things shut down in the right order. Took 2 mins to set up, agentless.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Scheduling cloud resource shutdown") !== -1) {
    return "Perfect ZopNight opportunity. Share: 'We use scheduled shutdown for all non-prod — it's dependency-aware so databases shut down after apps, and start up in reverse. Agentless setup, works across AWS/Azure/GCP. Saved us 40-60% on non-prod costs.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Idle cloud resources wasting money") !== -1) {
    return "Talk about idle = wasted money. Share: 'The biggest source of idle resources we found was dev/staging environments running nights and weekends when nobody uses them. Auto-scheduling shutdown for off-hours was the single biggest cost win — 40-60% savings.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Cloud bill too high — looking for quick wins") !== -1) {
    return "Empathize, then share quick win: 'Fastest win we found: schedule non-prod environments (dev/staging/QA) to auto-shutdown at night and weekends. Most teams are paying full price for environments used 8hrs/day 5 days/week. That's 76% idle time. Auto-shutdown = instant 40-60% savings.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Dev/test environment cost management") !== -1) {
    return "Directly relevant: 'Dev/test environments are usually the #1 source of cloud waste because nobody tracks them. The fix: auto-shutdown schedules. Each dev gets their env auto-started at 9am and shut down at 7pm. Weekends off. 50%+ savings, zero developer friction.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Kubernetes cluster cost optimization") !== -1) {
    return "K8s specific: 'For non-prod K8s clusters, the biggest win isn't right-sizing pods — it's shutting down dev/staging clusters entirely during off-hours. We schedule cluster scale-down to 0 at night and weekends. Saves 40-60% with zero impact since nobody's using them.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Startup cloud burn rate / runway") !== -1) {
    return "Startup-friendly: 'Quick win that took us 2 minutes: auto-shutdown non-prod environments at night/weekends. We were paying 24/7 for things used 40hrs/week. That's 76% waste. Agentless setup, no code changes, saved us 40-60% on non-prod immediately.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("FinOps practices and tools") !== -1) {
    return "FinOps angle: 'One FinOps quick win that's often overlooked: non-prod environment scheduling. Most orgs have dev/staging running 24/7 but used 40hrs/week max. Auto-shutdown during off-hours is the lowest-effort, highest-ROI FinOps win — 40-60% savings.' → zop.dev/zopnight";
  }
  if (nightMatches.indexOf("Cloud cost tools and recommendations") !== -1) {
    return "Tool recommendation: 'Most cost tools show you dashboards but don't actually DO anything. The gap is automation — specifically, auto-shutdown of non-prod resources during off-hours. That single automation typically saves 40-60% on non-prod.' → zop.dev/zopnight";
  }

  if (dayMatches.indexOf("Need cost visibility across teams/projects") !== -1) {
    return "ZopDay angle: 'Visibility is step 1 but most teams stop there. What you really need: visibility + guardrails that auto-enforce. Tagging compliance, budget enforcement, and recommendations that auto-execute — not just dashboards you check monthly.' → zop.dev/zopday";
  }
  if (dayMatches.indexOf("Cost guardrails and policies") !== -1) {
    return "ZopDay angle: 'Budget alerts notify but don't prevent. What works: guardrails that actually enforce policy. If a team exceeds their budget, automation kicks in — not just an email nobody reads.' → zop.dev/zopday";
  }

  if (product === "ZopNight") {
    return "Share how scheduling auto-shutdown for non-prod resources during nights/weekends saved 40-60%. Mention: dependency-aware, agentless, 2-min setup, multi-cloud. → zop.dev/zopnight";
  }
  if (product === "ZopDay") {
    return "Share how cost visibility + guardrails (not just dashboards) drive real savings. Automation that enforces policies > dashboards you check monthly. → zop.dev/zopday";
  }
  return "Share practical cloud cost management experience. Focus on: automation over dashboards, scheduling non-prod shutdowns, guardrails that enforce policies. → zop.dev";
}


// ===========================================================
// WHY — Explain why this post is a good opportunity
// ===========================================================
function generateWhy(post, allMatches) {
  var reasons = [];

  if (post.num_comments >= 50) reasons.push("Very active thread (" + post.num_comments + " comments)");
  else if (post.num_comments >= 20) reasons.push("Active discussion (" + post.num_comments + " comments)");
  else if (post.num_comments >= 5) reasons.push(post.num_comments + " comments");

  if (post.score >= 50) reasons.push(post.score + " upvotes");

  if (allMatches.length >= 3) reasons.push("Matches " + allMatches.length + " product contexts");
  else if (allMatches.length >= 1) reasons.push("Matches: " + allMatches[0]);

  var title = post.title.toLowerCase();
  if (title.indexOf("?") !== -1) reasons.push("Asking for help");
  if (title.indexOf("tool") !== -1 || title.indexOf("recommend") !== -1) reasons.push("Asking for tool recs");

  reasons.push("r/" + post.subreddit);

  return reasons.join(" · ");
}


// ===========================================================
// EMAIL
// ===========================================================
function sendEmail(posts, totalScanned, totalFiltered) {
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "EEEE, MMMM d, yyyy");

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">';

  // Header
  html += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:12px;margin-bottom:20px;">';
  html += '<h1 style="color:#f97316;margin:0;font-size:22px;">🎯 ZopNight & ZopDay — Reddit Opportunities</h1>';
  html += '<p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;">' + today + ' · Last ' + MAX_AGE_DAYS + ' days</p>';
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:13px;">' + totalScanned + ' posts scanned → ' + totalFiltered + ' context matches → Top ' + posts.length + '</p>';
  html += '</div>';

  // Products reference
  html += '<div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:12px 16px;margin-bottom:12px;">';
  html += '<p style="margin:0;font-size:12px;color:#6b21a8;line-height:1.6;">';
  html += '<strong>ZopNight:</strong> Auto-shutdown idle non-prod resources (nights/weekends) · 40-60% savings · Dependency-aware · Agentless · <a href="https://zop.dev/zopnight" style="color:#7c3aed;">zop.dev/zopnight</a><br>';
  html += '<strong>ZopDay:</strong> Cloud cost visibility + guardrails + auto-enforce policies · <a href="https://zop.dev/zopday" style="color:#7c3aed;">zop.dev/zopday</a>';
  html += '</p></div>';

  // Workflow
  html += '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<p style="margin:0;font-size:13px;color:#065f46;">📋 Pick 3-4 posts → Open → Write helpful comment → Naturally mention ZopNight/ZopDay where it fits</p>';
  html += '</div>';

  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";
    var scoreColor = post.overall >= 8 ? "#10b981" : post.overall >= 6 ? "#22c55e" : "#eab308";
    var productColor = post.product === "ZopNight" ? "#7c3aed" : post.product === "ZopDay" ? "#2563eb" : "#6b21a8";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';

    // Top bar
    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' · r/' + escapeHtml(post.subreddit) + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall.toFixed(1) + '/10</span> ';
    html += '<span style="background:' + productColor + ';color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:700;">' + post.product + '</span>';
    html += '</div>';

    // Title
    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + escapeHtml(post.title) + '</a>';

    // Metrics
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">⬆ ' + post.score + ' · 💬 ' + post.num_comments + ' · ' + ageStr + ' · u/' + escapeHtml(post.author) + '</p>';

    // Why
    if (post.why) {
      html += '<p style="color:#334155;font-size:13px;margin:8px 0;"><strong>Why:</strong> ' + escapeHtml(post.why) + '</p>';
    }

    // Context matches
    var allM = (post.nightMatches || []).concat(post.dayMatches || []);
    if (allM.length > 0) {
      html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin:10px 0;">';
      html += '<p style="margin:0;font-size:12px;color:#166534;"><strong>✅ Context match:</strong> ' + escapeHtml(allM.join(" · ")) + '</p>';
      html += '</div>';
    }

    // Body preview
    if (post.selftext && post.selftext.length > 0) {
      var preview = post.selftext.substring(0, 250).replace(/\n/g, " ");
      if (post.selftext.length > 250) preview += "...";
      html += '<p style="color:#475569;font-size:13px;margin:8px 0;line-height:1.5;background:#f8fafc;padding:10px;border-radius:6px;border-left:3px solid #e2e8f0;">' + escapeHtml(preview) + '</p>';
    }

    // Suggested angle (bigger, more prominent)
    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin:12px 0;">';
    html += '<p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;"><strong>💡 How to comment:</strong><br>' + escapeHtml(post.angle) + '</p>';
    html += '</div>';

    // CTA
    html += '<a href="' + post.permalink + '" style="display:inline-block;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;">Open on Reddit →</a>';

    html += '</div>';
  }

  // Footer
  html += '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">';
  html += 'Reddit Scout v5 by ZopDev · Context-aware matching · <a href="https://zop.dev/zopnight" style="color:#f97316;">ZopNight</a> · <a href="https://zop.dev/zopday" style="color:#f97316;">ZopDay</a>';
  html += '</div></div>';

  GmailApp.sendEmail(YOUR_EMAIL,
    "🎯 " + posts.length + " Reddit posts to discuss ZopNight/ZopDay (" + Utilities.formatDate(new Date(), "Asia/Kolkata", "MMM d") + ")",
    "View in HTML for full report.",
    { htmlBody: html }
  );
}


function sendEmptyEmail(total) {
  GmailApp.sendEmail(YOUR_EMAIL,
    "📡 Reddit Scout: No matching posts today",
    "Scanned " + total + " posts from " + TARGET_SUBREDDITS.length + " subreddits (last " + MAX_AGE_DAYS + " days) — no posts matched ZopNight/ZopDay context today. Will try again tomorrow."
  );
}


function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
