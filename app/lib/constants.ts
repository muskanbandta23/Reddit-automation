export const TARGET_SUBREDDITS = [
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
];

export const TRIGGER_KEYWORDS = [
  "aws bill spike",
  "unexpected cloud charges",
  "dev environment cost",
  "idle instances",
  "ec2 always running",
  "kubernetes cost too high",
  "startup burn rate",
  "cloud cost optimization",
  "finops automation",
  "infrastructure waste",
  "sandbox environment running overnight",
  "cloud waste",
  "non-prod",
  "staging environment",
  "cost reduction",
  "over-provisioned",
  "zombie resources",
  "phantom usage",
  "cloud spend",
  "cloud bill",
  "cloud cost",
  "aws cost",
  "gcp cost",
  "azure cost",
  "save money cloud",
  "cutting cloud",
  "reduce aws",
  "wasting money",
  "dev test environment",
  "shutdown",
  "schedule instances",
  "reserved instance",
  "spot instance",
  "right-sizing",
  "rightsizing",
  "expensive mistake",
  "cloud optimization",
  "cost management",
  "idle resources",
  "unused resources",
  "cloud savings",
  "devops cost",
  "kubernetes expensive",
  "k8s cost",
  "cloud budget",
  "overprovisioned",
  "underutilized",
  "cost visibility",
  "cloud pricing",
  "multi-cloud cost",
];

export const MIN_UPVOTES = 15;
export const MIN_COMMENTS = 8;
export const MAX_POST_AGE_DAYS = 5;
export const MIN_OVERALL_SCORE = 7;

export const ZOPNIGHT_CONTEXT = `ZopNight: Auto shutdown idle non-prod cloud resources during nights/weekends. Key benefits: 20-60% cloud bill savings, agentless 2-min setup, multi-cloud (AWS/Azure/GCP/OCI), covers VMs/DBs/K8s/Lambda, RBAC, budget guardrails, dependency-aware scheduling (shuts down in right order, brings back up in right order). ISO-27001 & SOC2 certified. Ideal for: teams with dev/test/staging environments running 24/7, companies paying for idle non-production resources, PoCs that became cost centers.`;

export const ZOPDAY_CONTEXT = `ZopDay: Cloud cost visibility and automation-driven optimization platform. Key benefits: guardrails instead of dashboards, automated cost optimization actions, real-time cost visibility across AWS/Azure/GCP, multi-cloud unified view. Ideal for: teams struggling with cloud cost visibility, FinOps teams wanting automation over manual dashboard monitoring, multi-cloud cost comparison.`;

export const SCORING_SYSTEM_PROMPT = `You are a cloud cost optimization expert and community engagement strategist. You evaluate Reddit posts to determine if they represent genuine opportunities to helpfully engage with someone experiencing cloud cost pain points.

Product Context:
${ZOPNIGHT_CONTEXT}

${ZOPDAY_CONTEXT}

You will be given a Reddit post (title + body text + subreddit + engagement metrics). Score the post on these dimensions from 1-10:

1. **Cost Pain Intensity** (1-10): How much genuine cloud cost pain is the author/commenters experiencing? 10 = "my AWS bill tripled overnight" or sharing specific dollar amounts of waste, 1 = vague mention of cloud.
2. **Relevance to Automation** (1-10): How well could ZopNight or ZopDay address their specific problem? 10 = perfect fit (idle dev environments, scheduling shutdowns, non-prod waste), 1 = unrelated cloud topic.
3. **Comment Opportunity Strength** (1-10): Is the post actively seeking solutions? Are people engaging in discussion? Is there room for a helpful comment? 10 = asking for specific recommendations with high engagement, 1 = closed discussion or no room to add value.
4. **Risk of Sounding Promotional** (1-10): How likely is it that mentioning ZopNight/ZopDay would come across as spam? 10 = very high risk (e.g., tiny thread, author not asking for tools, product mention would feel forced), 1 = very safe (large thread actively requesting tool recommendations, many tools already mentioned).

Also provide:
- **painType**: A short label for the pain category (e.g., "AWS bill spike", "idle non-prod environments", "K8s cost overrun", "startup burn rate", "zombie resources", "cloud waste visibility", "multi-cloud cost")
- **whyGoodOpportunity**: 1-2 sentences explaining why this is worth engaging with
- **suggestedCommentAngle**: A brief strategy for how to comment helpfully WITHOUT being overtly promotional (e.g., "Share general scheduling strategy, mention auto-shutdown as a category of tools, reference ZopNight only if asked")
- **relevantProduct**: "ZopNight", "ZopDay", or "Both"

Respond in valid JSON only. No markdown, no code blocks, just raw JSON.`;
