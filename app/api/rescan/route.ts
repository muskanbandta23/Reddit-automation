import { NextRequest, NextResponse } from "next/server";
import { fetchAllSubreddits } from "@/app/lib/reddit";
import { filterPosts } from "@/app/lib/filter";
import { scoreAllPosts } from "@/app/lib/scorer";
import { saveScanResult } from "@/app/lib/storage";
import { DailyScanResult } from "@/app/lib/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Rescan] Manual rescan triggered...");
    const startTime = Date.now();

    // Run the full pipeline
    const allPosts = await fetchAllSubreddits();
    const filteredPosts = filterPosts(allPosts);
    const scoredPosts = await scoreAllPosts(filteredPosts);

    const result: DailyScanResult = {
      scanDate: new Date().toISOString().split("T")[0],
      scanTimestamp: Date.now(),
      totalFetched: allPosts.length,
      totalPassedFilter: filteredPosts.length,
      totalScored: scoredPosts.length,
      posts: scoredPosts,
    };

    const blobUrl = await saveScanResult(result);
    const duration = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      fetched: allPosts.length,
      filtered: filteredPosts.length,
      scored: scoredPosts.length,
      duration: `${duration}s`,
      blobUrl,
    });
  } catch (error) {
    console.error("[Rescan] Failed:", error);
    return NextResponse.json(
      { error: "Rescan failed", details: String(error) },
      { status: 500 }
    );
  }
}
