# Reddit Scout

Automatically find the best Reddit engagement opportunities for ZopNight & ZopDay cloud cost optimization products.

## What it does

- Scans 12 target subreddits daily via Reddit's public JSON API
- Filters posts by age (5 days), engagement (15+ upvotes OR 8+ comments), and keyword relevance
- AI-scores each post using GPT-4o-mini on 4 dimensions: cost pain intensity, relevance to automation, comment opportunity strength, and promotional risk
- Displays scored opportunities on a clean dashboard with filters and suggested engagement angles

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **OpenAI API** (gpt-4o-mini) for intelligent scoring
- **Vercel Blob** for storing daily scan results
- **Vercel Cron Jobs** for automated daily scans

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd reddit-scout
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:
- `OPENAI_API_KEY` - Get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- `BLOB_READ_WRITE_TOKEN` - Auto-set when you connect a Blob store in Vercel dashboard
- `CRON_SECRET` - Any random string to protect the scan endpoint (generate with `openssl rand -hex 32`)

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### 4. Trigger a manual scan (local)

```bash
curl -H "Authorization: Bearer dev-secret-change-me" http://localhost:3000/api/cron
```

## Deploy to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial Reddit Scout setup"
git push
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Add environment variables: `OPENAI_API_KEY`, `CRON_SECRET`
4. Deploy

### 3. Create Blob Store

1. In your Vercel project dashboard, go to **Storage**
2. Create a new **Blob** store
3. Connect it to your project (this auto-sets `BLOB_READ_WRITE_TOKEN`)

### 4. Verify Cron Job

The cron job is configured in `vercel.json` to run daily at **8:00 AM UTC**.
You can verify it's set up in **Project Settings > Cron Jobs** in the Vercel dashboard.

## Target Subreddits

r/aws, r/devops, r/cloudcomputing, r/sysadmin, r/kubernetes, r/startups, r/SaaS, r/FinOps, r/cscareerquestions, r/ITManagers, r/Entrepreneur, r/selfhosted

## Scoring Criteria

Each post is scored 1-10 on:
- **Cost Pain Intensity** - How much genuine cloud cost pain is expressed
- **Relevance to Automation** - How well ZopNight/ZopDay could address the issue
- **Comment Opportunity** - Is there room for a helpful, non-promotional comment
- **Promotional Risk** - How likely would a product mention feel like spam

Only posts scoring **7+ overall** are shown on the dashboard.

## Cost

- **Reddit API**: Free (public JSON endpoints, no auth needed)
- **OpenAI**: ~$0.02-0.05/day (gpt-4o-mini scoring ~50-100 posts)
- **Vercel**: Free tier (Hobby plan) or Pro for longer function timeouts
- **Vercel Blob**: Free tier includes 500MB storage
