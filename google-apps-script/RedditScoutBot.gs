/**
 * ============================================================
 * REDDIT SCOUT BOT v3 - Targeted Cloud/DevOps Communities Only
 * ============================================================
 *
 * Searches ONLY within 12 curated cloud/devops/finops subreddits
 * using Reddit's per-subreddit search API (restrict_sr=1).
 * Every result is guaranteed to be from a relevant community.
 *
 * Emails you the top 7 posts daily where you can naturally
 * discuss ZopNight (auto-shutdown idle non-prod resources).
 *
 * SETUP: Paste into script.google.com → Run dailyScan → Allow permissions
 * COST: $0 (completely free)
 * ============================================================
 */

// ===== CHANGE THIS TO YOUR EMAIL =====
var YOUR_EMAIL = "muskan.bandta@zop.dev";

// ===== TARGET SUBREDDITS (cloud/devops/finops ONLY) =====
// These are the ONLY communities we search — no gaming, no fantasy, no noise
var TARGET_SUBREDDITS = [
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
  // Bonus cloud-relevant subs
  "googlecloud",
  "azure",
  "terraform",
  "docker",
  "sre",
  "platform_engineering",
  "netsec"
];

// ===== SEARCH QUERIES (run inside EACH subreddit) =====
// These are cloud-specific queries — they only match relevant content
// because we're already inside a cloud/devops subreddit
var SEARCH_QUERIES = [
  "cloud cost",
  "AWS bill",
  "cloud waste",
  "idle resources",
  "dev environment cost",
  "staging environment",
  "non-production cost",
  "shutdown schedule",
  "kubernetes cost",
  "infrastructure cost",
  "cloud budget",
  "cost optimization",
  "over-provisioned",
  "reserved instance savings",
  "cloud spend"
];

// ===== KEYWORDS that strongly indicate ZopNight relevance =====
var ZOPNIGHT_KEYWORDS = [
  "idle", "non-prod", "non prod", "staging", "dev environment",
  "test environment", "qa environment", "sandbox", "shutdown",
  "schedule", "nights", "weekends", "always running", "24/7",
  "forgot to turn off", "zombie", "phantom", "unused resources",
  "waste", "wasted", "over-provisioned", "right-sizing",
  "burn rate", "bill shock", "bill spike", "cost spike",
  "cost visibility", "guardrail", "automation", "cloud bill",
  "ec2 cost", "rds cost", "eks cost", "gke cost",
  "cloud waste", "cost management", "finops", "reserved instance",
  "spot instance", "savings plan", "budget alert"
];

var MIN_UPVOTES = 3;     // Low bar — subreddit context handles relevance
var MIN_COMMENTS = 2;    // Low bar — we want discussion threads
var MAX_AGE_DAYS = 7;    // Past week


/**
 * MAIN FUNCTION - Run this daily (set up a trigger)
 */
function dailyScan() {
  Logger.log("📡 Reddit Scout Bot v3 Starting...");
  Logger.log("Searching " + TARGET_SUBREDDITS.length + " targeted cloud/devops subreddits...");

  // Step 1: Search within each target subreddit + fetch hot/top
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
 * Strategy: For each subreddit, run search queries + fetch hot/top
 */
function fetchTargetedPosts() {
  var seen = {};       // deduplicate by post ID
  var results = [];
  var now = Math.floor(Date.now() / 1000);
  var maxAge = MAX_AGE_DAYS * 86400;

  for (var s = 0; s < TARGET_SUBREDDITS.length; s++) {
    var sub = TARGET_SUBREDDITS[s];
    Logger.log("  Scanning r/" + sub + "...");
    var subPostCount = 0;

    // --- Search within this subreddit using multiple queries ---
    for (var q = 0; q < SEARCH_QUERIES.length; q++) {
      var query = SEARCH_QUERIES[q];
      var searchPosts = searchInSubreddit(sub, query);

      for (var j = 0; j < searchPosts.length; j++) {
        var post = searchPosts[j];
        if (seen[post.id]) continue;

        var age = now - post.created_utc;
        if (age > maxAge) continue;
        if (post.score < MIN_UPVOTES && post.num_comments < MIN_COMMENTS) continue;

        seen[post.id] = true;
        post.ageHours = Math.round(age / 3600);
        results.push(post);
        subPostCount++;
      }

      // Rate limit between search queries (Reddit allows ~10 req/min for unauth)
      Utilities.sleep(2000);
    }

    // --- Also fetch hot and top posts from this subreddit ---
    var hotPosts = fetchSubreddit(sub, "hot");
    var topPosts = fetchSubreddit(sub, "top");
    var browsePosts = hotPosts.concat(topPosts);

    for (var p = 0; p < browsePosts.length; p++) {
      var post2 = browsePosts[p];
      if (seen[post2.id]) continue;

      var age2 = now - post2.created_utc;
      if (age2 > maxAge) continue;
      if (post2.score < MIN_UPVOTES && post2.num_comments < MIN_COMMENTS) continue;

      // For hot/top posts (not from search), require at least one keyword match
      var text = (post2.title + " " + post2.selftext).toLowerCase();
      var hasKeyword = ZOPNIGHT_KEYWORDS.some(function(kw) {
        return text.indexOf(kw) !== -1;
      });
      if (!hasKeyword) continue;

      seen[post2.id] = true;
      post2.ageHours = Math.round(age2 / 3600);
      results.push(post2);
      subPostCount++;
    }

    Logger.log("    Found " + subPostCount + " posts from r/" + sub);

    // Rate limit between subreddits
    Utilities.sleep(1500);
  }

  Logger.log("  Total unique qualifying posts: " + results.length);
  return results;
}


/**
 * Search WITHIN a specific subreddit (restrict_sr=1)
 * This ensures results ONLY come from this subreddit
 */
function searchInSubreddit(subreddit, query) {
  var url = "https://www.reddit.com/r/" + subreddit + "/search.json"
    + "?q=" + encodeURIComponent(query)
    + "&restrict_sr=1"    // ← KEY: only this subreddit
    + "&sort=relevance"
    + "&t=week"
    + "&limit=25"
    + "&raw_json=1"
    + "&type=link";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/3.0 (Google Apps Script)" },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 429) {
      Logger.log("    Rate limited, waiting 12s...");
      Utilities.sleep(12000);
      response = UrlFetchApp.fetch(url, {
        headers: { "User-Agent": "RedditScoutBot/3.0 (Google Apps Script)" },
        muteHttpExceptions: true
      });
    }

    if (response.getResponseCode() !== 200) {
      Logger.log("    Search in r/" + subreddit + " failed: " + response.getResponseCode());
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
    Logger.log("    Search error in r/" + subreddit + ": " + e.message);
    return [];
  }
}


/**
 * Fetch hot or top posts from a subreddit
 */
function fetchSubreddit(subreddit, sort) {
  var url = "https://www.reddit.com/r/" + subreddit + "/" + sort + ".json?limit=50&raw_json=1";
  if (sort === "top") url += "&t=week";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "User-Agent": "RedditScoutBot/3.0 (Google Apps Script)" },
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
 * Higher score = better opportunity for natural engagement
 */
function scorePosts(posts) {
  return posts.map(function(post) {
    var text = (post.title + " " + post.selftext).toLowerCase();

    // --- Count keyword matches ---
    var matchedKeywords = ZOPNIGHT_KEYWORDS.filter(function(kw) {
      return text.indexOf(kw) !== -1;
    });

    // === COST PAIN INTENSITY (how much pain about cloud costs) ===
    var costPain = 3;
    if (post.score > 15) costPain += 1;
    if (post.score > 50) costPain += 1;
    if (post.score > 100) costPain += 1;
    if (post.num_comments > 10) costPain += 1;
    if (post.num_comments > 30) costPain += 1;
    if (text.match(/\$[\d,]+/)) costPain += 1;  // mentions dollar amounts
    if (text.indexOf("bill") !== -1 || text.indexOf("charge") !== -1 || text.indexOf("expensive") !== -1) costPain += 1;
    if (text.indexOf("waste") !== -1 || text.indexOf("wasted") !== -1 || text.indexOf("overspend") !== -1) costPain += 1;
    costPain = Math.min(costPain, 10);

    // === RELEVANCE TO ZOPNIGHT/ZOPDAY ===
    var relevance = 2;
    // Each keyword match adds to relevance
    relevance += Math.min(matchedKeywords.length * 1.2, 5);
    // Big boost for CORE ZopNight concepts (idle non-prod + scheduling)
    if (text.indexOf("idle") !== -1 && (text.indexOf("resource") !== -1 || text.indexOf("instance") !== -1 || text.indexOf("environment") !== -1 || text.indexOf("server") !== -1 || text.indexOf("cluster") !== -1)) relevance += 1.5;
    if (text.indexOf("non-prod") !== -1 || text.indexOf("non prod") !== -1 || text.indexOf("nonprod") !== -1) relevance += 1.5;
    if (text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1 || text.indexOf("test environment") !== -1) relevance += 1;
    if (text.indexOf("shutdown") !== -1 && (text.indexOf("schedule") !== -1 || text.indexOf("automat") !== -1 || text.indexOf("night") !== -1 || text.indexOf("weekend") !== -1)) relevance += 1.5;
    if (text.indexOf("24/7") !== -1 || text.indexOf("always running") !== -1) relevance += 1;
    if (text.indexOf("finops") !== -1) relevance += 1;
    relevance = Math.min(relevance, 10);

    // === COMMENT OPPORTUNITY STRENGTH ===
    var opportunity = 4;
    if (text.indexOf("?") !== -1) opportunity += 1;
    if (text.indexOf("how") !== -1 || text.indexOf("what") !== -1 || text.indexOf("recommend") !== -1 || text.indexOf("advice") !== -1) opportunity += 1;
    if (text.indexOf("help") !== -1 || text.indexOf("looking for") !== -1 || text.indexOf("suggestion") !== -1 || text.indexOf("anyone") !== -1) opportunity += 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("platform") !== -1 || text.indexOf("solution") !== -1 || text.indexOf("software") !== -1) opportunity += 1;
    if (post.num_comments >= 3 && post.num_comments <= 50) opportunity += 1;
    if (post.num_comments > 50) opportunity += 2;
    opportunity = Math.min(opportunity, 10);

    // === SPAM RISK (lower = safer to comment) ===
    var spamRisk = 5;
    if (post.num_comments > 15) spamRisk -= 1;
    if (post.num_comments > 40) spamRisk -= 1;
    if (text.indexOf("tool") !== -1 || text.indexOf("recommend") !== -1 || text.indexOf("which") !== -1 || text.indexOf("best") !== -1) spamRisk -= 2;
    if (text.indexOf("?") !== -1) spamRisk -= 1;  // Questions are safer to reply to
    if (post.num_comments < 3) spamRisk += 2;
    spamRisk = Math.max(1, Math.min(spamRisk, 10));

    // === OVERALL SCORE (weighted) ===
    var overall = Math.round(
      (costPain * 0.20 + relevance * 0.40 + opportunity * 0.25 + (10 - spamRisk) * 0.15) * 10
    ) / 10;

    // === PAIN TYPE CLASSIFICATION ===
    var painType = "Cloud Cost";
    if (text.indexOf("idle") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1 || text.indexOf("test environment") !== -1 || text.indexOf("qa environment") !== -1) {
      painType = "Idle Non-Prod Environments";
    } else if (text.indexOf("bill spike") !== -1 || text.indexOf("unexpected") !== -1 || text.indexOf("bill shock") !== -1 || text.indexOf("surprise bill") !== -1) {
      painType = "AWS Bill Spike";
    } else if (text.indexOf("kubernetes") !== -1 || text.indexOf("k8s") !== -1 || text.indexOf("eks") !== -1 || text.indexOf("gke") !== -1 || text.indexOf("aks") !== -1) {
      painType = "K8s Cost Overrun";
    } else if (text.indexOf("zombie") !== -1 || text.indexOf("phantom") !== -1 || text.indexOf("unused") !== -1 || text.indexOf("orphan") !== -1) {
      painType = "Zombie Resources";
    } else if (text.indexOf("startup") !== -1 || text.indexOf("burn rate") !== -1 || text.indexOf("runway") !== -1) {
      painType = "Startup Burn Rate";
    } else if (text.indexOf("finops") !== -1 || text.indexOf("visibility") !== -1 || text.indexOf("monitoring") !== -1) {
      painType = "FinOps / Visibility";
    } else if (text.indexOf("waste") !== -1 || text.indexOf("wasted") !== -1) {
      painType = "Cloud Waste";
    } else if (text.indexOf("expensive") !== -1 || text.indexOf("mistake") !== -1) {
      painType = "Expensive Mistakes";
    } else if (text.indexOf("reserved") !== -1 || text.indexOf("spot") !== -1 || text.indexOf("savings plan") !== -1) {
      painType = "Cost Optimization";
    } else if (text.indexOf("budget") !== -1 || text.indexOf("alert") !== -1) {
      painType = "Budget / Alerting";
    } else if (text.indexOf("right-siz") !== -1 || text.indexOf("rightsiz") !== -1 || text.indexOf("over-provision") !== -1) {
      painType = "Right-Sizing";
    }

    // === SPAM RISK LABEL ===
    var spamLabel = "Medium";
    if (spamRisk <= 3) spamLabel = "Low";
    else if (spamRisk >= 7) spamLabel = "High";

    // === RELEVANT PRODUCT ===
    var product = "Both";
    if (text.indexOf("idle") !== -1 || text.indexOf("shutdown") !== -1 || text.indexOf("schedule") !== -1 || text.indexOf("non-prod") !== -1 || text.indexOf("staging") !== -1 || text.indexOf("dev environment") !== -1 || text.indexOf("nights") !== -1 || text.indexOf("weekends") !== -1 || text.indexOf("24/7") !== -1 || text.indexOf("always running") !== -1) {
      product = "ZopNight";
    } else if (text.indexOf("visibility") !== -1 || text.indexOf("dashboard") !== -1 || text.indexOf("guardrail") !== -1 || text.indexOf("monitoring") !== -1 || text.indexOf("alerting") !== -1) {
      product = "ZopDay";
    }

    // === SUGGESTED COMMENT ANGLE ===
    var angle = getSuggestedAngle(painType);

    // === WHY THIS IS A GOOD OPPORTUNITY ===
    var why = getWhyGood(post, matchedKeywords, painType);

    post.costPain = costPain;
    post.relevance = relevance;
    post.opportunity = opportunity;
    post.spamRisk = spamRisk;
    post.overall = overall;
    post.painType = painType;
    post.spamLabel = spamLabel;
    post.product = product;
    post.angle = angle;
    post.why = why;
    post.matchedKeywords = matchedKeywords;

    return post;

  }).filter(function(post) {
    return post.overall >= 5.0;
  }).sort(function(a, b) {
    return b.overall - a.overall;
  });
}


/**
 * Get a suggested comment angle based on pain type
 */
function getSuggestedAngle(painType) {
  var angles = {
    "Idle Non-Prod Environments": "Share how scheduling auto-shutdown for dev/staging/QA during nights + weekends saved 40-60% on non-prod. Mention dependency-aware orchestration as a key differentiator.",
    "AWS Bill Spike": "Empathize with bill shock. Budget alerts alone don't fix it — you need automation that actually shuts idle things down. Share a real-world savings example.",
    "Zombie Resources": "Finding zombies is step 1, preventing them is step 2. Scheduled shutdown of non-prod prevents zombie accumulation at the source.",
    "K8s Cost Overrun": "Dev/staging K8s clusters running 24/7 is the hidden cost. Scheduling cluster scale-down during off-hours cuts 40-60% with zero impact on developers.",
    "Expensive Mistakes": "Mention how automation prevents these stories — humans forget, schedules don't. One-time 2-min setup prevents recurring cost surprises.",
    "Cloud Waste": "The gap between visibility and action is the real problem. Dashboards show waste but don't fix it — automation + guardrails do.",
    "FinOps / Visibility": "Visibility is table stakes now. The next step is guardrails that auto-enforce policies — not dashboards you check once a month.",
    "Startup Burn Rate": "Quick win for startups: schedule non-prod environments to auto-shutdown outside work hours. Saves 40-60% with zero code changes, 2-min setup.",
    "Cost Optimization": "Beyond reserved/spot instances, scheduling non-prod shutdowns is the easiest quick win most teams overlook.",
    "Budget / Alerting": "Budget alerts tell you there's a fire — automation puts it out. Auto-shutdown + guardrails prevent cost overruns, not just notify about them.",
    "Right-Sizing": "Right-sizing is great for prod, but for non-prod the bigger win is just shutting them down when nobody's using them (nights/weekends).",
    "Cloud Cost": "Share practical experience with cloud cost management. Focus on actionable tips — scheduling, automation, and guardrails over manual dashboards."
  };

  return angles[painType] || angles["Cloud Cost"];
}


/**
 * Generate a short explanation of why this is a good opportunity
 */
function getWhyGood(post, matchedKeywords, painType) {
  var reasons = [];

  if (post.num_comments >= 10) {
    reasons.push("Active discussion (" + post.num_comments + " comments)");
  }
  if (matchedKeywords.length >= 3) {
    reasons.push("Matches " + matchedKeywords.length + " ZopNight keywords");
  }
  if (post.title.indexOf("?") !== -1 || post.selftext.indexOf("?") !== -1) {
    reasons.push("Asking for help/advice");
  }
  if (post.score >= 20) {
    reasons.push("High engagement (" + post.score + " upvotes)");
  }

  reasons.push(painType + " topic in r/" + post.subreddit);

  return reasons.join(" · ");
}


/**
 * Send HTML email with the daily report
 */
function sendEmail(posts, totalScanned, totalFiltered) {
  var today = Utilities.formatDate(new Date(), "Asia/Kolkata", "EEEE, MMMM d, yyyy");

  var html = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:700px;margin:0 auto;background:#f8fafc;padding:20px;">';

  // Header
  html += '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:12px;margin-bottom:20px;">';
  html += '<h1 style="color:#f97316;margin:0;font-size:24px;">🎯 Reddit Scout Daily Report</h1>';
  html += '<p style="color:#94a3b8;margin:8px 0 0 0;font-size:14px;">' + today + '</p>';
  html += '<p style="color:#cbd5e1;margin:8px 0 0 0;font-size:14px;">Scanned ' + TARGET_SUBREDDITS.length + ' cloud/devops subreddits | ' + totalScanned + ' posts checked | ' + totalFiltered + ' qualified | Top ' + posts.length + ' picks</p>';
  html += '</div>';

  // Subreddits scanned badge row
  html += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:12px;">';
  html += '<p style="margin:0;font-size:11px;color:#0369a1;"><strong>Communities scanned:</strong> ';
  html += TARGET_SUBREDDITS.map(function(s) { return 'r/' + s; }).join(' · ');
  html += '</p></div>';

  // Instruction box
  html += '<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<p style="margin:0;font-size:13px;color:#065f46;">📋 <strong>Your workflow:</strong> Pick 3-4 best posts → Open on Reddit → Write a helpful comment → Mention ZopNight naturally where it fits</p>';
  html += '</div>';

  // Posts
  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var ageStr = post.ageHours < 24 ? post.ageHours + "h ago" : Math.floor(post.ageHours / 24) + "d ago";

    var scoreColor = post.overall >= 8 ? "#10b981" : post.overall >= 7 ? "#22c55e" : post.overall >= 6 ? "#eab308" : "#f97316";
    var spamColor = post.spamLabel === "Low" ? "#22c55e" : post.spamLabel === "Medium" ? "#eab308" : "#ef4444";

    html += '<div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e2e8f0;">';

    // Top bar with subreddit, score, risk, product
    html += '<div style="margin-bottom:12px;">';
    html += '<span style="background:#1e293b;color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">#' + (i+1) + ' · r/' + escapeHtml(post.subreddit) + '</span> ';
    html += '<span style="background:' + scoreColor + ';color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">' + post.overall.toFixed(1) + '/10</span> ';
    html += '<span style="color:' + spamColor + ';font-size:11px;font-weight:600;">' + post.spamLabel + ' Risk</span> ';
    html += '<span style="color:#7c3aed;font-size:11px;font-weight:600;">' + post.product + '</span>';
    html += '</div>';

    // Title
    html += '<a href="' + post.permalink + '" style="color:#0f172a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.4;">' + escapeHtml(post.title) + '</a>';

    // Metrics
    html += '<p style="color:#64748b;font-size:13px;margin:8px 0;">⬆ ' + post.score + ' · 💬 ' + post.num_comments + ' · ' + ageStr + ' · by u/' + escapeHtml(post.author) + '</p>';

    // Pain type badge
    html += '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;margin:10px 0;">';
    html += '<span style="font-size:12px;color:#92400e;font-weight:600;">🔥 ' + post.painType + '</span>';
    html += '</div>';

    // Why this is a good opportunity
    if (post.why) {
      html += '<p style="color:#334155;font-size:13px;margin:8px 0;line-height:1.5;"><strong>Why:</strong> ' + escapeHtml(post.why) + '</p>';
    }

    // Post preview (first 250 chars of body)
    if (post.selftext && post.selftext.length > 0) {
      var preview = post.selftext.substring(0, 250).replace(/\n/g, " ");
      if (post.selftext.length > 250) preview += "...";
      html += '<p style="color:#475569;font-size:13px;margin:8px 0;line-height:1.5;background:#f8fafc;padding:10px;border-radius:6px;border-left:3px solid #e2e8f0;">' + escapeHtml(preview) + '</p>';
    }

    // Matched keywords
    if (post.matchedKeywords && post.matchedKeywords.length > 0) {
      html += '<p style="font-size:11px;color:#6366f1;margin:6px 0;">Keywords: ' + post.matchedKeywords.slice(0, 6).join(', ') + '</p>';
    }

    // Sub-scores
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
  html += 'Reddit Scout v3 by ZopDev<br>Targeted search across ' + TARGET_SUBREDDITS.length + ' cloud/devops communities · Runs daily';
  html += '</div>';
  html += '</div>';

  GmailApp.sendEmail(YOUR_EMAIL,
    "🎯 Reddit Scout: " + posts.length + " ZopNight Opportunities (" + Utilities.formatDate(new Date(), "Asia/Kolkata", "MMM d") + ")",
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
    "Scanned " + TARGET_SUBREDDITS.length + " cloud/devops subreddits (" + totalScanned + " posts checked) but no qualifying posts matched ZopNight criteria today. The bot will try again tomorrow."
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
