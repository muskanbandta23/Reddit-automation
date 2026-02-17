import { NextRequest, NextResponse } from "next/server";
import { getLatestScanResult } from "@/app/lib/storage";
import { ScoredPost } from "@/app/lib/types";

/**
 * GET /api/report
 * Returns the latest scan results as plain text (no browser needed)
 * Perfect for viewing in terminal: curl https://your-app.vercel.app/api/report
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getLatestScanResult();

    if (!result) {
      return new NextResponse(
        "No scan results found. Run a scan first via /api/cron",
        { status: 404, headers: { "Content-Type": "text/plain" } }
      );
    }

    const date = new Date(result.scanTimestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let output = `\n${"=".repeat(80)}\n`;
    output += `  REDDIT SCOUT - ZopNight/ZopDay Engagement Opportunities\n`;
    output += `  ${date}\n`;
    output += `  Posts Scanned: ${result.totalFetched} | Filtered: ${result.totalPassedFilter} | Opportunities: ${result.totalScored}\n`;
    output += `${"=".repeat(80)}\n\n`;

    result.posts.forEach((post: ScoredPost, i: number) => {
      const ageStr =
        post.ageHours < 24
          ? `${post.ageHours}h`
          : `${Math.floor(post.ageHours / 24)}d`;

      output += `${"─".repeat(80)}\n`;
      output += `  #${i + 1} | Score: ${post.overallScore}/10 | Spam Risk: ${post.spamRiskLevel} | ${post.relevantProduct}\n`;
      output += `${"─".repeat(80)}\n`;
      output += `  Post Title:   ${post.title}\n`;
      output += `  Subreddit:    r/${post.subreddit}\n`;
      output += `  Upvotes:      ${post.upvotes} | Comments: ${post.commentsCount} | Age: ${ageStr}\n`;
      output += `  Link:         ${post.permalink}\n`;
      output += `  Pain Type:    ${post.painType}\n`;
      output += `  Keywords:     ${post.matchedKeywords.slice(0, 5).join(", ")}\n`;
      output += `\n`;
      output += `  Scores:\n`;
      output += `    Cost Pain: ${post.scores.costPainIntensity}/10 | Relevance: ${post.scores.relevanceToAutomation}/10\n`;
      output += `    Opportunity: ${post.scores.commentOpportunityStrength}/10 | Promo Risk: ${post.scores.riskOfSoundingPromotional}/10\n`;
      output += `\n`;
      output += `  Why Good Opportunity:\n`;
      output += `    ${post.whyGoodOpportunity}\n`;
      output += `\n`;
      output += `  Suggested Angle:\n`;
      output += `    ${post.suggestedCommentAngle}\n`;
      output += `\n`;
    });

    output += `${"=".repeat(80)}\n`;
    output += `  END OF REPORT\n`;
    output += `${"=".repeat(80)}\n`;

    return new NextResponse(output, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return new NextResponse(`Error: ${error}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
