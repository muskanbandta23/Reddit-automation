import { put, list } from "@vercel/blob";
import { DailyScanResult } from "./types";

const BLOB_PREFIX = "reddit-scout/scans/";

function getTodayKey(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${BLOB_PREFIX}${date}.json`;
}

export async function saveScanResult(
  result: DailyScanResult
): Promise<string> {
  const key = getTodayKey();
  const blob = await put(key, JSON.stringify(result), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  console.log(`[Storage] Saved scan result to ${blob.url}`);
  return blob.url;
}

export async function getLatestScanResult(): Promise<DailyScanResult | null> {
  try {
    const { blobs } = await list({
      prefix: BLOB_PREFIX,
      limit: 10,
    });

    if (blobs.length === 0) return null;

    // Sort by name descending (YYYY-MM-DD format sorts correctly)
    const sorted = blobs.sort((a, b) =>
      b.pathname.localeCompare(a.pathname)
    );

    const response = await fetch(sorted[0].url);
    if (!response.ok) return null;

    return (await response.json()) as DailyScanResult;
  } catch (error) {
    console.error("[Storage] Failed to get latest scan result:", error);
    return null;
  }
}

export async function getScanResultByDate(
  date: string
): Promise<DailyScanResult | null> {
  try {
    const { blobs } = await list({
      prefix: `${BLOB_PREFIX}${date}`,
      limit: 1,
    });

    if (blobs.length === 0) return null;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;

    return (await response.json()) as DailyScanResult;
  } catch (error) {
    console.error(`[Storage] Failed to get scan for ${date}:`, error);
    return null;
  }
}
