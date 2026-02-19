/**
 * ============================================================
 * REDDIT SCOUT BOT v10 - Uses Reddit OAuth API (never blocked)
 * ============================================================
 *
 * Previous versions used public .json URLs which Reddit blocks
 * from Google Apps Script servers (returns 403 = 0 posts).
 *
 * v10 uses Reddit OAuth (script-to-script) which is the OFFICIAL
 * way to access Reddit from servers. Never gets blocked.
 *
 * ONE-TIME SETUP (5 minutes):
 *   1. Go to https://www.reddit.com/prefs/apps
 *   2. Click "create another app" at bottom
 *   3. Name: RedditScoutBot
 *   4. Type: select "script"
 *   5. Redirect URI: http://localhost
 *   6. Click "create app"
 *   7. Copy the Client ID (under the app name) and Secret
 *   8. Paste them below in REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET
 *   9. Put your Reddit username and password below
 *
 * COST: $0 (Reddit API is free, 60 requests/min)
 * ============================================================
 */

// ---- CHANGE THESE 4 VALUES ----
var REDDIT_CLIENT_ID = "PASTE_YOUR_CLIENT_ID_HERE";
var REDDIT_CLIENT_SECRET = "PASTE_YOUR_CLIENT_SECRET_HERE";
var REDDIT_USERNAME = "PASTE_YOUR_REDDIT_USERNAME";
var REDDIT_PASSWORD = "PASTE_YOUR_REDDIT_PASSWORD";
// --------------------------------

var YOUR_EMAIL = "muskan.bandta@zop.dev";
var MAX_AGE_DAYS = 4;
var TARGET_POST_COUNT = 8;

// 12 cloud subreddits
var TARGET_SUBREDDITS = [
  "aws", "devops", "cloudcomputing", "sysadmin", "kubernetes",
  "FinOps", "googlecloud", "azure", "terraform", "docker",
  "sre", "startups"
];

// 5 search queries
var SEARCH_QUERIES = [
  "cloud cost",
  "AWS bill",
  "finops",
  "idle resources",
  "cost optimization"
];


// ===========================================================
// PRODUCT CONTEXTS
// ===========================================================

var ZOPNIGHT_CONTEXTS = [
  { name: "Non-prod running 24/7", weight: 10,
    phrases: ["dev environment", "staging environment", "test environment", "qa environment",
              "sandbox environment", "non-prod", "non prod", "nonprod",
              "dev cluster", "staging cluster", "test cluster",
              "running 24/7", "always running", "running all the time",
              "left running", "forgot to turn off", "forgot to shut down",
              "running overnight", "running on weekends"] },
  { name: "Scheduling shutdown", weight: 10,
    phrases: ["shutdown schedule", "scheduled shutdown", "auto shutdown", "auto-shutdown",
              "turn off at night", "shut down weekends", "off-hours",
              "after hours", "start stop schedule", "power schedule",
              "schedule instances", "stop instances", "cron stop"] },
  { name: "Idle/unused resources", weight: 9,
    phrases: ["idle resources", "idle instances", "idle servers", "idle clusters",
              "unused resources", "unused instances", "underutilized",
              "zombie resources", "phantom resources", "orphaned resources",
              "wasting money", "cloud waste", "resource waste",
              "paying for nothing", "paying for unused", "not being used"] },
  { name: "High cloud bill", weight: 8,
    phrases: ["bill too high", "bill shock", "unexpected bill", "surprise bill",
              "bill spike", "reduce bill", "cut cost", "lower spend",
              "save on aws", "save on cloud", "cost too high", "cost exploded",
              "bill high", "budget exceeded", "over budget",
              "cloud expensive", "aws expensive", "too much money",
              "how to reduce", "how to save", "how to cut"] },
  { name: "Environment cost", weight: 9,
    phrases: ["environment cost", "staging cost", "dev cost", "test cost",
              "multiple environments", "too many environments", "environment sprawl",
              "each developer", "personal environment", "sandbox cost",
              "dev server", "test server", "staging server"] },
  { name: "K8s cost", weight: 8,
    phrases: ["kubernetes cost", "k8s cost", "eks cost", "gke cost", "aks cost",
              "cluster cost", "kubernetes expensive", "k8s expensive",
              "kubernetes bill", "k8s optimization", "namespace cost",
              "cluster scaling", "node cost"] },
  { name: "Startup burn rate", weight: 7,
    phrases: ["burn rate", "startup cost", "startup aws", "startup cloud",
              "bootstrapped", "limited budget", "early stage",
              "small team cloud", "spending too much", "runway",
              "side project cost", "hobby project cost"] },
  { name: "FinOps", weight: 8,
    phrases: ["finops", "fin ops", "finops tool", "finops practice",
              "finops team", "finops role", "finops engineer",
              "finops automation", "cloud financial"] },
  { name: "Cost automation", weight: 8,
    phrases: ["cost automation", "automate cost", "automated cost",
              "auto remediation", "automated optimization",
              "automated shutdown", "cost guardrails",
              "policy enforcement", "auto-enforce",
              "lambda to stop", "script to shutdown"] },
  { name: "Right-sizing", weight: 7,
    phrases: ["over-provisioned", "overprovisioned", "right-sizing", "rightsizing",
              "right sizing", "oversized instances", "instance type",
              "instance size", "compute optimization", "too large"] },
  { name: "Cost visibility", weight: 7,
    phrases: ["cost visibility", "cost dashboard", "cost monitoring",
              "cost anomaly", "cost allocation", "cost attribution",
              "tag compliance", "resource tagging", "cost reporting",
              "who is spending", "cost breakdown", "cost explorer"] },
  { name: "RI/Spot/Savings", weight: 6,
    phrases: ["reserved instance", "savings plan", "spot instance",
              "on-demand cost", "ri coverage", "commitment discount"] },
  { name: "Cloud cost tools", weight: 8,
    phrases: ["cost tool", "cost optimization tool", "cost management tool",
              "recommend tool", "best tool", "which tool",
              "infracost", "kubecost", "cloudability", "cloudhealth",
              "spot.io", "cast.ai", "vantage", "cloudkeeper", "komiser"] },
  { name: "Multi-cloud", weight: 7,
    phrases: ["multi-cloud", "multi cloud", "hybrid cloud",
              "aws and azure", "aws and gcp", "across clouds"] },
  { name: "Infra automation ROI", weight: 7,
    phrases: ["automation saved", "automation paid off", "automation roi",
              "what automation", "best automation", "devops automation",
              "terraform saving", "iac cost", "automation worth it"] }
];

var ZOPDAY_CONTEXTS = [
  { name: "Cost visibility", weight: 9,
    phrases: ["cost visibility", "cost allocation", "cost attribution",
              "which team spending", "cost per team", "cost per project",
              "chargeback", "showback", "cost breakdown"] },
  { name: "Cost dashboards", weight: 8,
    phrases: ["cost dashboard", "cost report", "cost monitoring",
              "spend report", "monthly report", "cost trend",
              "anomaly detection", "cost alert"] },
  { name: "Cost guardrails", weight: 9,
    phrases: ["cost guardrail", "cost policy", "budget enforcement",
              "spending limit", "cost governance", "prevent overspend",
              "budget alert"] },
  { name: "Tagging compliance", weight: 8,
    phrases: ["resource tagging", "tag compliance", "tag policy",
              "untagged resources", "tagging strategy", "tag enforcement"] },
  { name: "Cost recommendations", weight: 8,
    phrases: ["cost recommendation", "optimization recommendation",
              "trusted advisor", "aws advisor", "cost explorer"] }
];

var BROAD_CLOUD_SIGNALS = [
  {phrases: ["aws", "amazon web services"], weight: 4},
  {phrases: ["azure", "microsoft azure"], weight: 4},
  {phrases: ["gcp", "google cloud"], weight: 4},
  {phrases: ["ec2", "rds", "lambda", "s3", "ebs", "ecs", "fargate"], weight: 4},
  {phrases: ["kubernetes", "k8s", "eks", "gke", "aks"], weight: 4},
  {phrases: ["terraform", "pulumi", "cloudformation", "cdk"], weight: 3},
  {phrases: ["docker", "container", "pod", "helm"], weight: 3},
  {phrases: ["cloud infrastructure", "cloud architecture", "cloud migration", "cloud native"], weight: 4},
  {phrases: ["cloud service", "cloud provider", "cloud platform"], weight: 3},
  {phrases: ["serverless", "microservice"], weight: 3},
  {phrases: ["devops", "sre", "platform engineering"], weight: 3},
  {phrases: ["cost", "expensive", "pricing", "bill", "budget", "spend"], weight: 5},
  {phrases: ["save money", "reduce cost", "cut cost", "optimize"], weight: 5},
  {phrases: ["waste", "wasted", "unused", "idle", "orphan", "zombie"], weight: 5},
  {phrases: ["automation", "automate", "automated"], weight: 3},
  {phrases: ["infrastructure as code", "iac", "ci/cd", "pipeline"], weight: 3},
  {phrases: ["monitoring", "observability", "alerting"], weight: 2},
  {phrases: ["best practice", "lesson learned", "tip", "advice", "recommend"], weight: 3},
  {phrases: ["production", "staging", "development", "environment"], weight: 3},
  {phrases: ["scale", "scaling", "autoscaling"], weight: 2},
  {phrases: ["database", "storage", "compute", "networking"], weight: 2},
  {phrases: ["startup", "saas", "bootstrapped", "side project"], weight: 2}
];


// ===========================================================
// REDDIT OAUTH - Gets access token (server-to-server)
// ===========================================================
function getRedditToken() {
  var tokenUrl = "https://www.reddit.com/api/v1/access_token";
  var creds = Utilities.base64Encode(REDDIT_CLIENT_ID + ":" + REDDIT_CLIENT_SECRET);

  var response = UrlFetchApp.fetch(tokenUrl, {
    method: "post",
    headers: {
      "Authorization": "Basic " + creds,
      "User-Agent": "RedditScoutBot/10.0 by " + REDDIT_USERNAME
    },
    payload: {
      "grant_type": "password",
      "username": REDDIT_USERNAME,
      "password": REDDIT_PASSWORD
    },
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code != 200) {
    Logger.log("OAuth FAILED: HTTP " + code + " - " + response.getContentText());
    return null;
  }

  var data = JSON.parse(response.getContentText());
  if (!data.access_token) {
    Logger.log("OAuth FAILED: No token in response - " + response.getContentText());
    return null;
  }

  Logger.log("OAuth OK - got access token");
  return data.access_token;
}


// ===========================================================
// MAIN
// ===========================================================
function dailyScan() {
  Logger.log("Reddit Scout v10 - Starting scan...");
  var startTime = new Date().getTime();

  // Step 1: Get OAuth token
  var token = getRedditToken();
  if (!token) {
    GmailApp.sendEmail(YOUR_EMAIL, "Reddit Scout - OAuth Error",
      "Could not get Reddit API token. Please check your Client ID, Secret, Username and Password in the script settings.\n\nGo to https://www.reddit.com/prefs/apps to get your credentials.");
    return;
  }

  // Step 2: Fetch posts using OAuth
  var allPosts = fetchPosts(startTime, token);
  Logger.log("Collected " + allPosts.length + " posts in " + Math.round((new Date().getTime() - startTime)/1000) + "s");

  // Step 3: Score and filter
  var scored = scoreAllPosts(allPosts);
  Logger.log("Qualifying: " + scored.length);

  var top = scored.slice(0, TARGET_POST_COUNT);

  if (top.length > 0) {
    sendEmail(top, allPosts.length, scored.length);
    Logger.log("Done! Sent " + top.length + " posts in " + Math.round((new Date().getTime() - startTime)/1000) + "s total");
  } else {
    sendEmptyEmail(allPosts.length);
  }
}


// ===========================================================
// FETCH - Uses OAuth API (oauth.reddit.com) - NEVER blocked
// ===========================================================
function fetchPosts(startTime, token) {
  var seen = {};
  var results = [];
  var now = Math.floor(Date.now() / 1000);
  var maxAge = MAX_AGE_DAYS * 86400;
  var fetchOK = 0;
  var fetchFail = 0;

  for (var s = 0; s < TARGET_SUBREDDITS.length; s++) {
    if (new Date().getTime() - startTime > 300000) {
      Logger.log("  TIME LIMIT - stopping at r/" + TARGET_SUBREDDITS[s]);
      break;
    }

    var sub = TARGET_SUBREDDITS[s];
    var count = 0;

    // Search queries
    for (var q = 0; q < SEARCH_QUERIES.length; q++) {
      if (new Date().getTime() - startTime > 300000) break;

      var searchUrl = "https://oauth.reddit.com/r/" + sub + "/search"
        + "?q=" + encodeURIComponent(SEARCH_QUERIES[q])
        + "&restrict_sr=1&sort=new&t=week&limit=25&raw_json=1";

      var posts = doFetch(searchUrl, token);
      if (posts === null) {
        fetchFail++;
      } else {
        fetchOK++;
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
      }
      Utilities.sleep(1100);
    }

    // Hot + New + Top feeds
    var feeds = ["hot", "new", "top"];
    for (var f = 0; f < feeds.length; f++) {
      if (new Date().getTime() - startTime > 300000) break;

      var feedUrl = "https://oauth.reddit.com/r/" + sub + "/" + feeds[f] + "?limit=50&raw_json=1";
      if (feeds[f] === "top") feedUrl += "&t=week";

      var feedPosts = doFetch(feedUrl, token);
      if (feedPosts === null) {
        fetchFail++;
      } else {
        fetchOK++;
        for (var fp = 0; fp < feedPosts.length; fp++) {
          var p2 = feedPosts[fp];
          if (seen[p2.id]) continue;
          var age2 = now - p2.created_utc;
          if (age2 > maxAge) continue;
          seen[p2.id] = true;
          p2.ageHours = Math.round(age2 / 3600);
          results.push(p2);
          count++;
        }
      }
      Utilities.sleep(1100);
    }

    Logger.log("  r/" + sub + ": " + count + " posts");
  }

  Logger.log("Fetch stats: " + fetchOK + " OK, " + fetchFail + " failed");
  return results;
}


// Fetch using OAuth token - uses oauth.reddit.com
function doFetch(url, token) {
  try {
    var options = {
      muteHttpExceptions: true,
      headers: {
        "Authorization": "Bearer " + token,
        "User-Agent": "RedditScoutBot/10.0 by " + REDDIT_USERNAME
      }
    };

    var r = UrlFetchApp.fetch(url, options);
    var code = r.getResponseCode();

    if (code == 429) {
      Logger.log("  429 rate limit - waiting 10s...");
      Utilities.sleep(10000);
      r = UrlFetchApp.fetch(url, options);
      code = r.getResponseCode();
    }

    if (code != 200) {
      Logger.log("  HTTP " + code + " for: " + url.substring(0, 80));
      return null;
    }

    var data = JSON.parse(r.getContentText());
    if (!data || !data.data || !data.data.children) return [];

    var children = data.data.children;
    var result = [];
    for (var i = 0; i < children.length; i++) {
      if (!children[i] || !children[i].data) continue;
      var d = children[i].data;
      if (!d.title) continue;
      result.push({
        id: d.id,
        title: d.title || "",
        selftext: d.selftext || "",
        subreddit: d.subreddit || "",
        author: d.author || "unknown",
        score: d.score || 0,
        num_comments: d.num_comments || 0,
        created_utc: d.created_utc || 0,
        permalink: "https://www.reddit.com" + (d.permalink || "")
      });
    }
    return result;
  } catch(e) {
    Logger.log("  Fetch error: " + e.message);
    return null;
  }
}


// ===========================================================
// SCORING
// ===========================================================
function scoreAllPosts(posts) {
  var scored = [];
  for (var idx = 0; idx < posts.length; idx++) {
    var post = posts[idx];
    var text = (post.title + " " + post.selftext).toLowerCase();

    var nightScore = 0, nightMatches = [];
    for (var i = 0; i < ZOPNIGHT_CONTEXTS.length; i++) {
      var ctx = ZOPNIGHT_CONTEXTS[i];
      for (var j = 0; j < ctx.phrases.length; j++) {
        if (text.indexOf(ctx.phrases[j]) !== -1) {
          nightScore += ctx.weight;
          nightMatches.push(ctx.name);
          break;
        }
      }
    }
    var dayScore = 0, dayMatches = [];
    for (var i2 = 0; i2 < ZOPDAY_CONTEXTS.length; i2++) {
      var ctx2 = ZOPDAY_CONTEXTS[i2];
      for (var j2 = 0; j2 < ctx2.phrases.length; j2++) {
        if (text.indexOf(ctx2.phrases[j2]) !== -1) {
          dayScore += ctx2.weight;
          dayMatches.push(ctx2.name);
          break;
        }
      }
    }
    var productContextScore = Math.min((nightScore + dayScore) / 3, 10);

    var cloudScore = 0;
    for (var c = 0; c < BROAD_CLOUD_SIGNALS.length; c++) {
      var sig = BROAD_CLOUD_SIGNALS[c];
      for (var p = 0; p < sig.phrases.length; p++) {
        if (text.indexOf(sig.phrases[p]) !== -1) {
          cloudScore += sig.weight;
          break;
        }
      }
    }
    cloudScore = Math.min(cloudScore / 3, 10);

    if (cloudScore < 0.5 && productContextScore < 0.5) continue;

    var engagement = 1;
    if (post.num_comments >= 2) engagement += 1;
    if (post.num_comments >= 5) engagement += 1;
    if (post.num_comments >= 10) engagement += 1;
    if (post.num_comments >= 20) engagement += 1;
    if (post.num_comments >= 50) engagement += 2;
    if (post.score >= 3) engagement += 1;
    if (post.score >= 10) engagement += 1;
    if (post.score >= 30) engagement += 1;
    if (post.score >= 100) engagement += 1;
    if (engagement > 10) engagement = 10;

    var opp = 3;
    if (text.indexOf("?") !== -1) opp += 1;
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("which") !== -1) opp += 1;
    if (text.indexOf("recommend") !== -1 || text.indexOf("advice") !== -1 || text.indexOf("suggest") !== -1 || text.indexOf("opinion") !== -1) opp += 2;
    if (text.indexOf("help") !== -1 || text.indexOf("looking for") !== -1 || text.indexOf("anyone") !== -1) opp += 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("platform") !== -1 || text.indexOf("solution") !== -1) opp += 1;
    if (opp > 10) opp = 10;

    var hasProductMatch = (nightMatches.length > 0 || dayMatches.length > 0);
    var overall;
    if (hasProductMatch) {
      overall = Math.round((productContextScore * 0.40 + cloudScore * 0.15 + engagement * 0.25 + opp * 0.20) * 10) / 10;
    } else {
      overall = Math.round((cloudScore * 0.35 + engagement * 0.30 + opp * 0.25 + 1.0 * 0.10) * 10) / 10;
    }

    if (overall < 3.0) continue;

    var product = "Both";
    if (nightScore > dayScore * 1.5) product = "ZopNight";
    else if (dayScore > nightScore * 1.5) product = "ZopDay";
    if (!hasProductMatch) {
      if (text.indexOf("cost") !== -1 || text.indexOf("bill") !== -1 || text.indexOf("spend") !== -1 || text.indexOf("expensive") !== -1 || text.indexOf("waste") !== -1 || text.indexOf("budget") !== -1) {
        product = "ZopNight";
      } else if (text.indexOf("monitor") !== -1 || text.indexOf("dashboard") !== -1 || text.indexOf("visibility") !== -1) {
        product = "ZopDay";
      }
    }

    post.overall = overall;
    post.product = product;
    post.nightMatches = nightMatches;
    post.dayMatches = dayMatches;
    post.hasProductMatch = hasProductMatch;
    post.angle = generateAngle(nightMatches, dayMatches, product, text, hasProductMatch);
    post.why = generateWhy(post, nightMatches.concat(dayMatches), hasProductMatch);

    scored.push(post);
  }

  scored.sort(function(a, b) {
    if (a.hasProductMatch && !b.hasProductMatch) return -1;
    if (!a.hasProductMatch && b.hasProductMatch) return 1;
    if (b.overall !== a.overall) return b.overall - a.overall;
    return b.num_comments - a.num_comments;
  });

  return scored;
}


// ===========================================================
// ANGLE
// ===========================================================
function generateAngle(nightMatches, dayMatches, product, text, hasProductMatch) {
  if (nightMatches.indexOf("Non-prod running 24/7") !== -1)
    return "PERFECT FIT: 'We had same problem -- dev/staging running 24/7 burning cash. Auto-shutdown for nights/weekends = 50% saved. Dependency-aware, shuts down in right order.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Scheduling shutdown") !== -1)
    return "PERFECT FIT: 'We use scheduled shutdown for all non-prod. Dependency-aware, DBs shutdown after apps. Agentless, multi-cloud, 2-min setup.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Idle/unused resources") !== -1)
    return "'Biggest idle resource source = dev/staging running nights/weekends. Auto-shutdown for off-hours = single biggest cost win (40-60%).' -> zop.dev/zopnight";
  if (nightMatches.indexOf("High cloud bill") !== -1)
    return "'Quick win: schedule non-prod auto-shutdown at night/weekends. Paying 24/7 for 8hrs/day usage = 76% waste. Auto-shutdown = 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Environment cost") !== -1)
    return "'Dev/test envs = #1 cloud waste. Fix: auto-shutdown schedules. Env starts 9am, stops 7pm, weekends off. 50%+ savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("K8s cost") !== -1)
    return "'For non-prod K8s, shut down dev/staging clusters during off-hours. Scale to 0 at night/weekends = 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Startup burn rate") !== -1)
    return "'2-min quick win: auto-shutdown non-prod at night/weekends. 24/7 for 40hrs/week = 76% waste. Agentless, 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("FinOps") !== -1)
    return "'Overlooked FinOps quick win: non-prod scheduling. Dev/staging running 24/7 but used 40hrs/week. Auto-shutdown = highest-ROI win.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Cost automation") !== -1)
    return "'Best cost automation: auto-shutdown non-prod during off-hours. Dashboards show waste, automation fixes it.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Cloud cost tools") !== -1)
    return "'Most tools show dashboards but dont act. Gap = automation. Auto-shutdown non-prod off-hours = 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Cost visibility") !== -1 || dayMatches.indexOf("Cost visibility") !== -1)
    return "ZopDay: 'Visibility is step 1, but most stop there. Need guardrails that auto-enforce policies, not dashboards you check monthly.' -> zop.dev/zopday";
  if (dayMatches.indexOf("Cost guardrails") !== -1)
    return "ZopDay: 'Budget alerts notify but dont prevent. Need guardrails that enforce policy automatically.' -> zop.dev/zopday";

  if (!hasProductMatch) {
    if (text.indexOf("cost") !== -1 || text.indexOf("bill") !== -1 || text.indexOf("expensive") !== -1)
      return "Cloud cost talk -> 'Quick win many miss: non-prod auto-shutdown nights/weekends. Dev/staging runs 24/7 but used 40hrs/week. 40-60% savings.' -> zop.dev/zopnight";
    if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1)
      return "K8s talk -> 'Non-prod K8s clusters = massive cost drain. Auto-shutdown during off-hours saved us 40-60%.' -> zop.dev/zopnight";
    if (text.indexOf("terraform") !== -1 || text.indexOf("iac") !== -1)
      return "IaC talk -> 'Beyond IaC: auto-shutdown non-prod. Terraform provisions, auto-shutdown ensures it doesnt run idle.' -> zop.dev/zopnight";
    if (text.indexOf("aws") !== -1 || text.indexOf("azure") !== -1 || text.indexOf("gcp") !== -1)
      return "Cloud talk -> 'Pro tip: auto-shutdown non-prod off-hours = 40-60% savings. Most teams dont realize non-prod runs 76% idle.' -> zop.dev/zopnight";
    if (text.indexOf("devops") !== -1 || text.indexOf("sre") !== -1 || text.indexOf("automation") !== -1)
      return "DevOps talk -> 'One automation that paid for itself: auto-shutdown non-prod at night/weekends. Zero code changes, 40-60% savings.' -> zop.dev/zopnight";
    return "Join with cloud cost tip: non-prod auto-shutdown saves 40-60%. -> zop.dev/zopnight";
  }

  return "Share cloud cost experience -- automation over dashboards, non-prod scheduling. -> zop.dev";
}


// ===========================================================
// WHY
// ===========================================================
function generateWhy(post, allMatches, hasProductMatch) {
  var reasons = [];
  if (post.num_comments >= 50) reasons.push("Hot (" + post.num_comments + " comments)");
  else if (post.num_comments >= 20) reasons.push("Active (" + post.num_comments + " comments)");
  else if (post.num_comments >= 5) reasons.push(post.num_comments + " comments");
  else if (post.num_comments >= 1) reasons.push(post.num_comments + " comments");

  if (post.score >= 10) reasons.push(post.score + " upvotes");

  if (hasProductMatch && allMatches.length >= 1) reasons.push("Context: " + allMatches[0]);
  if (!hasProductMatch) reasons.push("Cloud discussion");

  var t = post.title.toLowerCase();
  if (t.indexOf("?") !== -1) reasons.push("Question");
  if (t.indexOf("tool") !== -1 || t.indexOf("recommend") !== -1) reasons.push("Tool recs");

  reasons.push("r/" + post.subreddit);
  return reasons.join(" | ");
}


// ===========================================================
// EMAIL - No emojis
// ===========================================================
function sendEmail(posts, totalScanned, totalFiltered) {
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "EEEE, MMMM d, yyyy");

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">';

  html += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:12px;margin-bottom:20px;">';
  html += '<h1 style="color:#f97316;margin:0;font-size:22px;">ZopNight and ZopDay - Reddit Opportunities</h1>';
  html += '<p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;">' + today + ' | Last ' + MAX_AGE_DAYS + ' days</p>';
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:13px;">' + totalScanned + ' posts scanned | ' + totalFiltered + ' cloud matches | Top ' + posts.length + '</p>';
  html += '</div>';

  html += '<div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:12px 16px;margin-bottom:12px;">';
  html += '<p style="margin:0;font-size:12px;color:#6b21a8;line-height:1.6;">';
  html += '<strong>ZopNight:</strong> Auto-shutdown idle non-prod (nights/weekends) | 40-60% savings | <a href="https://zop.dev/zopnight" style="color:#7c3aed;">zop.dev/zopnight</a><br>';
  html += '<strong>ZopDay:</strong> Cost visibility + guardrails + auto-enforce | <a href="https://zop.dev/zopday" style="color:#7c3aed;">zop.dev/zopday</a>';
  html += '</p></div>';

  html += '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<p style="margin:0;font-size:13px;color:#065f46;">Pick 3-4 posts | Open on Reddit | Write helpful comment | Mention ZopNight/ZopDay naturally</p>';
  html += '</div>';

  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";
    var scoreColor = post.overall >= 7 ? "#10b981" : post.overall >= 5 ? "#22c55e" : "#eab308";
    var productColor = post.product === "ZopNight" ? "#7c3aed" : post.product === "ZopDay" ? "#2563eb" : "#6b21a8";
    var matchType = post.hasProductMatch ? "[Direct match]" : "[Cloud discussion]";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';
    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' | r/' + esc(post.subreddit) + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall.toFixed(1) + '/10</span> ';
    html += '<span style="background:' + productColor + ';color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:700;">' + post.product + '</span> ';
    html += '<span style="font-size:11px;color:#64748b;">' + matchType + '</span>';
    html += '</div>';

    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + esc(post.title) + '</a>';
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">Up: ' + post.score + ' | Comments: ' + post.num_comments + ' | ' + ageStr + ' | u/' + esc(post.author) + '</p>';

    if (post.why) html += '<p style="color:#334155;font-size:13px;margin:8px 0;"><strong>Why:</strong> ' + esc(post.why) + '</p>';

    var allM = (post.nightMatches || []).concat(post.dayMatches || []);
    if (allM.length > 0) {
      html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin:10px 0;">';
      html += '<p style="margin:0;font-size:12px;color:#166534;"><strong>[v] Context:</strong> ' + esc(allM.join(" | ")) + '</p>';
      html += '</div>';
    }

    if (post.selftext && post.selftext.length > 0) {
      var preview = post.selftext.substring(0, 200).replace(/\n/g, " ");
      if (post.selftext.length > 200) preview += "...";
      html += '<p style="color:#475569;font-size:13px;margin:8px 0;background:#f8fafc;padding:10px;border-radius:6px;border-left:3px solid #e2e8f0;">' + esc(preview) + '</p>';
    }

    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin:12px 0;">';
    html += '<p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;"><strong>How to comment:</strong><br>' + esc(post.angle) + '</p>';
    html += '</div>';

    html += '<a href="' + post.permalink + '" style="display:inline-block;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;">Open on Reddit</a>';
    html += '</div>';
  }

  html += '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">';
  html += 'Reddit Scout v10 | <a href="https://zop.dev/zopnight" style="color:#f97316;">ZopNight</a> | <a href="https://zop.dev/zopday" style="color:#f97316;">ZopDay</a>';
  html += '</div></div>';

  GmailApp.sendEmail(YOUR_EMAIL,
    posts.length + " Reddit posts for ZopNight-ZopDay (" + Utilities.formatDate(new Date(), "Asia/Kolkata", "MMM d") + ")",
    "View in HTML.", { htmlBody: html }
  );
}

function sendEmptyEmail(total) {
  GmailApp.sendEmail(YOUR_EMAIL, "Reddit Scout - No matching posts today",
    "Scanned " + total + " posts (last " + MAX_AGE_DAYS + " days). No qualifying cloud posts found. Trying again tomorrow.");
}

function esc(t) {
  if (!t) return "";
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}


// ===========================================================
// SETUP: Run ONCE to create daily trigger (9 AM IST)
// ===========================================================
function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("dailyScan")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .inTimezone("Asia/Kolkata")
    .create();
  Logger.log("Daily trigger created! Bot runs every day at 9 AM IST.");
}
