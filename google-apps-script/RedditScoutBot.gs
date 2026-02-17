/**
 * ============================================================
 * REDDIT SCOUT BOT - Simple Free Version
 * ============================================================
 *
 * This Google Apps Script:
 * 1. Scans 12 Reddit subreddits daily
 * 2. Finds posts about cloud cost pain
 * 3. Scores them for ZopNight/ZopDay relevance
 * 4. Emails you the top 7 posts
 *
 * SETUP (5 minutes):
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Paste this entire code
 * 4. Change YOUR_EMAIL below
 * 5. Click Run > dailyScan
 * 6. Set up daily trigger (see instructions at bottom)
 *
 * COST: $0 (completely free, runs on Google servers)
 * ============================================================
 */

// ===== CHANGE THIS TO YOUR EMAIL =====
var YOUR_EMAIL = "muskan.bandta@zop.dev";

// ===== CONFIG (don't need to change) =====
var TARGET_SUBREDDITS = [
  "aws", "devops", "cloudcomputing", "sysadmin", "kubernetes",
  "startups", "SaaS", "FinOps", "cscareerquestions", "ITManagers",
  "Entrepreneur", "selfhosted"
];

var TRIGGER_KEYWORDS = [
  "aws bill", "cloud bill", "cloud cost", "cloud waste", "cloud spend",
  "unexpected charge", "dev environment", "idle instance", "ec2 always running",
  "kubernetes cost", "k8s cost", "startup burn rate", "cost optimization",
  "finops", "infrastructure waste", "sandbox environment", "non-prod",
  "staging environment", "cost reduction", "over-provisioned", "zombie resource",
  "phantom usage", "aws cost", "gcp cost", "azure cost", "wasting money",
  "shutdown", "schedule instance", "reserved instance", "spot instance",
  "right-sizing", "expensive mistake", "cost management", "idle resource",
  "unused resource", "cloud saving", "cloud budget", "overprovisioned",
  "underutilized", "cost visibility", "cloud pricing", "multi-cloud",
  "devops cost", "kubernetes expensive", "expensive devops", "cloud horror",
  "bill spike", "cost creep", "forgotten environment", "always running"
];

var MIN_UPVOTES = 15;
var MIN_COMMENTS = 8;
var MAX_AGE_DAYS = 5;

// ZopNight/ZopDay relevance keywords (higher weight)
var HIGH_RELEVANCE_KEYWORDS = [
  "idle", "non-prod", "staging", "dev environment", "test environment",
  "shutdown", "schedule", "nights", "weekends", "always running",
  "forgot", "zombie", "phantom", "waste", "unused", "24/7",
  "qa environment", "sandbox", "cost visibility", "guardrail",
  "automation", "optimize", "dashboard"
];


/**
 * MAIN FUNCTION - Run this daily
 */
function dailyScan() {
  Logger.log("📡 Reddit Scout Bot Starting...");

  // Step 1: Fetch posts from all subreddits
  var allPosts = fetchAllPosts();
  Logger.log("Fetched " + allPosts.length + " total posts");

  // Step 2: Filter by age, engagement, keywords
  var filtered = filterPosts(allPosts);
  Logger.log("Filtered to " + filtered.length + " relevant posts");

  // Step 3: Score and rank
  var scored = scorePosts(filtered);
  Logger.log("Top posts after scoring: " + scored.length);

  // Step 4: Take top 7
  var top7 = scored.slice(0, 7);

  // Step 5: Send email
  if (top7.length > 0) {
    sendEmail(top7, allPosts.length, filtered.length);
    Logger.log("✅ Email sent with " + top7.length + " opportunities!");
  } else {
    Logger.log("⚠️ No qualifying posts found today.");
    sendEmptyEmail();
  }
}


/**
 * Fetch posts from all target subreddits
 */
function fetchAllPosts() {
  var allPosts = {};
  var results = [];

  for (var i = 0; i < TARGET_SUBREDDITS.length; i++) {
    var sub = TARGET_SUBREDDITS[i];

    // Fetch hot posts
    var hotPosts = fetchSubreddit(sub, "hot");
    for (var j = 0; j < hotPosts.length; j++) {
      if (!allPosts[hotPosts[j].id]) {
        allPosts[hotPosts[j].id] = true;
        results.push(hotPosts[j]);
      }
    }

    // Fetch top posts (this week)
    var topPosts = fetchSubreddit(sub, "top");
    for (var k = 0; k < topPosts.length; k++) {
      if (!allPosts[topPosts[k].id]) {
        allPosts[topPosts[k].id] = true;
        results.push(topPosts[k]);
      }
    }

    // Small delay to be nice to Reddit
    Utilities.sleep(2000);
  }

  return results;
}


/**
 * Fetch posts from a single subreddit
 */
function fetchSubreddit(subreddit, sort) {
  var url = "https://www.reddit.com/r/" + subreddit + "/" + sort + ".json?limit=100&raw_json=1";
  if (sort === "top") url += "&t=week";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/1.0 (Google Apps Script)" },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log("  Failed r/" + subreddit + "/" + sort + ": " + response.getResponseCode());
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
    Logger.log("  Error r/" + subreddit + ": " + e.message);
    return [];
  }
}


/**
 * Filter posts by age, engagement, and keyword relevance
 */
function filterPosts(posts) {
  var now = Math.floor(Date.now() / 1000);
  var maxAge = MAX_AGE_DAYS * 86400;

  return posts.filter(function(post) {
    // Age check
    var age = now - post.created_utc;
    if (age > maxAge) return false;

    // Engagement check (15+ upvotes OR 8+ comments)
    if (post.score < MIN_UPVOTES && post.num_comments < MIN_COMMENTS) return false;

    // Keyword check
    var text = (post.title + " " + post.selftext).toLowerCase();
    var matched = TRIGGER_KEYWORDS.filter(function(kw) {
      return text.indexOf(kw.toLowerCase()) !== -1;
    });

    if (matched.length === 0) return false;

    // Add metadata
    post.matchedKeywords = matched;
    post.ageHours = Math.round(age / 3600);

    return true;
  });
}


/**
 * Score posts for ZopNight/ZopDay relevance (no AI needed!)
 */
function scorePosts(posts) {
  return posts.map(function(post) {
    var text = (post.title + " " + post.selftext).toLowerCase();

    // Cost Pain Intensity (based on engagement + specificity)
    var costPain = 5;
    if (post.score > 50) costPain += 1;
    if (post.score > 100) costPain += 1;
    if (post.num_comments > 20) costPain += 1;
    if (text.match(/\$[\d,]+/)) costPain += 1; // mentions dollar amounts
    if (text.indexOf("bill") !== -1 || text.indexOf("charge") !== -1) costPain += 1;
    costPain = Math.min(costPain, 10);

    // Relevance to Automation (ZopNight/ZopDay fit)
    var relevance = 3;
    var highMatches = HIGH_RELEVANCE_KEYWORDS.filter(function(kw) {
      return text.indexOf(kw) !== -1;
    });
    relevance += Math.min(highMatches.length, 5);
    if (text.indexOf("idle") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1) relevance += 2;
    relevance = Math.min(relevance, 10);

    // Comment Opportunity (based on post type and engagement)
    var opportunity = 5;
    if (text.indexOf("?") !== -1) opportunity += 1; // asking a question
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("recommend") !== -1) opportunity += 1;
    if (post.num_comments >= 5 && post.num_comments <= 50) opportunity += 1; // not too small, not too big
    if (post.num_comments > 50) opportunity += 2; // very active
    opportunity = Math.min(opportunity, 10);

    // Spam Risk (inverse - lower is better for us)
    var spamRisk = 5;
    if (post.num_comments > 30) spamRisk -= 1; // big thread = safer
    if (post.num_comments > 100) spamRisk -= 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("recommend") !== -1) spamRisk -= 2; // asking for tools
    if (post.num_comments < 5) spamRisk += 2; // tiny thread = risky
    spamRisk = Math.max(1, Math.min(spamRisk, 10));

    // Overall score (weighted)
    var overall = Math.round(
      (costPain * 0.3 + relevance * 0.3 + opportunity * 0.25 + (10 - spamRisk) * 0.15) * 10
    ) / 10;

    // Determine pain type
    var painType = "Cloud Cost";
    if (text.indexOf("idle") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1) painType = "Idle Non-Prod Environments";
    else if (text.indexOf("bill spike") !== -1 || text.indexOf("unexpected") !== -1) painType = "AWS Bill Spike";
    else if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1) painType = "K8s Cost Overrun";
    else if (text.indexOf("zombie") !== -1 || text.indexOf("phantom") !== -1 || text.indexOf("unused") !== -1) painType = "Zombie Resources";
    else if (text.indexOf("startup") !== -1 || text.indexOf("burn rate") !== -1) painType = "Startup Burn Rate";
    else if (text.indexOf("finops") !== -1 || text.indexOf("visibility") !== -1) painType = "FinOps / Visibility";
    else if (text.indexOf("waste") !== -1) painType = "Cloud Waste";
    else if (text.indexOf("expensive") !== -1 || text.indexOf("mistake") !== -1) painType = "Expensive Mistakes";

    // Spam risk label
    var spamLabel = "Medium";
    if (spamRisk <= 3) spamLabel = "Low";
    else if (spamRisk >= 7) spamLabel = "High";

    // Relevant product
    var product = "Both";
    if (text.indexOf("idle") !== -1 || text.indexOf("shutdown") !== -1 || text.indexOf("schedule") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1) {
      product = "ZopNight";
    } else if (text.indexOf("visibility") !== -1 || text.indexOf("dashboard") !== -1 || text.indexOf("guardrail") !== -1) {
      product = "ZopDay";
    }

    // Suggested angle
    var angle = "Share your experience with cloud cost management.";
    if (painType === "Idle Non-Prod Environments") {
      angle = "Share how scheduling auto-shutdown for non-prod environments (nights/weekends) saved your team significant costs. Mention dependency-aware orchestration as key.";
    } else if (painType === "AWS Bill Spike") {
      angle = "Empathize with bill shock, share that automation guardrails prevent this. Mention how budget limits + auto-shutdown prevent surprise bills.";
    } else if (painType === "Zombie Resources") {
      angle = "Agree that finding zombies is step 1 — preventing them is step 2. Auto-shutdown non-prod on schedules prevents zombie creation.";
    } else if (painType === "K8s Cost Overrun") {
      angle = "Share that K8s cost is largely about dev/staging clusters running 24/7. Scheduling scale-down during off-hours cuts 40-60%.";
    } else if (painType === "Expensive Mistakes") {
      angle = "Reply to a specific comment about forgotten environments. Share how automated scheduling prevents these stories.";
    } else if (painType === "Cloud Waste") {
      angle = "Discuss the gap between visibility and action — dashboards show waste but don't fix it. Automation + guardrails do.";
    } else if (painType === "FinOps / Visibility") {
      angle = "Share that the real challenge isn't seeing costs, it's acting on them. Guardrails > dashboards.";
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

    return post;

  }).filter(function(post) {
    return post.overall >= 6; // Show 6+ instead of 7+ to ensure we get enough posts
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
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:14px;">Scanned: ' + totalScanned + ' posts | Filtered: ' + totalFiltered + ' | Top Picks: ' + posts.length + '</p>';
  html += '</div>';

  // Posts
  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";

    var scoreColor = post.overall >= 8 ? "#10b981" : post.overall >= 7 ? "#22c55e" : "#eab308";
    var spamColor = post.spamLabel === "Low" ? "#22c55e" : post.spamLabel === "Medium" ? "#eab308" : "#ef4444";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';

    // Top bar
    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' · r/' + post.subreddit + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall + '/10</span> ';
    html += '<span style="color:' + spamColor + ';font-size:11px;font-weight:600;">' + post.spamLabel + ' Risk</span> ';
    html += '<span style="color:#7c3aed;font-size:11px;font-weight:600;">' + post.product + '</span>';
    html += '</div>';

    // Title
    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + post.title + '</a>';

    // Metrics
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">⬆ ' + post.score + ' · 💬 ' + post.num_comments + ' · ' + ageStr + '</p>';

    // Pain type
    html += '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;margin:10px 0;">';
    html += '<span style="font-size:12px;color:#92400e;font-weight:600;">🔥 ' + post.painType + '</span>';
    html += '</div>';

    // Scores
    html += '<p style="color:#64748b;font-size:12px;margin:8px 0;">Pain: ' + post.costPain + '/10 · Relevance: ' + post.relevance + '/10 · Opportunity: ' + post.opportunity + '/10 · Promo Risk: ' + post.spamRisk + '/10</p>';

    // Suggested angle
    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin:10px 0;">';
    html += '<p style="margin:0;font-size:13px;color:#9a3412;"><strong>💡 Suggested Angle:</strong> ' + post.angle + '</p>';
    html += '</div>';

    // Keywords
    html += '<p style="font-size:11px;color:#94a3b8;margin:8px 0;">Keywords: ' + post.matchedKeywords.slice(0, 5).join(", ") + '</p>';

    // CTA button
    html += '<a href="' + post.permalink + '" style="display:inline-block;background:#f97316;color:white;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:8px;">View on Reddit →</a>';

    html += '</div>';
  }

  // Footer
  html += '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">';
  html += 'Reddit Scout by ZopDev<br>Pick 3-4 posts → Write helpful comments → Mention ZopNight naturally';
  html += '</div>';
  html += '</div>';

  GmailApp.sendEmail(YOUR_EMAIL,
    "📡 Reddit Scout: " + posts.length + " ZopNight Opportunities Today",
    "View this email in HTML format.",
    { htmlBody: html }
  );
}


/**
 * Send email when no posts found
 */
function sendEmptyEmail() {
  GmailApp.sendEmail(YOUR_EMAIL,
    "📡 Reddit Scout: No opportunities found today",
    "No qualifying Reddit posts found today. The bot scanned all 12 subreddits but nothing matched the criteria. Will try again tomorrow!"
  );
}


/**
 * ============================================================
 * SETUP INSTRUCTIONS:
 * ============================================================
 *
 * 1. Go to https://script.google.com
 * 2. Click "New Project"
 * 3. Delete the default code and paste this entire file
 * 4. Change YOUR_EMAIL at the top to your email
 * 5. Click the Save icon (or Ctrl+S)
 * 6. Click "Run" button (play icon) next to "dailyScan"
 * 7. Google will ask for permissions - click "Allow"
 *    (it needs permission to fetch URLs and send email)
 * 8. Check your email! You should get the first report.
 *
 * TO SET UP DAILY AUTO-RUN:
 * 1. In the Apps Script editor, click the clock icon (Triggers)
 * 2. Click "Add Trigger" (bottom right)
 * 3. Choose function: dailyScan
 * 4. Event source: Time-driven
 * 5. Type: Day timer
 * 6. Time: 8am to 9am (or whenever you want)
 * 7. Click Save
 *
 * That's it! You'll get an email every morning at 8am
 * with the top 7 Reddit posts to engage with.
 * ============================================================
 */
