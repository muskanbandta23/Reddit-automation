import { NextRequest, NextResponse } from "next/server";
import { fetchAllSubreddits } from "@/app/lib/reddit";
import { filterPosts } from "@/app/lib/filter";
import { scoreAllPosts } from "@/app/lib/scorer";
import { saveScanResult } from "@/app/lib/storage";
import { sendDailyEmail } from "@/app/lib/email";
import { DailyScanResult } from "@/app/lib/types";

export const maxDuration = 300; // 5 minutes (requires Vercel Pro for full duration)

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron or authorized user
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting daily Reddit scan...");
    const startTime = Date.now();

    // Phase 1: Fetch posts from all target subreddits
    const allPosts = await fetchAllSubreddits();
    console.log(`[Cron] Fetched ${allPosts.length} total posts`);

    // Phase 2: Filter by age, engagement, and keywords
    const filteredPosts = filterPosts(allPosts);
    console.log(`[Cron] ${filteredPosts.length} posts passed filters`);

    // Phase 3: AI scoring
    const scoredPosts = await scoreAllPosts(filteredPosts);
    console.log(`[Cron] ${scoredPosts.length} posts scored 7+`);

    // Phase 4: Store results
    const result: DailyScanResult = {
      scanDate: new Date().toISOString().split("T")[0],
      scanTimestamp: Date.now(),
      totalFetched: allPosts.length,
      totalPassedFilter: filteredPosts.length,
      totalScored: scoredPosts.length,
      posts: scoredPosts,
    };

    const blobUrl = await saveScanResult(result);

    // Phase 5: Send email notification (if configured)
    let emailSent = false;
    if (scoredPosts.length > 0) {
      emailSent = await sendDailyEmail(result);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Cron] Pipeline completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      fetched: allPosts.length,
      filtered: filteredPosts.length,
      scored: scoredPosts.length,
      duration: `${duration}s`,
      blobUrl,
      emailSent,
    });
  } catch (error) {
    console.error("[Cron] Pipeline failed:", error);
    return NextResponse.json(
      { error: "Pipeline failed", details: String(error) },
      { status: 500 }
    );
  }
}
