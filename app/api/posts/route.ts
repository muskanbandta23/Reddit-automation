import { NextRequest, NextResponse } from "next/server";
import { getLatestScanResult, getScanResultByDate } from "@/app/lib/storage";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  try {
    const result = date
      ? await getScanResultByDate(date)
      : await getLatestScanResult();

    if (!result) {
      return NextResponse.json(
        { error: "No scan results found. Run a scan first." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Posts API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch results", details: String(error) },
      { status: 500 }
    );
  }
}
