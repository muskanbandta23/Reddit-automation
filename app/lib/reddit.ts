import { RedditPost } from "./types";
import { TARGET_SUBREDDITS } from "./constants";

const REDDIT_BASE = "https://www.reddit.com";
const REQUEST_DELAY_MS = 7000; // 7 seconds between requests to stay under 10 req/min

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RedditApiChild {
  data: {
    id: string;
    title: string;
    selftext: string;
    subreddit: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    permalink: string;
    url: string;
    link_flair_text: string | null;
  };
}

async function fetchSubredditPosts(
  subreddit: string,
  sort: "hot" | "new",
  retries = 3
): Promise<RedditPost[]> {
  const url = `${REDDIT_BASE}/r/${subreddit}/${sort}.json?limit=100&raw_json=1`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RedditScout/1.0 (Vercel Serverless; ZopDev)",
        },
      });

      if (response.status === 429) {
        // Rate limited — wait and retry
        console.warn(
          `[Reddit] Rate limited on /r/${subreddit}/${sort}, waiting 15s...`
        );
        await sleep(15000);
        continue;
      }

      if (!response.ok) {
        console.error(
          `[Reddit] Failed /r/${subreddit}/${sort}: ${response.status}`
        );
        return [];
      }

      const data = await response.json();
      const children: RedditApiChild[] = data?.data?.children || [];

      return children.map((child: RedditApiChild) => ({
        id: child.data.id,
        title: child.data.title,
        selftext: child.data.selftext || "",
        subreddit: child.data.subreddit,
        author: child.data.author,
        score: child.data.score,
        num_comments: child.data.num_comments,
        created_utc: child.data.created_utc,
        permalink: child.data.permalink,
        url: child.data.url,
        link_flair_text: child.data.link_flair_text,
      }));
    } catch (error) {
      console.error(
        `[Reddit] Error fetching /r/${subreddit}/${sort} (attempt ${attempt + 1}):`,
        error
      );
      if (attempt < retries - 1) {
        await sleep(5000);
      }
    }
  }

  return [];
}

export async function fetchAllSubreddits(): Promise<RedditPost[]> {
  const allPosts: Map<string, RedditPost> = new Map();

  for (const subreddit of TARGET_SUBREDDITS) {
    // Fetch hot posts
    console.log(`[Reddit] Fetching /r/${subreddit}/hot...`);
    const hotPosts = await fetchSubredditPosts(subreddit, "hot");
    for (const post of hotPosts) {
      if (!allPosts.has(post.id)) {
        allPosts.set(post.id, post);
      }
    }
    await sleep(REQUEST_DELAY_MS);

    // Fetch new posts
    console.log(`[Reddit] Fetching /r/${subreddit}/new...`);
    const newPosts = await fetchSubredditPosts(subreddit, "new");
    for (const post of newPosts) {
      if (!allPosts.has(post.id)) {
        allPosts.set(post.id, post);
      }
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`[Reddit] Total unique posts fetched: ${allPosts.size}`);
  return Array.from(allPosts.values());
}
