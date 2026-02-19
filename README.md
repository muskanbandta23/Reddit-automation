# Reddit Scout Bot - Daily Reddit Engagement for ZopNight & ZopDay

Automated Google Apps Script bot that scans Reddit every day and emails you the best cloud/devops posts where you can naturally comment about [ZopNight](https://zop.dev/zopnight) and [ZopDay](https://zop.dev/zopday).

**Completely free. No API keys needed. Runs automatically every day at 9 AM IST.**

---

## What It Does

Every morning at 9 AM IST, this bot:

1. **Scans 12 cloud/devops subreddits** (r/aws, r/devops, r/kubernetes, r/FinOps, etc.)
2. **Searches 5 targeted queries** (cloud cost, AWS bill, finops, idle resources, cost optimization)
3. **Browses hot, new, and top feeds** in each subreddit
4. **Collects 400+ posts** from the last 4 days
5. **Scores each post** using 3-layer context matching (product fit + cloud relevance + engagement)
6. **Emails you the top 8 posts** with comment angles for ZopNight/ZopDay
7. Each post includes a direct Reddit link and a suggested "How to comment" angle

---

## Products Being Promoted

### ZopNight (https://zop.dev/zopnight)
Auto-shutdown idle non-production cloud resources during nights and weekends.
- Dependency-aware orchestration (shuts down DBs after apps, starts in reverse)
- Agentless setup in 2 minutes
- Multi-cloud: AWS, Azure, GCP
- Saves 40-60% on non-prod cloud costs

### ZopDay (https://zop.dev/zopday)
Cloud cost visibility, optimization, and guardrails.
- Cost allocation and attribution per team/project
- Automated guardrails that enforce budget policies
- Resource tagging compliance
- Anomaly detection and cost alerts

---

## How It Works

### Architecture

```
Google Apps Script (free)
    |
    v
Reddit Public JSON API (no auth needed)
    |
    v
3-Layer Scoring Engine
    |
    v
Gmail (sends email with top 8 posts)
```

### Scoring Engine (3 Layers)

**Layer 1 - Product Context Match (40% weight)**
- 15 ZopNight contexts (non-prod 24/7, scheduling shutdown, idle resources, high cloud bill, K8s cost, etc.)
- 5 ZopDay contexts (cost visibility, dashboards, guardrails, tagging compliance, recommendations)
- Each context has weighted phrases that match against post title + body

**Layer 2 - Broad Cloud Signals (15-35% weight)**
- 22 signal categories (AWS/Azure/GCP, Kubernetes, Terraform, cost keywords, DevOps, etc.)
- Catches general cloud discussions where products can be mentioned naturally

**Layer 3 - Engagement & Opportunity (25-45% weight)**
- Comment count and upvotes
- Question marks, "how/what/which" words
- "recommend", "help", "looking for", "tool" keywords
- Higher engagement = more visibility for your comment

### Smart Domain Fallback
The bot auto-tests 3 Reddit domains on every run:
- `www.reddit.com`
- `old.reddit.com`
- `api.reddit.com`

Uses whichever responds successfully. Reddit sometimes blocks one domain from Google's servers but not others.

### Target Subreddits
| Subreddit | Focus |
|-----------|-------|
| r/aws | AWS cloud discussions |
| r/devops | DevOps practices and tools |
| r/cloudcomputing | General cloud discussions |
| r/sysadmin | System administration |
| r/kubernetes | K8s clusters and operations |
| r/FinOps | Cloud financial operations |
| r/googlecloud | GCP discussions |
| r/azure | Microsoft Azure |
| r/terraform | Infrastructure as Code |
| r/docker | Containers and Docker |
| r/sre | Site Reliability Engineering |
| r/startups | Startup cloud costs |

---

## Setup (5 Minutes)

### Step 1: Create Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click **"New project"**
3. Delete the default code

### Step 2: Paste the Code
1. Open the file: [`google-apps-script/RedditScoutBot.gs`](google-apps-script/RedditScoutBot.gs)
2. Copy all the code
3. Paste it into your Google Apps Script editor
4. Click **Save** (Ctrl+S)

### Step 3: Test It
1. Select **`dailyScan`** from the function dropdown at the top
2. Click **Run**
3. Grant permissions when prompted (Gmail access to send emails)
4. Wait 2-3 minutes for it to complete
5. Check your email - you should receive 8 Reddit posts!

### Step 4: Set Up Daily Auto-Run
1. Select **`setupDailyTrigger`** from the dropdown
2. Click **Run**
3. Done! The bot will now run automatically every day at 9 AM IST

---

## Email Output

You receive a formatted email every morning with:
- **Post title** with direct Reddit link
- **Score** (out of 10) showing relevance
- **Product tag** (ZopNight / ZopDay / Both)
- **Match type** (Direct match or Cloud discussion)
- **Why this post** - engagement stats and context match reasons
- **How to comment** - specific suggested comment angle
- **"Open on Reddit" button** - one-click to go comment

---

## File Structure

```
reddit-scout/
  google-apps-script/
    RedditScoutBot.gs    <-- THE MAIN FILE (paste this in script.google.com)
  README.md              <-- This file
```

> Note: The `app/`, `scripts/`, `node_modules/` folders are from an earlier Next.js approach that was replaced by the simpler Google Apps Script solution.

---

## Cost

| Component | Cost |
|-----------|------|
| Google Apps Script | Free |
| Reddit API | Free (public JSON, no auth) |
| Gmail | Free (sends via your Google account) |
| **Total** | **$0/month** |

---

## Execution Stats

- **API calls per run:** ~96 (12 subs x 8 calls each)
- **Posts scanned:** ~400-500
- **Posts qualifying:** ~200-300
- **Posts emailed:** Top 8
- **Run time:** ~2-3 minutes (well under 6-min GAS limit)
- **Frequency:** Once daily at 9 AM IST

---

## Version History

| Version | Changes |
|---------|---------|
| v1-v3 | Initial keyword-based search, restricted to target subreddits |
| v4 | Added cloud relevance hard filter, expanded queries |
| v5 | Context-aware matching with ZopNight/ZopDay product contexts |
| v6 | 3-layer scoring (product + cloud + engagement), broader matching |
| v7 | Removed emojis (showed as ???? in Gmail), expanded to 25 subreddits |
| v8 | Optimized for 6-min GAS limit (15 subs, 8 queries, time safety) |
| v9 | Switched to old.reddit.com to avoid blocks |
| v10 | Reddit OAuth API approach (required credentials) |
| v11 | **Current** - Auto-tests 3 Reddit domains, full browser headers, no credentials needed |

---

## Troubleshooting

### "Scanned 0 posts"
Reddit is blocking requests from Google's servers. The v11 bot auto-tests 3 different Reddit domains and uses whichever works. Check the Execution Log for details.

### "Exceeded maximum execution time"
The bot has a 5-minute safety limit (GAS allows 6 min). If you see this, reduce `TARGET_SUBREDDITS` to fewer subreddits.

### Emojis showing as ????
All emojis have been removed from the code. If you see ????, you may be running an older version.

### Not getting enough posts
- Lower the `overall < 3.0` threshold in `scoreAllPosts()` to `2.0`
- Increase `MAX_AGE_DAYS` from 4 to 7
- Add more subreddits to `TARGET_SUBREDDITS`

---

## Built With

- **Google Apps Script** - Free serverless JavaScript runtime
- **Reddit Public JSON API** - No authentication required
- **Gmail API** - Send formatted HTML emails

---

*Built by [ZopDev](https://zop.dev) for daily Reddit engagement on cloud cost optimization topics.*
