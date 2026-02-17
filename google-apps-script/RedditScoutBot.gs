/**
 * ============================================================
 * REDDIT SCOUT BOT v2 - Searches ALL of Reddit
 * ============================================================
 *
 * Scans the ENTIRE Reddit (not just 12 subreddits) using
 * Reddit Search API with cloud-cost related queries.
 * Emails you the top 7 posts daily where you can discuss ZopNight.
 *
 * SETUP: Paste into script.google.com → Run → Allow permissions → Done
 * COST: $0 (completely free)
 * ============================================================
 */

// ===== CHANGE THIS TO YOUR EMAIL =====
var YOUR_EMAIL = "muskan.bandta@zop.dev";

// ===== SEARCH QUERIES (searches ALL of Reddit) =====
var SEARCH_QUERIES = [
  "cloud cost optimization",
  "AWS bill spike",
  "cloud waste reduction",
  "dev environment cost cloud",
  "idle cloud resources",
  "kubernetes cost expensive",
  "cloud bill unexpected charges",
  "FinOps automation",
  "staging environment cost",
  "infrastructure waste cloud",
  "EC2 cost running 24/7",
  "cloud cost management tool",
  "reduce AWS bill",
  "cloud spend optimization",
  "non-production environment cost",
  "zombie resources AWS",
  "expensive DevOps mistake cloud",
  "startup cloud burn rate",
  "shutdown dev environment",
  "over-provisioned cloud",
  "cloud budget alert",
  "multi-cloud cost compare",
  "azure cost optimization",
  "GCP cost reduce",
  "reserved instance vs spot",
  "cloud cost visibility dashboard"
];

// Priority subreddits (posts from these get a score boost)
var PRIORITY_SUBREDDITS = [
  "aws", "devops", "cloudcomputing", "sysadmin", "kubernetes",
  "startups", "saas", "finops", "itmanagers", "entrepreneur",
  "selfhosted", "googlecloud", "azure", "terraform", "docker",
  "programming", "webdev", "sre", "platform_engineering"
];

// ZopNight/ZopDay high-relevance keywords (boost score)
var HIGH_RELEVANCE_KEYWORDS = [
  "idle", "non-prod", "staging", "dev environment", "test environment",
  "shutdown", "schedule", "nights", "weekends", "always running",
  "forgot", "zombie", "phantom", "waste", "unused", "24/7",
  "qa environment", "sandbox", "cost visibility", "guardrail",
  "automation", "optimize", "dashboard", "bill shock", "cost spike",
  "over-provisioned", "right-sizing", "burn rate", "budget",
  "cloud waste", "cost management", "cloud bill", "reserved instance"
];

var MIN_UPVOTES = 5;    // Lowered — search results are already relevant
var MIN_COMMENTS = 3;   // Lowered — search results are already relevant
var MAX_AGE_DAYS = 7;   // Extended to 7 days for more coverage


/**
 * MAIN FUNCTION - Run this daily
 */
function dailyScan() {
  Logger.log("📡 Reddit Scout Bot v2 Starting...");
  Logger.log("Searching ALL of Reddit with " + SEARCH_QUERIES.length + " queries...");

  // Step 1: Search all of Reddit with multiple queries
  var allPosts = searchAllReddit();
  Logger.log("Fetched " + allPosts.length + " unique posts from Reddit Search");

  // Step 2: Score and rank all posts
  var scored = scorePosts(allPosts);
  Logger.log("Scored posts (qualifying): " + scored.length);

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
 * Search ALL of Reddit using the search API
 */
function searchAllReddit() {
  var allPosts = {};
  var results = [];
  var now = Math.floor(Date.now() / 1000);
  var maxAge = MAX_AGE_DAYS * 86400;

  for (var i = 0; i < SEARCH_QUERIES.length; i++) {
    var query = SEARCH_QUERIES[i];
    Logger.log("  Searching: " + query);

    var posts = redditSearch(query);

    for (var j = 0; j < posts.length; j++) {
      var post = posts[j];

      // Skip if already seen
      if (allPosts[post.id]) continue;

      // Age check
      var age = now - post.created_utc;
      if (age > maxAge) continue;

      // Very basic engagement check
      if (post.score < MIN_UPVOTES && post.num_comments < MIN_COMMENTS) continue;

      allPosts[post.id] = true;
      post.ageHours = Math.round(age / 3600);
      results.push(post);
    }

    // Rate limit: wait between searches
    Utilities.sleep(2500);
  }

  // Also fetch from priority subreddits directly (hot + top)
  Logger.log("  Also fetching from " + PRIORITY_SUBREDDITS.length + " priority subreddits...");
  for (var s = 0; s < PRIORITY_SUBREDDITS.length; s++) {
    var sub = PRIORITY_SUBREDDITS[s];
    var subPosts = fetchSubreddit(sub, "hot");
    var topPosts = fetchSubreddit(sub, "top");
    var combined = subPosts.concat(topPosts);

    for (var p = 0; p < combined.length; p++) {
      var post2 = combined[p];
      if (allPosts[post2.id]) continue;
      var age2 = now - post2.created_utc;
      if (age2 > maxAge) continue;
      if (post2.score < MIN_UPVOTES && post2.num_comments < MIN_COMMENTS) continue;
      allPosts[post2.id] = true;
      post2.ageHours = Math.round(age2 / 3600);
      results.push(post2);
    }
    Utilities.sleep(1500);
  }

  Logger.log("  Total unique qualifying posts: " + results.length);
  return results;
}


/**
 * Reddit Search API - searches across ALL subreddits
 */
function redditSearch(query) {
  var url = "https://www.reddit.com/search.json?q=" + encodeURIComponent(query) + "&sort=relevance&t=week&limit=50&raw_json=1&type=link";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/2.0 (Google Apps Script)" },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 429) {
      Logger.log("    Rate limited, waiting 10s...");
      Utilities.sleep(10000);
      response = UrlFetchApp.fetch(url, {
        headers: { "User-Agent": "RedditScoutBot/2.0 (Google Apps Script)" },
        muteHttpExceptions: true
      });
    }

    if (response.getResponseCode() !== 200) {
      Logger.log("    Search failed: " + response.getResponseCode());
      return [];
    }

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
    Logger.log("    Search error: " + e.message);
    return [];
  }
}


/**
 * Fetch posts from a single subreddit
 */
function fetchSubreddit(subreddit, sort) {
  var url = "https://www.reddit.com/r/" + subreddit + "/" + sort + ".json?limit=50&raw_json=1";
  if (sort === "top") url += "&t=week";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/2.0 (Google Apps Script)" },
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
 * Score posts for ZopNight/ZopDay relevance
 */
function scorePosts(posts) {
  return posts.map(function(post) {
    var text = (post.title + " " + post.selftext).toLowerCase();

    // --- Cost Pain Intensity ---
    var costPain = 4;
    if (post.score > 20) costPain += 1;
    if (post.score > 50) costPain += 1;
    if (post.score > 100) costPain += 1;
    if (post.num_comments > 10) costPain += 1;
    if (post.num_comments > 30) costPain += 1;
    if (text.match(/\$[\d,]+/)) costPain += 1;
    if (text.indexOf("bill") !== -1 || text.indexOf("charge") !== -1 || text.indexOf("expensive") !== -1) costPain += 1;
    costPain = Math.min(costPain, 10);

    // --- Relevance to ZopNight/ZopDay ---
    var relevance = 2;
    var highMatches = HIGH_RELEVANCE_KEYWORDS.filter(function(kw) {
      return text.indexOf(kw) !== -1;
    });
    relevance += Math.min(highMatches.length * 1.5, 6);
    // Big boost for core ZopNight concepts
    if (text.indexOf("idle") !== -1) relevance += 1;
    if (text.indexOf("non-prod") !== -1 || text.indexOf("non prod") !== -1) relevance += 1;
    if (text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1) relevance += 1;
    if (text.indexOf("shutdown") !== -1 || text.indexOf("schedule") !== -1) relevance += 1;
    relevance = Math.min(relevance, 10);

    // --- Comment Opportunity ---
    var opportunity = 4;
    if (text.indexOf("?") !== -1) opportunity += 1;
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("recommend") !== -1 || text.indexOf("advice") !== -1) opportunity += 1;
    if (text.indexOf("help") !== -1 || text.indexOf("looking for") !== -1 || text.indexOf("suggestion") !== -1) opportunity += 1;
    if (post.num_comments >= 3 && post.num_comments <= 50) opportunity += 1;
    if (post.num_comments > 50) opportunity += 2;
    if (text.indexOf("tool") !== -1 || text.indexOf("platform") !== -1 || text.indexOf("solution") !== -1) opportunity += 1;
    opportunity = Math.min(opportunity, 10);

    // --- Spam Risk ---
    var spamRisk = 5;
    if (post.num_comments > 20) spamRisk -= 1;
    if (post.num_comments > 50) spamRisk -= 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("recommend") !== -1 || text.indexOf("which") !== -1) spamRisk -= 2;
    if (post.num_comments < 3) spamRisk += 2;
    // Priority subreddits are safer (cloud community)
    if (PRIORITY_SUBREDDITS.indexOf(post.subreddit.toLowerCase()) !== -1) spamRisk -= 1;
    spamRisk = Math.max(1, Math.min(spamRisk, 10));

    // --- Overall Score ---
    var overall = Math.round(
      (costPain * 0.25 + relevance * 0.35 + opportunity * 0.25 + (10 - spamRisk) * 0.15) * 10
    ) / 10;

    // Boost for priority subreddits
    if (PRIORITY_SUBREDDITS.indexOf(post.subreddit.toLowerCase()) !== -1) {
      overall += 0.5;
    }

    // --- Pain Type ---
    var painType = "Cloud Cost";
    if (text.indexOf("idle") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1) painType = "Idle Non-Prod Environments";
    else if (text.indexOf("bill spike") !== -1 || text.indexOf("unexpected") !== -1 || text.indexOf("bill shock") !== -1) painType = "AWS Bill Spike";
    else if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1 || text.indexOf("eks") !== -1) painType = "K8s Cost Overrun";
    else if (text.indexOf("zombie") !== -1 || text.indexOf("phantom") !== -1 || text.indexOf("unused") !== -1) painType = "Zombie Resources";
    else if (text.indexOf("startup") !== -1 || text.indexOf("burn rate") !== -1) painType = "Startup Burn Rate";
    else if (text.indexOf("finops") !== -1 || text.indexOf("visibility") !== -1) painType = "FinOps / Visibility";
    else if (text.indexOf("waste") !== -1) painType = "Cloud Waste";
    else if (text.indexOf("expensive") !== -1 || text.indexOf("mistake") !== -1) painType = "Expensive Mistakes";
    else if (text.indexOf("reserved") !== -1 || text.indexOf("spot") !== -1 || text.indexOf("savings") !== -1) painType = "Cost Optimization";
    else if (text.indexOf("budget") !== -1 || text.indexOf("alert") !== -1) painType = "Budget / Alerting";

    // --- Spam Label ---
    var spamLabel = "Medium";
    if (spamRisk <= 3) spamLabel = "Low";
    else if (spamRisk >= 7) spamLabel = "High";

    // --- Relevant Product ---
    var product = "Both";
    if (text.indexOf("idle") !== -1 || text.indexOf("shutdown") !== -1 || text.indexOf("schedule") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1 || text.indexOf("nights") !== -1 || text.indexOf("weekends") !== -1) {
      product = "ZopNight";
    } else if (text.indexOf("visibility") !== -1 || text.indexOf("dashboard") !== -1 || text.indexOf("guardrail") !== -1 || text.indexOf("monitoring") !== -1) {
      product = "ZopDay";
    }

    // --- Suggested Angle ---
    var angle = "Share your experience with cloud cost management — what worked and what didn't.";
    if (painType === "Idle Non-Prod Environments") {
      angle = "Share how scheduling auto-shutdown for dev/staging/QA (nights + weekends) saved 40-60% on non-prod. Mention dependency-aware orchestration as key.";
    } else if (painType === "AWS Bill Spike") {
      angle = "Empathize with bill shock. Share that budget alerts alone aren't enough — you need automation that actually shuts things down, not just sends alerts.";
    } else if (painType === "Zombie Resources") {
      angle = "Finding zombies is step 1 — preventing them is step 2. Scheduled shutdown of non-prod prevents zombie accumulation at source.";
    } else if (painType === "K8s Cost Overrun") {
      angle = "K8s cost is largely dev/staging clusters running 24/7. Scheduling cluster scale-down during off-hours cuts 40-60%.";
    } else if (painType === "Expensive Mistakes") {
      angle = "Reply to comments about forgotten environments. Automation prevents these stories — humans forget, schedules don't.";
    } else if (painType === "Cloud Waste") {
      angle = "The gap between visibility and action is the real problem. Dashboards show waste but don't fix it — automation + guardrails do.";
    } else if (painType === "FinOps / Visibility") {
      angle = "The challenge isn't seeing costs — it's acting on them. Guardrails that auto-enforce policies beat dashboards you check monthly.";
    } else if (painType === "Startup Burn Rate") {
      angle = "For startups, the quick win is scheduling non-prod environments (dev/staging) to auto-shutdown outside work hours. Saves 40-60% with zero code changes.";
    } else if (painType === "Cost Optimization") {
      angle = "Share that beyond reserved/spot instances, scheduling non-prod shutdowns is the easiest quick win most teams miss.";
    } else if (painType === "Budget / Alerting") {
      angle = "Budget alerts tell you there's a fire — automation puts it out. Auto-shutdown + guardrails prevent cost overruns, not just notify about them.";
    }

    post.costPain = costPain;
    post.relevance = relevance;
    post.opportunity = opportunity;
    post.spamRisk = spamRisk;
    post.overall = overall;
    post.painType = painType;
    post.spamLabel = spamLabel;
    post.product = product;
    post.angle = angle;
    post.matchedKeywords = highMatches.map(function(kw) { return kw; });

    return post;

  }).filter(function(post) {
    return post.overall >= 5.5; // Lower threshold to ensure 7+ results
  }).sort(function(a, b) {
    return b.overall - a.overall;
  });
}


/**
 * Send HTML email with the daily report
 */
function sendEmail(posts, totalScanned, totalFiltered) {
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "EEEE, MMMM d, yyyy");

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">';

  // Header
  html += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:12px;margin-bottom:20px;">';
  html += '<h1 style="color:#f97316;margin:0;font-size:24px;">📡 Reddit Scout Daily Report</h1>';
  html += '<p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;">' + today + '</p>';
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:14px;">Searched ALL of Reddit | Scanned: ' + totalScanned + ' posts | Qualified: ' + totalFiltered + ' | Top Picks: ' + posts.length + '</p>';
  html += '</div>';

  // Instruction box
  html += '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<p style="margin:0;font-size:13px;color:#065f46;">📋 <strong>Your workflow:</strong> Pick 3-4 best posts → Open on Reddit → Write a helpful comment → Mention ZopNight naturally if relevant</p>';
  html += '</div>';

  // Posts
  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";

    var scoreColor = post.overall >= 8 ? "#10b981" : post.overall >= 7 ? "#22c55e" : post.overall >= 6 ? "#eab308" : "#f97316";
    var spamColor = post.spamLabel === "Low" ? "#22c55e" : post.spamLabel === "Medium" ? "#eab308" : "#ef4444";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';

    // Top bar
    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' · r/' + post.subreddit + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall.toFixed(1) + '/10</span> ';
    html += '<span style="color:' + spamColor + ';font-size:11px;font-weight:600;">' + post.spamLabel + ' Risk</span> ';
    html += '<span style="color:#7c3aed;font-size:11px;font-weight:600;">' + post.product + '</span>';
    html += '</div>';

    // Title
    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + escapeHtml(post.title) + '</a>';

    // Metrics
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">⬆ ' + post.score + ' · 💬 ' + post.num_comments + ' · ' + ageStr + ' · by u/' + post.author + '</p>';

    // Pain type
    html += '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;margin:10px 0;">';
    html += '<span style="font-size:12px;color:#92400e;font-weight:600;">🔥 ' + post.painType + '</span>';
    html += '</div>';

    // Post preview (first 200 chars of body)
    if (post.selftext && post.selftext.length > 0) {
      var preview = post.selftext.substring(0, 200).replace(/\n/g, " ");
      if (post.selftext.length > 200) preview += "...";
      html += '<p style="color:#475569;font-size:13px;margin:8px 0;line-height:1.5;background:#f8fafc;padding:10px;border-radius:6px;border-left:3px solid #e2e8f0;">' + escapeHtml(preview) + '</p>';
    }

    // Scores
    html += '<p style="color:#64748b;font-size:12px;margin:8px 0;">Pain: ' + post.costPain + '/10 · Relevance: ' + Math.round(post.relevance) + '/10 · Opportunity: ' + post.opportunity + '/10 · Promo Risk: ' + post.spamRisk + '/10</p>';

    // Suggested angle
    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin:10px 0;">';
    html += '<p style="margin:0;font-size:13px;color:#9a3412;"><strong>💡 Suggested Angle:</strong> ' + post.angle + '</p>';
    html += '</div>';

    // CTA button
    html += '<a href="' + post.permalink + '" style="display:inline-block;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;">Open on Reddit →</a>';

    html += '</div>';
  }

  // Footer
  html += '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">';
  html += 'Reddit Scout by ZopDev<br>Searched ALL of Reddit · Runs daily at 8am';
  html += '</div>';
  html += '</div>';

  GmailApp.sendEmail(YOUR_EMAIL,
    "📡 Reddit Scout: " + posts.length + " ZopNight Opportunities Today",
    "View this email in HTML format for the full report.",
    { htmlBody: html }
  );
}


/**
 * Send email when no posts found
 */
function sendEmptyEmail(totalScanned) {
  GmailApp.sendEmail(YOUR_EMAIL,
    "📡 Reddit Scout: No opportunities found today",
    "Searched ALL of Reddit (" + totalScanned + " posts checked) but no qualifying posts found today. This is rare — the bot will try again tomorrow!"
  );
}


/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
