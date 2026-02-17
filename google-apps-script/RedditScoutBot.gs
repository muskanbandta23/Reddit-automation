/**
 * ============================================================
 * REDDIT SCOUT BOT v7 - Cloud Context Matching (No Emojis)
 * ============================================================
 *
 * Finds 7-8 cloud-related Reddit posts from the last 4 days
 * where you can naturally talk about ZopNight or ZopDay.
 *
 * ZopNight: Auto-shutdown idle non-prod cloud resources
 * ZopDay: Cloud cost visibility + guardrails + auto-enforce
 *
 * COST: $0 (completely free)
 * ============================================================
 */

var YOUR_EMAIL = "muskan.bandta@zop.dev";
var MAX_AGE_DAYS = 4;
var TARGET_POST_COUNT = 8;

var TARGET_SUBREDDITS = [
  "aws", "devops", "cloudcomputing", "sysadmin", "kubernetes",
  "FinOps", "googlecloud", "azure", "terraform", "docker",
  "sre", "platform_engineering", "startups", "SaaS",
  "ITManagers", "Entrepreneur", "selfhosted", "developersIndia",
  "cscareerquestions", "AZURE", "netsec", "homelab",
  "ExperiencedDevs", "programming", "webdev"
];

// Broad search queries to catch maximum cloud posts
var SEARCH_QUERIES = [
  "cloud cost", "AWS bill", "reduce cost", "cloud waste",
  "cost optimization", "cloud spend", "cloud budget",
  "idle resources", "shutdown", "dev environment",
  "staging", "kubernetes cost", "finops",
  "cost management", "cost tool", "automation",
  "infrastructure", "devops tool", "cloud tool",
  "aws", "azure", "gcp", "cloud infrastructure",
  "cloud migration", "cloud architecture",
  "serverless", "lambda", "docker", "container",
  "best practices", "lessons learned",
  "mistake cloud", "tips cloud", "cloud project",
  "ec2", "rds", "s3", "eks", "terraform",
  "monitoring", "observability", "infrastructure as code",
  "CI CD", "deployment", "scaling"
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

// Broad cloud signals - ANY cloud post where you can steer to cost
var BROAD_CLOUD_SIGNALS = [
  {phrases: ["aws", "amazon web services"], weight: 4},
  {phrases: ["azure", "microsoft azure"], weight: 4},
  {phrases: ["gcp", "google cloud"], weight: 4},
  {phrases: ["ec2", "rds", "lambda", "s3", "ebs", "elb", "ecs", "fargate", "sagemaker"], weight: 4},
  {phrases: ["kubernetes", "k8s", "eks", "gke", "aks"], weight: 4},
  {phrases: ["terraform", "pulumi", "cloudformation", "cdk", "ansible"], weight: 3},
  {phrases: ["docker", "container", "pod", "helm", "compose"], weight: 3},
  {phrases: ["cloud infrastructure", "cloud architecture", "cloud migration", "cloud native"], weight: 4},
  {phrases: ["cloud service", "cloud provider", "cloud platform", "cloud hosting"], weight: 3},
  {phrases: ["serverless", "microservice", "api gateway"], weight: 3},
  {phrases: ["devops", "sre", "platform engineering", "site reliability"], weight: 3},
  {phrases: ["cost", "expensive", "pricing", "bill", "budget", "spend", "price"], weight: 5},
  {phrases: ["save money", "reduce cost", "cut cost", "optimize", "optimise", "cheaper"], weight: 5},
  {phrases: ["waste", "wasted", "unused", "idle", "orphan", "zombie"], weight: 5},
  {phrases: ["automation", "automate", "automated", "scripting", "cron"], weight: 3},
  {phrases: ["infrastructure as code", "iac", "ci/cd", "pipeline", "deployment"], weight: 3},
  {phrases: ["manage", "management", "monitoring", "observability", "alerting"], weight: 2},
  {phrases: ["best practice", "lesson learned", "tip", "advice", "recommend"], weight: 3},
  {phrases: ["production", "staging", "development", "environment"], weight: 3},
  {phrases: ["scale", "scaling", "autoscaling", "load balancer"], weight: 2},
  {phrases: ["security", "compliance", "governance", "policy"], weight: 2},
  {phrases: ["database", "storage", "compute", "networking", "vpc"], weight: 2},
  {phrases: ["startup", "saas", "bootstrapped", "indie", "side project"], weight: 2},
  {phrases: ["devops tool", "cloud tool", "infrastructure tool", "platform tool"], weight: 3}
];


// ===========================================================
// MAIN
// ===========================================================
function dailyScan() {
  Logger.log("Reddit Scout v7 - Cloud Context Matching");

  var allPosts = fetchPosts();
  Logger.log("Collected " + allPosts.length + " posts");

  var scored = scoreAllPosts(allPosts);
  Logger.log("Qualifying posts: " + scored.length);

  var top = scored.slice(0, TARGET_POST_COUNT);

  if (top.length > 0) {
    sendEmail(top, allPosts.length, scored.length);
    Logger.log("Done! Sent " + top.length + " posts");
  } else {
    sendEmptyEmail(allPosts.length);
    Logger.log("No matching posts today");
  }
}


// ===========================================================
// FETCH
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

    var browse = fetchSub(sub, "hot").concat(fetchSub(sub, "new")).concat(fetchSub(sub, "top"));
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
      headers: {"User-Agent": "RedditScoutBot/7.0"}, muteHttpExceptions: true
    });
    if (r.getResponseCode() === 429) { Utilities.sleep(15000);
      r = UrlFetchApp.fetch(url, {headers: {"User-Agent": "RedditScoutBot/7.0"}, muteHttpExceptions: true});
    }
    if (r.getResponseCode() !== 200) return [];
    return JSON.parse(r.getContentText()).data.children.map(function(c) {
      return { id: c.data.id, title: c.data.title, selftext: c.data.selftext || "",
        subreddit: c.data.subreddit, author: c.data.author,
        score: c.data.score, num_comments: c.data.num_comments,
        created_utc: c.data.created_utc,
        permalink: "https://www.reddit.com" + c.data.permalink };
    });
  } catch(e) { return []; }
}

function fetchSub(sub, sort) {
  var url = "https://www.reddit.com/r/" + sub + "/" + sort + ".json?limit=50&raw_json=1";
  if (sort === "top") url += "&t=week";
  try {
    var r = UrlFetchApp.fetch(url, {
      headers: {"User-Agent": "RedditScoutBot/7.0"}, muteHttpExceptions: true
    });
    if (r.getResponseCode() !== 200) return [];
    return JSON.parse(r.getContentText()).data.children.map(function(c) {
      return { id: c.data.id, title: c.data.title, selftext: c.data.selftext || "",
        subreddit: c.data.subreddit, author: c.data.author,
        score: c.data.score, num_comments: c.data.num_comments,
        created_utc: c.data.created_utc,
        permalink: "https://www.reddit.com" + c.data.permalink };
    });
  } catch(e) { return []; }
}


// ===========================================================
// SCORING
// ===========================================================
function scoreAllPosts(posts) {
  return posts.map(function(post) {
    var text = (post.title + " " + post.selftext).toLowerCase();

    // Layer 1: Product context
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

    // Layer 2: Broad cloud
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

    // Must be cloud-related
    if (cloudScore < 0.5 && productContextScore < 0.5) {
      post.overall = 0;
      return post;
    }

    // Layer 3: Engagement
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
    engagement = Math.min(engagement, 10);

    var opp = 3;
    if (text.indexOf("?") !== -1) opp += 1;
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("which") !== -1) opp += 1;
    if (text.indexOf("recommend") !== -1 || text.indexOf("advice") !== -1 || text.indexOf("suggest") !== -1 || text.indexOf("opinion") !== -1) opp += 2;
    if (text.indexOf("help") !== -1 || text.indexOf("looking for") !== -1 || text.indexOf("anyone") !== -1) opp += 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("platform") !== -1 || text.indexOf("solution") !== -1) opp += 1;
    opp = Math.min(opp, 10);

    // Combined
    var hasProductMatch = (nightMatches.length > 0 || dayMatches.length > 0);
    var overall;
    if (hasProductMatch) {
      overall = Math.round(
        (productContextScore * 0.40 + cloudScore * 0.15 + engagement * 0.25 + opp * 0.20) * 10
      ) / 10;
    } else {
      overall = Math.round(
        (cloudScore * 0.35 + engagement * 0.30 + opp * 0.25 + 1.0 * 0.10) * 10
      ) / 10;
    }

    // Product label
    var product = "Both";
    if (nightScore > dayScore * 1.5) product = "ZopNight";
    else if (dayScore > nightScore * 1.5) product = "ZopDay";
    if (!hasProductMatch) {
      if (text.indexOf("cost") !== -1 || text.indexOf("bill") !== -1 || text.indexOf("spend") !== -1 || text.indexOf("expensive") !== -1 || text.indexOf("waste") !== -1 || text.indexOf("save") !== -1 || text.indexOf("budget") !== -1) {
        product = "ZopNight";
      } else if (text.indexOf("monitor") !== -1 || text.indexOf("dashboard") !== -1 || text.indexOf("visibility") !== -1 || text.indexOf("tag") !== -1) {
        product = "ZopDay";
      }
    }

    var angle = generateAngle(nightMatches, dayMatches, product, text, hasProductMatch);
    var allMatches = nightMatches.concat(dayMatches);
    var why = generateWhy(post, allMatches, cloudScore, hasProductMatch);

    post.productContextScore = productContextScore;
    post.cloudScore = cloudScore;
    post.engagement = engagement;
    post.opportunity = opp;
    post.overall = overall;
    post.product = product;
    post.nightMatches = nightMatches;
    post.dayMatches = dayMatches;
    post.angle = angle;
    post.why = why;
    post.matchCount = allMatches.length;
    post.hasProductMatch = hasProductMatch;

    return post;

  }).filter(function(post) {
    return post.overall >= 3.0;
  }).sort(function(a, b) {
    if (a.hasProductMatch && !b.hasProductMatch) return -1;
    if (!a.hasProductMatch && b.hasProductMatch) return 1;
    if (b.overall !== a.overall) return b.overall - a.overall;
    return b.num_comments - a.num_comments;
  });
}


// ===========================================================
// ANGLE
// ===========================================================
function generateAngle(nightMatches, dayMatches, product, text, hasProductMatch) {
  if (nightMatches.indexOf("Non-prod running 24/7") !== -1)
    return "PERFECT FIT: 'We had the same problem -- dev/staging running 24/7 burning cash. Set up auto-shutdown for nights/weekends = 50% saved. Dependency-aware so things shut down in the right order.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Scheduling shutdown") !== -1)
    return "PERFECT FIT: 'We use scheduled shutdown for all non-prod. Dependency-aware so DBs shutdown after apps, start in reverse. Agentless, multi-cloud, 2-min setup.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Idle/unused resources") !== -1)
    return "Share: 'Biggest source of idle resources = dev/staging running nights/weekends when nobody uses them. Auto-shutdown for off-hours = single biggest cost win (40-60%).' -> zop.dev/zopnight";
  if (nightMatches.indexOf("High cloud bill") !== -1)
    return "Empathize then share: 'Quick win: schedule non-prod to auto-shutdown at night/weekends. Paying 24/7 for envs used 8hrs/day = 76% waste. Auto-shutdown = instant 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Environment cost") !== -1)
    return "Share: 'Dev/test envs are #1 cloud waste source. Fix: auto-shutdown schedules. Each dev gets env auto-started 9am, shutdown 7pm. Weekends off. 50%+ savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("K8s cost") !== -1)
    return "K8s angle: 'For non-prod K8s, biggest win is shutting down dev/staging clusters during off-hours. Scale to 0 at night/weekends = 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Startup burn rate") !== -1)
    return "Startup angle: '2-min quick win: auto-shutdown non-prod at night/weekends. Paying 24/7 for 40hrs/week usage = 76% waste. Agentless, 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("FinOps") !== -1)
    return "FinOps angle: 'Overlooked FinOps quick win: non-prod scheduling. Dev/staging running 24/7 but used 40hrs/week. Auto-shutdown = lowest-effort, highest-ROI win.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Cost automation") !== -1)
    return "Automation angle: 'Best cost automation: auto-shutdown of non-prod during off-hours. Dashboards show waste, automation fixes it.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Cloud cost tools") !== -1)
    return "Tool rec: 'Most tools show dashboards but dont act. The gap is automation -- auto-shutdown of non-prod during off-hours = 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Right-sizing") !== -1)
    return "Share: 'Right-sizing is great for prod. For non-prod, bigger win = shut them down when nobody uses them (nights/weekends). 40-60% savings.' -> zop.dev/zopnight";
  if (nightMatches.indexOf("Cost visibility") !== -1 || dayMatches.indexOf("Cost visibility") !== -1)
    return "ZopDay: 'Visibility is step 1, but most stop there. Need visibility + guardrails that auto-enforce policies. Not dashboards you check monthly.' -> zop.dev/zopday";
  if (dayMatches.indexOf("Cost guardrails") !== -1)
    return "ZopDay: 'Budget alerts notify but dont prevent. Guardrails that enforce policy automatically -- if team exceeds budget, automation kicks in.' -> zop.dev/zopday";
  if (dayMatches.indexOf("Tagging compliance") !== -1)
    return "ZopDay: 'Tag enforcement is key -- untagged resources = invisible cost. Auto-enforce tagging + cost allocation = real visibility.' -> zop.dev/zopday";

  if (!hasProductMatch) {
    if (text.indexOf("cost") !== -1 || text.indexOf("bill") !== -1 || text.indexOf("expensive") !== -1 || text.indexOf("spend") !== -1)
      return "Cloud cost discussion -> share: 'One quick win many miss: scheduling non-prod auto-shutdown for nights/weekends. Dev/staging runs 24/7 but used 40hrs/week. 40-60% savings.' -> zop.dev/zopnight";
    if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1 || text.indexOf("eks") !== -1)
      return "K8s discussion -> steer to cost: 'Non-prod K8s clusters are massive cost drain. Auto-scheduling shutdown during off-hours saved us 40-60%.' -> zop.dev/zopnight";
    if (text.indexOf("terraform") !== -1 || text.indexOf("infrastructure as code") !== -1)
      return "IaC discussion -> share: 'Beyond IaC, one win we added: auto-shutdown schedules for non-prod. Terraform provisions it, auto-shutdown ensures it doesnt run when nobody needs it.' -> zop.dev/zopnight";
    if (text.indexOf("aws") !== -1 || text.indexOf("azure") !== -1 || text.indexOf("gcp") !== -1)
      return "Cloud discussion -> add value: 'Pro tip for non-prod: auto-shutdown during off-hours = instant 40-60% savings. Most teams dont realize non-prod runs 76% idle.' -> zop.dev/zopnight";
    if (text.indexOf("devops") !== -1 || text.indexOf("sre") !== -1 || text.indexOf("automation") !== -1)
      return "DevOps discussion -> share: 'One automation that paid for itself: auto-shutdown of non-prod at night/weekends. Zero code changes, 40-60% cost savings.' -> zop.dev/zopnight";
    if (text.indexOf("startup") !== -1 || text.indexOf("saas") !== -1 || text.indexOf("bootstrap") !== -1)
      return "Startup discussion -> share cloud tip: 'Quick win: auto-shutdown non-prod at night/weekends. Most startups pay 24/7 for dev envs used 40hrs/week.' -> zop.dev/zopnight";
    return "Join discussion with cloud cost insights. Share how non-prod auto-shutdown saves 40-60% as practical tip. -> zop.dev/zopnight";
  }

  return "Share cloud cost experience -- automation over dashboards, non-prod scheduling. -> zop.dev";
}


// ===========================================================
// WHY
// ===========================================================
function generateWhy(post, allMatches, cloudScore, hasProductMatch) {
  var reasons = [];
  if (post.num_comments >= 50) reasons.push("Hot thread (" + post.num_comments + " comments)");
  else if (post.num_comments >= 20) reasons.push("Active (" + post.num_comments + " comments)");
  else if (post.num_comments >= 5) reasons.push(post.num_comments + " comments");
  else if (post.num_comments >= 1) reasons.push(post.num_comments + " comment" + (post.num_comments > 1 ? "s" : ""));

  if (post.score >= 50) reasons.push(post.score + " upvotes");
  else if (post.score >= 10) reasons.push(post.score + " upvotes");

  if (hasProductMatch) {
    if (allMatches.length >= 2) reasons.push("Matches " + allMatches.length + " product contexts");
    else if (allMatches.length === 1) reasons.push("Context: " + allMatches[0]);
  } else {
    reasons.push("Cloud discussion (steer to cost)");
  }

  var title = post.title.toLowerCase();
  if (title.indexOf("?") !== -1) reasons.push("Asking question");
  if (title.indexOf("tool") !== -1 || title.indexOf("recommend") !== -1) reasons.push("Wants tool recs");

  reasons.push("r/" + post.subreddit);
  return reasons.join(" | ");
}


// ===========================================================
// EMAIL - No emojis anywhere
// ===========================================================
function sendEmail(posts, totalScanned, totalFiltered) {
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "EEEE, MMMM d, yyyy");

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">';

  html += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:12px;margin-bottom:20px;">';
  html += '<h1 style="color:#f97316;margin:0;font-size:22px;">ZopNight & ZopDay - Reddit Opportunities</h1>';
  html += '<p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;">' + today + ' | Last ' + MAX_AGE_DAYS + ' days</p>';
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:13px;">' + totalScanned + ' posts scanned > ' + totalFiltered + ' cloud matches > Top ' + posts.length + '</p>';
  html += '</div>';

  html += '<div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:12px 16px;margin-bottom:12px;">';
  html += '<p style="margin:0;font-size:12px;color:#6b21a8;line-height:1.6;">';
  html += '<strong>ZopNight:</strong> Auto-shutdown idle non-prod (nights/weekends) | 40-60% savings | <a href="https://zop.dev/zopnight" style="color:#7c3aed;">zop.dev/zopnight</a><br>';
  html += '<strong>ZopDay:</strong> Cost visibility + guardrails + auto-enforce | <a href="https://zop.dev/zopday" style="color:#7c3aed;">zop.dev/zopday</a>';
  html += '</p></div>';

  html += '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<p style="margin:0;font-size:13px;color:#065f46;">Pick 3-4 posts > Open on Reddit > Write helpful comment > Mention ZopNight/ZopDay naturally</p>';
  html += '</div>';

  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";
    var scoreColor = post.overall >= 7 ? "#10b981" : post.overall >= 5 ? "#22c55e" : "#eab308";
    var productColor = post.product === "ZopNight" ? "#7c3aed" : post.product === "ZopDay" ? "#2563eb" : "#6b21a8";
    var matchType = post.hasProductMatch ? "[Direct match]" : "[Cloud discussion]";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';

    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' | r/' + escapeHtml(post.subreddit) + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall.toFixed(1) + '/10</span> ';
    html += '<span style="background:' + productColor + ';color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:700;">' + post.product + '</span> ';
    html += '<span style="font-size:11px;color:#64748b;">' + matchType + '</span>';
    html += '</div>';

    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + escapeHtml(post.title) + '</a>';
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">Up: ' + post.score + ' | Comments: ' + post.num_comments + ' | ' + ageStr + ' | u/' + escapeHtml(post.author) + '</p>';

    if (post.why) {
      html += '<p style="color:#334155;font-size:13px;margin:8px 0;"><strong>Why:</strong> ' + escapeHtml(post.why) + '</p>';
    }

    var allM = (post.nightMatches || []).concat(post.dayMatches || []);
    if (allM.length > 0) {
      html += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin:10px 0;">';
      html += '<p style="margin:0;font-size:12px;color:#166534;"><strong>[v] Context:</strong> ' + escapeHtml(allM.join(" | ")) + '</p>';
      html += '</div>';
    }

    if (post.selftext && post.selftext.length > 0) {
      var preview = post.selftext.substring(0, 250).replace(/\n/g, " ");
      if (post.selftext.length > 250) preview += "...";
      html += '<p style="color:#475569;font-size:13px;margin:8px 0;line-height:1.5;background:#f8fafc;padding:10px;border-radius:6px;border-left:3px solid #e2e8f0;">' + escapeHtml(preview) + '</p>';
    }

    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 14px;margin:12px 0;">';
    html += '<p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;"><strong>How to comment:</strong><br>' + escapeHtml(post.angle) + '</p>';
    html += '</div>';

    html += '<a href="' + post.permalink + '" style="display:inline-block;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;">Open on Reddit</a>';
    html += '</div>';
  }

  html += '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">';
  html += 'Reddit Scout v7 | <a href="https://zop.dev/zopnight" style="color:#f97316;">ZopNight</a> | <a href="https://zop.dev/zopday" style="color:#f97316;">ZopDay</a>';
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

function escapeHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
