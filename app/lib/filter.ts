import { RedditPost, FilteredPost } from "./types";
import {
  TRIGGER_KEYWORDS,
  MIN_UPVOTES,
  MIN_COMMENTS,
  MAX_POST_AGE_DAYS,
} from "./constants";

export function filterPosts(posts: RedditPost[]): FilteredPost[] {
  const now = Date.now() / 1000; // current time in seconds
  const maxAgeSeconds = MAX_POST_AGE_DAYS * 24 * 60 * 60;

  return posts
    .map((post) => {
      const ageSeconds = now - post.created_utc;
      const ageHours = Math.round(ageSeconds / 3600);

      // Age filter: skip posts older than MAX_POST_AGE_DAYS
      if (ageSeconds > maxAgeSeconds) return null;

      // Engagement filter: must have MIN_UPVOTES OR MIN_COMMENTS
      if (post.score < MIN_UPVOTES && post.num_comments < MIN_COMMENTS) {
        return null;
      }

      // Keyword matching (case-insensitive against title + body)
      const searchText = `${post.title} ${post.selftext}`.toLowerCase();
      const matchedKeywords = TRIGGER_KEYWORDS.filter((kw) =>
        searchText.includes(kw.toLowerCase())
      );

      // Must match at least one keyword
      if (matchedKeywords.length === 0) return null;

      return { post, matchedKeywords, ageHours } as FilteredPost;
    })
    .filter((p): p is FilteredPost => p !== null);
}
